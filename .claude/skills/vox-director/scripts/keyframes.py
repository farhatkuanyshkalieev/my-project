#!/usr/bin/env python3
"""
Keyframe stage: one styled keyframe per SHOT.

Each beat holds one or more shots (different framings of the same narration
beat) so the cut has variety. Falls back to one implicit shot per beat if a
beat has no "shots". Generates concurrently, downloads to
<project>/keyframes/kf_<beat><shot>.jpg, records url+path onto each shot.

Usage: python3 keyframes.py <project_dir>   (default: out/tang-30s)
"""
import json
import os
import sys

from atlas_cloud import STOP_ERRORS
from project_io import atomic_write_json, check_media, sig
from provider import get_provider, PaidItem, run_paid_items, print_summary
from styles import (compose_keyframe_prompt, compose_collage_prompt, resolve_theme, image_params,
                    STYLE_BASES)

IMAGE_MODEL = "google/nano-banana-2/text-to-image"


def shots_of(beat):
    """Yield (shot_dict, shot_key) for a beat; synthesize one shot if none."""
    if beat.get("shots"):
        for s in beat["shots"]:
            yield s, f"{beat['id']}{s.get('id','')}"
    else:
        yield beat, f"{beat['id']}"   # beat acts as its own single shot


def keyframe_request(doc, beat, shot):
    """What a keyframe for this shot must be made from under the CURRENT beats.json:
    (model, prompt, params, signature). Raises ValueError for a misconfigured style."""
    aspect = doc.get("aspect", "16:9")
    img_model = doc.get("image_model", IMAGE_MODEL)
    img_res = doc.get("image_resolution", "1k")
    style = doc.get("style", "painterly")
    theme = resolve_theme(doc.get("theme")) or {}
    title_cn, title_en = beat.get("title_cn", ""), beat.get("title_en", "")
    if style == "collage":
        prompt = compose_collage_prompt(
            shot["scene"], title_cn, title_en, beat.get("bg", "warm ochre"), aspect,
            with_title=shot.get("title", True),
            style=theme.get("idiom") or doc.get("collage_style", "american-retro"),
            palette=theme.get("palette") or doc.get("palette"),
            type_style=theme.get("type_style") or doc.get("type_style"),
            finish=theme.get("finish") or doc.get("finish"))
    else:
        era = doc.get("era")
        if era not in STYLE_BASES:
            raise ValueError(f"style is \"{style}\" (painterly) but era \"{era}\" is not one of "
                             f"{sorted(STYLE_BASES)}; for a paper-collage film set "
                             f"\"style\": \"collage\"")
        prompt = compose_keyframe_prompt(era, shot["scene"], title_cn, title_en, aspect)
    params = image_params(img_model, aspect, img_res)
    return img_model, prompt, params, sig(img_model, prompt, params)


def keyframe_state(doc, beat, shot):
    """fresh | legacy_fresh | provided | locked | stale | missing  (+ request tuple).
    `stale` = the keyframe on record was made from different inputs than beats.json
    now describes (scene, title, theme, style, aspect, model, resolution...)."""
    req = keyframe_request(doc, beat, shot)
    if shot.get("keyframe_locked"):
        return "locked", req
    job = shot.get("keyframe_job") or {}
    if job.get("sig"):                                   # made by this pipeline
        if job["sig"] != req[3]:
            return ("stale" if shot.get("keyframe_url") else "missing"), req
        return ("fresh" if shot.get("keyframe_url") else "missing"), req
    if shot.get("keyframe_url"):                         # legacy record, no signature
        old = shot.get("keyframe_prompt")
        if old is None:
            return "provided", req                       # reused/hand-set url: nothing to compare
        return ("legacy_fresh" if old == req[1] else "stale"), req
    if shot.get("keyframe_path") and check_media(shot["keyframe_path"], "image")[0]:
        return "provided", req                           # user-made card; clips.py uploads it
    return "missing", req


def run(project_dir):
    """Generate missing or out-of-date keyframes. Safe to re-run: a keyframe made from
    exactly the current inputs is reused; one made from older inputs is retired (moved
    to `keyframe_previous`, so no later stage can use it) and regenerated; recorded jobs
    are resumed instead of resubmitted; beats.json is saved atomically after every item.
    Set "keyframe_locked": true on a shot to keep its keyframe whatever changes."""
    bpath = os.path.join(project_dir, "beats.json")
    with open(bpath) as f:
        doc = json.load(f)
    save = lambda: atomic_write_json(bpath, doc)
    kf_dir = os.path.join(project_dir, "keyframes")
    os.makedirs(kf_dir, exist_ok=True)

    prov = get_provider(doc.get("provider"))
    items, skipped = [], []
    for beat in doc["beats"]:
        for shot, key in shots_of(beat):
            if shot.get("kind") == "host":      # presenter shots use host_plates.py
                continue
            try:
                state, (model, prompt, params, signature) = keyframe_state(doc, beat, shot)
            except ValueError as e:
                print(f"beats.json: {e}. Nothing was generated.")
                return None
            if state in ("fresh", "locked", "provided", "legacy_fresh"):
                if state == "legacy_fresh":     # old project: adopt it with a signature
                    shot["keyframe_job"] = {"sig": signature, "status": "done",
                                            "output": shot["keyframe_url"], "backfilled": True}
                ok, why = check_media(shot.get("keyframe_path"), "image")
                if shot.get("keyframe_path") and not ok:
                    print(f"[{key}] note: keyframe_url set but local file unusable ({why}); "
                          f"clips use the URL")
                print(f"[{key}] reuse keyframe ({state})")
                skipped.append(key)
                continue
            if state == "stale":
                shot["keyframe_previous"] = {k: shot.get(k) for k in
                                             ("keyframe_url", "keyframe_path", "keyframe_prompt")}
                shot.pop("keyframe_url", None)
                shot.pop("keyframe_path", None)
                print(f"[{key}] keyframe is OUT OF DATE (inputs changed) -> retired, new one needed")
            shot["keyframe_prompt"] = prompt
            items.append(PaidItem(
                key, shot, "keyframe_job", signature,
                submit=(lambda m=model, p=prompt, pr=params: prov.submit_image(m, p, **pr)),
                dest=os.path.join(kf_dir, f"kf_{key}.jpg"),
                apply=(lambda url, dest, sh=shot: sh.update(keyframe_url=url, keyframe_path=dest))))
    save()
    try:
        summary = run_paid_items(prov, items, save, poll_s=3, stall_s=75, deadline_s=300)
    except STOP_ERRORS as e:
        save()
        print(f"STOPPED: {e}\nProgress so far is saved in {bpath}.")
        raise
    save()
    print_summary("keyframes", summary, skipped)
    print("updated", bpath)
    return summary


if __name__ == "__main__":
    proj = sys.argv[1] if len(sys.argv) > 1 else os.path.join(
        os.path.dirname(__file__), "..", "out", "tang-30s")
    try:
        res = run(os.path.abspath(proj))
    except STOP_ERRORS:
        sys.exit(1)                       # message printed, progress saved
    if res and (res["failed"] or res["pending"] or res["blocked"]):
        sys.exit(3)                       # partial: re-run to continue
