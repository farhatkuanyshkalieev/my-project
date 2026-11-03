#!/usr/bin/env python3
"""
Clip stage: animate each SHOT's keyframe into a short clip (Gemini Omni Flash
image-to-video), using the shot's own duration and a punchy collage
motion-graphic prompt (5-axis + the shot's specific move). More, shorter shots
= more cuts = less "one static frame for 10s".

Usage: python3 clips.py <project_dir>   (default: out/tang-30s)
"""
import json
import os
import sys

from atlas_cloud import STOP_ERRORS
from keyframes import keyframe_state
from project_io import atomic_write_json, check_media, sig
from provider import get_provider, PaidItem, run_paid_items, print_summary
from styles import resolve_theme, resolve_video_aspect

VIDEO_MODEL = "google/gemini-omni-flash/image-to-video"


def shots_of(beat):
    if beat.get("shots"):
        for s in beat["shots"]:
            yield s, f"{beat['id']}{s.get('id','')}"
    else:
        yield beat, f"{beat['id']}"


# Camera-move vocab. The first group is flat-collage-SAFE (default). The "bold" group can warp
# the flat art / smear text (verified) — they're AVAILABLE, not banned: use with constraints
# "loose" and expect to re-roll. Any string not in the dict passes through verbatim too.
CAMERA_VOCAB = {
    "static":   "a locked-off static camera (no camera move)",
    "push_in":  "one very slow smooth push-in (uniform scale-up, Ken-Burns)",
    "pull_out": "one slow smooth pull-out (uniform scale-down) revealing the full scene",
    "pan":      "one slow horizontal pan across the frame (flat translate, no perspective shift)",
    "tilt":     "one slow vertical tilt (flat translate, no perspective shift)",
    "parallax": "a gentle multi-layer parallax drift (paper layers moving at slightly different "
                "speeds), the camera otherwise steady",
    # bold / experimental (pair with constraints="loose", re-roll):
    "orbit":     "a slow 3D orbit / camera arc around the scene",
    "dolly_zoom": "a dolly-zoom (vertigo) — push in while the background pulls back",
    "roll":      "a slow camera roll / canted rotation",
    "whip":      "a fast whip-pan sweep that settles",
}

AMPLITUDE = {
    "calm":   "subtle, restrained amplitude",
    "punchy": "lively, energetic amplitude with clear, bold movement",
    "max":    "high-energy amplitude — elements burst, scatter and fly boldly",
}

# Neutral fallback when a shot doesn't specify element_motion. Prefer per-shot AI-authored
# element_motion that fits the scene — do NOT force a flying element into every shot.
DEFAULT_ELEMENT = ("several cut-out elements move naturally with the scene — they bob, tilt, "
                   "slide, drift and scatter; halftone dots pulse")


def collage_prompt(camera, element_motion=None, feel=None, palette=None, amplitude="punchy",
                   has_title=True, constraints="strict", anchor_freeze=None):
    """Collage motion prompt. `constraints`: 'strict' = defect guards on (flat-2D, one-way,
    no-morph) for text-heavy explainers; 'loose' = let the model explore (3D/bold moves), keep
    only the essentials. Text is hard-protected ONLY when the shot has a headline (has_title).
    `anchor_freeze`: C-roll only — a FREEZE sentence protecting the photographic anchor
    sticker (face or product+label); croll_keyframes.py writes it into beats.json. Without it
    the video stage may re-letter a label or re-time a face (both observed in validation)."""
    cam = CAMERA_VOCAB.get(camera, camera)
    element = element_motion or DEFAULT_ELEMENT
    feel = feel or "tactile, editorial, a page from a scrapbook"
    palette = palette or "the still's existing palette, high contrast"
    amp = AMPLITUDE.get(amplitude, AMPLITUDE["punchy"])
    text_lock = ("Keep the HEADLINE TEXT sharp, legible and stable — do not warp or wobble the "
                 "lettering. " if has_title else "")
    if anchor_freeze:
        text_lock = f"{anchor_freeze} " + text_lock
    if constraints == "loose":
        guard = (text_lock + "Keep the paper-collage look (printed cut-outs, not photoreal); "
                 "avoid a subject melting into shapeless goo. Otherwise explore freely.")
    else:  # strict — defect guards for clean, text-heavy explainers
        guard = (text_lock + "Keep the layout stable. Stay flat 2D — no 3D rotation, no "
                 "perspective change, camera parallel to the poster. ONE continuous move that "
                 "does not loop, retract or reset. Rigid paper — no morph/melt. Animate the "
                 "motion only; don't re-render the picture.")
    return (
        "Animate this still into a mixed-media paper-collage MOTION GRAPHIC, printed cut-outs, "
        "not photoreal.\n"
        f"CAMERA (one move only): {cam}.\n"
        f"ELEMENT MOTION (rich — this is the energy, {amp}): {element}. Elements move as paper "
        "cut-outs (slide, flap, hinge, pop, scatter, fly).\n"
        "AESTHETIC: keep the torn-paper, tape, halftone, newsprint and paper-stencil textures "
        "and the bold flat background.\n"
        f"FEEL: {feel}.\nCOLOR: {palette}.\n"
        f"CONSTRAINTS: {guard}"
    )


