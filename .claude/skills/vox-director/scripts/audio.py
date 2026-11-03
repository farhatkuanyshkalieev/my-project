#!/usr/bin/env python3
"""
Audio stage: per-beat narration (one consistent voice) + one instrumental BGM.

Narration uses xai/tts-v1 (a real multilingual TTS: named `voice_id` + language),
so every beat is spoken in the same voice — this sidesteps Omni's clip-to-clip
voice drift.

VOICE CLONING: set `voice.clone_ref` to a local audio sample and narration
switches to bytedance/seed-audio-1.0 with the sample as @audio1. Seed-Audio is a
general *sound* model — bare narration gives it wildly inconsistent lengths —
but with a pinned speaker AND the studio-clean directive baked into
CLONE_TEMPLATE below, timing is stable (validated 2026-07-17: 62 words in
19.3s, verbatim, one natural 0.5s pause). Per-beat generation keeps beat
alignment robust either way.

Usage: python3 audio.py <project_dir>   (default: out/tang-30s)
"""
import base64
import json
import os
import subprocess
import sys

from atlas_cloud import AtlasAuthError
from project_io import atomic_write_json, check_media, sig
from provider import get_provider, PaidItem, run_paid_items, print_summary

# xai/tts-v1 is a clean, predictable multilingual TTS (named voices + language
# select) — the default. Seed-Audio handles voice cloning (see CLONE_TEMPLATE)
# and SFX; never hand it bare narration without a pinned speaker.
VOICE_MODEL = "xai/tts-v1"
CLONE_MODEL = "bytedance/seed-audio-1.0"
MUSIC_MODEL = "minimax/music-2.6"

# `language` values xai/tts-v1 documents (Atlas Cloud model page, checked 2026-11-03):
# "auto" + these 20 codes. Kazakh ("kk") is NOT listed. Anything else is unconfirmed.
XAI_TTS_LANGUAGES = {"auto", "en", "zh", "ar-eg", "ar-sa", "ar-ae", "bn", "fr", "de", "hi", "id",
                     "it", "ja", "ko", "pt-br", "pt-pt", "ru", "es-mx", "es-es", "tr", "vi"}

# Used only when beats.json has no "music": deliberately culture-neutral (the old
# default was Chinese guzheng/erhu, wrong for most films). Set "music" per film.
NEUTRAL_MUSIC = ("neutral modern documentary underscore, soft piano and warm synth pads over "
                 "light steady percussion, instrumental, no vocals, unobtrusive under narration")

# Every clause is load-bearing: the speaker pin + "clean dry studio vocal only"
# block is what makes seed-audio's timing beat-alignable (without it the model
# invents pauses and SFX). `persona` tunes delivery (documentary narrator,
# luxury voice-over, ...); default suits explainers.
CLONE_TEMPLATE = (
    "**Speaker A** @audio1 keeps their own vocal timbre and speaks fluent natural "
    "{language} with a neutral accent, upbeat pace, crisp articulation, friendly and "
    "energetic like a {persona}. Clean dry studio vocal only — no background music, "
    "no sound effects, no room noise or reverb. They say: \"{script}\""
)
# languages the original skill shipped clone prompts for (en is the validated one)
LANG_NAMES = {"en": "English", "zh": "Mandarin Chinese", "ja": "Japanese",
              "ko": "Korean", "es": "Spanish", "fr": "French", "de": "German"}
EXTRA_LANG_NAMES = {"ru": "Russian", "kk": "Kazakh"}      # named, but NOT validated for cloning


def probe_dur(path: str) -> float:
    out = subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration",
                          "-of", "csv=p=0", path], capture_output=True, text=True).stdout
    try:
        return float(out.strip())
    except ValueError:
        return 0.0


def language_gate(voice, language, clone_ref):
    """None if the narration language is confirmed for the model in use, else a
    warning text. Unconfirmed languages need an explicit, deliberate opt-in
    ("voice": {"language_unverified_ok": true}) — ideally after a 1-beat test."""
    lang = str(language).strip().lower()
    if clone_ref:
        if lang in LANG_NAMES:
            return None
        model, known = CLONE_MODEL, sorted(LANG_NAMES)
    else:
        if lang in XAI_TTS_LANGUAGES:
            return None
        model, known = VOICE_MODEL, sorted(XAI_TTS_LANGUAGES)
    if voice.get("language_unverified_ok") is True:
        print(f"WARNING: narration language \"{language}\" is NOT confirmed for {model}; "
              f"proceeding because voice.language_unverified_ok is true.")
        return None
    return (f"LANGUAGE NOT CONFIRMED: narration language \"{language}\" is not in the documented "
            f"list for {model} ({', '.join(known)}). It may be rejected, ignored, or read with "
            f"the wrong pronunciation. Nothing was generated. Options: (1) use a documented "
            f"language (e.g. \"ru\"); (2) test ONE beat first (about $0.015) and listen; only "
            f"then set \"voice\": {{\"language_unverified_ok\": true}} in beats.json.")