def painterly_prompt(motion):
    return (f"Animate this classical Chinese painting with subtle, tasteful motion: {motion}. "
            f"Keep the painted style, textures and all on-screen text intact and stable. "
            f"Gentle, cinematic, no morphing, no new objects.")


def clip_setup(doc):
    """Film-wide video settings. Returns dict, or raises ValueError at the aspect gate."""
    aspect = doc.get("aspect", "16:9")
    model = doc.get("video_model", VIDEO_MODEL)   # Seedance for real people; Omni otherwise
    _theme = resolve_theme(doc.get("theme")) or {}
    # Aspect routing: prefer the project's own target aspect; only fall back to an
    # approximation when this model has no matching enum value, and never apply that
    # approximation without a human confirming it first (see styles.resolve_video_aspect).
    resolved, exact = resolve_video_aspect(aspect, model)
    if not exact and not doc.get("aspect_approx_confirmed"):
        raise ValueError(
            f"ASPECT MISMATCH: project aspect \"{aspect}\" has no exact match on {model}; "
            f"nearest supported is \"{resolved}\". This changes the output framing — confirm "
            f"with the user before generating, then set \"aspect_approx_confirmed\": true in "
            f"beats.json to proceed (or pick a different video_model / aspect).")
    return {"model": model, "aspect": resolved or aspect, "approx": not exact,
            "style": doc.get("style", "painterly"),
            "motion_style": doc.get("motion_style") or _theme.get("motion_style", "punchy"),
            "constraints": doc.get("constraints", "strict"),     # strict | loose
            "vid_res": doc.get("video_resolution", "720p")}


def clip_request(doc, beat, shot, setup, image_url):
    """(model, prompt, params, signature) of the clip for this shot under the CURRENT
    beats.json and the given keyframe url."""
    model, aspect = setup["model"], setup["aspect"]
    # new schema: camera_move (token) + element_motion (rich). Back-compat: old `motion`.
    camera = shot.get("camera_move") or shot.get("motion", "push_in")
    if setup["style"] == "collage":
        prompt = collage_prompt(camera, element_motion=shot.get("element_motion"),
                                feel=beat.get("feel"), palette=beat.get("bg"),
                                amplitude=setup["motion_style"],
                                anchor_freeze=doc.get("anchor_freeze"),
                                has_title=shot.get("title", True),
                                constraints=setup["constraints"])
    else:
        prompt = painterly_prompt(shot.get("motion", camera))
    dur = int(shot.get("dur", 10))
    if "seedance" in model:                 # ratio (not aspect_ratio); real-person OK
        params = dict(image=image_url, duration=dur, ratio=aspect,
                      resolution=setup["vid_res"], generate_audio=False)
    elif "kling-video-o3-pro/reference-to-video" in model:  # has an aspect_ratio enum
        params = dict(image=image_url, duration=dur, aspect_ratio=aspect, sound=False)
    elif "kling" in model:                   # image-to-video / video-edit: follows input
        params = dict(image=image_url, duration=dur, sound=False)
    else:                                    # gemini omni flash
        params = dict(image=image_url, duration=dur, aspect_ratio=aspect, resolution="720p")
    return model, prompt, params, sig(model, prompt, params)


def clip_state(doc, beat, shot, setup):
    """fresh | locked | stale | unverified | missing | no_keyframe | keyframe_stale."""
    if shot.get("clip_locked"):
        return "locked", None
    kstate, _ = keyframe_state(doc, beat, shot)
    if kstate in ("stale", "missing") and not shot.get("keyframe_url"):
        return ("keyframe_stale" if kstate == "stale" else "no_keyframe"), None
    if kstate == "stale":
        return "keyframe_stale", None
    url = shot.get("keyframe_url")
    if not url:
        return "no_keyframe", None
    req = clip_request(doc, beat, shot, setup, url)
    job = shot.get("clip_job") or {}
    ok = check_media(shot.get("clip_path"), "video")[0]
    if job.get("sig"):
        if job["sig"] != req[3]:
            return ("stale" if ok else "missing"), req
        return ("fresh" if ok else "missing"), req
    return ("unverified" if ok else "missing"), req


def run(project_dir, only=None):
    """Animate shots that have no up-to-date clip. Safe to re-run: a clip whose file
    passes the integrity check and whose inputs (keyframe, prompt, model, duration,
    aspect...) are unchanged is reused; a clip made from older inputs is regenerated;
    a clip whose keyframe is out of date is NOT paid for (run keyframes.py first);
    recorded jobs are resumed instead of resubmitted; beats.json is saved atomically
    after every single clip. A clip with no recorded inputs (old project) is never
    reused or replaced silently: set "clip_locked": true to keep it, or delete
    clip_path to regenerate it."""
    bpath = os.path.join(project_dir, "beats.json")
    with open(bpath) as f:
        doc = json.load(f)
    save = lambda: atomic_write_json(bpath, doc)
    try:
        setup = clip_setup(doc)
    except ValueError as e:
        print(e)
        return None
    if setup["approx"]:
        print(f"[aspect] using confirmed approximation \"{setup['aspect']}\" for project "
              f"aspect \"{doc.get('aspect', '16:9')}\" on {setup['model']}")
    clip_dir = os.path.join(project_dir, "clips")
    os.makedirs(clip_dir, exist_ok=True)

    prov = get_provider(doc.get("provider"))
    items, skipped, held = [], [], []
    for beat in doc["beats"]:
        for shot, key in shots_of(beat):
            if only and key not in only:
                continue
            if shot.get("kind") == "host":      # presenter shots use host_clips.py
                continue
            if not shot.get("keyframe_url") and shot.get("keyframe_path") and \
                    check_media(shot["keyframe_path"], "image")[0]:
                # user-provided keyframe (e.g. hand-made collage card) -> upload it (free)
                shot["keyframe_url"] = prov.upload(shot["keyframe_path"])
                save()
                print(f"[{key}] uploaded provided keyframe -> {shot['keyframe_url']}")
            state, req = clip_state(doc, beat, shot, setup)
            if state in ("fresh", "locked"):
                skipped.append(key)
                print(f"[{key}] reuse clip ({state})")
                continue
            if state in ("no_keyframe", "keyframe_stale"):
                held.append(key)
                print(f"[{key}] keyframe {'missing' if state == 'no_keyframe' else 'OUT OF DATE'}"
                      f" -> run keyframes.py first (no clip paid for)")
                continue
            if state == "unverified":
                held.append(key)
                print(f"[{key}] existing clip has no record of its inputs (old project) -> not "
                      f"reused, not replaced. Keep it: \"clip_locked\": true; regenerate: "
                      f"delete \"clip_path\"")
                continue
            if state == "stale":
                print(f"[{key}] clip is OUT OF DATE (inputs changed) -> new clip")
            model, prompt, params, signature = req
            items.append(PaidItem(
                key, shot, "clip_job", signature,
                submit=(lambda m=model, p=prompt, pr=params: prov.submit_video(m, p, **pr)),
                dest=os.path.join(clip_dir, f"clip_{key}.mp4"),
                apply=(lambda url, dest, sh=shot: sh.update(clip_url=url, clip_path=dest))))
            print(f"[{key}] queued ({params['duration']}s, {model.split('/')[1]})")

    save()
    try:
        summary = run_paid_items(prov, items, save, poll_s=5, stall_s=240, deadline_s=1200)
    except STOP_ERRORS as e:
        save()
        print(f"STOPPED: {e}\nProgress so far is saved in {bpath}.")
        raise
    summary["blocked"] += held
    save()
    print_summary("clips", summary, skipped)
    print("updated", bpath)
    return summary


if __name__ == "__main__":
    proj = sys.argv[1] if len(sys.argv) > 1 else os.path.join(
        os.path.dirname(__file__), "..", "out", "tang-30s")
    only = set(sys.argv[2].split(",")) if len(sys.argv) > 2 else None
    try:
        res = run(os.path.abspath(proj), only=only)
    except STOP_ERRORS:
        sys.exit(1)                       # message printed, progress saved
    if res and (res["failed"] or res["pending"] or res["blocked"]):
        sys.exit(3)                       # partial: re-run to continue