def run(project_dir: str):
    """Narration per beat + one BGM. Safe to re-run: a narration whose file passes
    the integrity check and whose text/voice settings are unchanged is reused, the
    existing bgm.mp3 is reused, recorded jobs are resumed instead of resubmitted,
    and beats.json is saved atomically after every single file."""
    bpath = os.path.join(project_dir, "beats.json")
    with open(bpath) as f:
        doc = json.load(f)
    save = lambda: atomic_write_json(bpath, doc)
    adir = os.path.join(project_dir, "audio")
    os.makedirs(adir, exist_ok=True)

    prov = get_provider(doc.get("provider"))
    voice = doc.get("voice", {})
    voice_id = voice.get("voice_id", "leo")     # named male documentary-ish voice
    language = voice.get("language", doc.get("language", "en"))
    speed = float(voice.get("speed", 1.0))
    clone_ref = voice.get("clone_ref")          # local audio sample -> clone this voice
    persona = voice.get("persona", "YouTube tutorial creator")

    warn = language_gate(voice, language, clone_ref)
    if warn:
        print(warn)
        return None

    items, skipped = [], []
    if clone_ref:
        with open(clone_ref, "rb") as f:
            ref_bytes = f.read()
        ref_b64 = base64.b64encode(ref_bytes).decode()
        ref_sig = sig(len(ref_bytes), ref_bytes[:4096].hex())
        lang_name = LANG_NAMES.get(language) or EXTRA_LANG_NAMES.get(language, language)

    for beat in doc["beats"]:
        key, text = f"narr_{beat['id']}", beat.get("narration", "")
        if not text.strip():
            print(f"[{key}] no narration text in beats.json -> skipped")
            continue
        if clone_ref:
            signature = sig(CLONE_MODEL, text, ref_sig, persona, language)
            submit = (lambda t=text: prov.submit_audio(
                CLONE_MODEL,
                text=CLONE_TEMPLATE.format(language=lang_name, persona=persona, script=t),
                format="mp3", sample_rate=44100, references=[{"audio_data": ref_b64}]))
        else:
            signature = sig(VOICE_MODEL, text, language, voice_id, speed)
            submit = (lambda t=text: prov.submit_audio(
                VOICE_MODEL, text=t, language=language, voice_id=voice_id,
                codec="mp3", sample_rate=44100, speed=speed))
        job = beat.get("narration_job")
        ok, why = check_media(beat.get("narration_audio"), "audio")
        if ok and (not job or job.get("sig") == signature):
            skipped.append(key)
            print(f"[{key}] reuse existing narration {beat['narration_audio']}")
            continue
        if beat.get("narration_audio") and not ok:
            print(f"[{key}] existing narration unusable ({why}) -> needs new audio")
        elif ok:
            print(f"[{key}] narration text/voice changed -> new audio")

        def apply(url, dest, b=beat):
            b["narration_audio"] = dest
            b["narration_dur"] = round(probe_dur(dest), 2)
        items.append(PaidItem(key, beat, "narration_job", signature, submit,
                              os.path.join(adir, f"{key}.mp3"), apply))

    # BGM: generated once, then reused (it's slow + costs more). Delete audio/bgm.mp3
    # (and "bgm_job") to make a new one, e.g. after changing "music".
    bgm_path = os.path.join(adir, "bgm.mp3")
    have = doc.get("bgm_path") if check_media(doc.get("bgm_path"), "audio")[0] else (
        bgm_path if check_media(bgm_path, "audio")[0] else None)
    if have:
        doc["bgm_path"] = have
        doc.setdefault("bgm_dur", round(probe_dur(have), 2))
        skipped.append("bgm")
        print(f"[bgm] reuse existing {have}")
    else:
        music_prompt = doc.get("music")
        if not music_prompt:
            music_prompt = NEUTRAL_MUSIC
            print("NOTE: no \"music\" in beats.json -> using a neutral documentary underscore. "
                  "Set \"music\" to fit the film's culture and mood.")

        def apply_bgm(url, dest):
            doc["bgm_path"] = dest
            doc["bgm_dur"] = round(probe_dur(dest), 2)
        items.append(PaidItem("bgm", doc, "bgm_job", sig(MUSIC_MODEL, music_prompt),
                              (lambda mp=music_prompt: prov.submit_audio(
                                  MUSIC_MODEL, prompt=mp, is_instrumental=True, format="mp3")),
                              bgm_path, apply_bgm))

    save()
    try:
        summary = run_paid_items(prov, items, save, poll_s=4, stall_s=150, deadline_s=600)
    except AtlasAuthError as e:
        save()
        print(f"STOPPED: {e}\nProgress so far is saved in {bpath}.")
        raise
    save()
    print_summary("audio", summary, skipped)
    print("updated", bpath)
    return summary


if __name__ == "__main__":
    proj = sys.argv[1] if len(sys.argv) > 1 else os.path.join(
        os.path.dirname(__file__), "..", "out", "tang-30s")
    try:
        res = run(os.path.abspath(proj))
    except AtlasAuthError:
        sys.exit(1)                       # message printed, progress saved
    if res and (res["failed"] or res["pending"] or res["blocked"]):
        sys.exit(3)                       # partial: re-run to continue
