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

from atlas_cloud import AtlasAuthError
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


def run(project_dir):
    """Generate the missing keyframes. Safe to re-run: shots that already have a
    keyframe (keyframe_url, or a valid user-provided keyframe_path) are skipped,
    jobs recorded in beats.json are resumed instead of resubmitted, and beats.json
    is saved atomically after every single keyframe."""
    bpath = os.path.join(project_dir, "beats.json")
    with open(bpath) as f:
        doc = json.load(f)
    save = lambda: atomic_write_json(bpath, doc)
    aspect = doc.get("aspect", "16:9")
    img_model = doc.get("image_model", IMAGE_MODEL)   # default nano-banana-2; e.g. openai/gpt-image-2/text-to-image
    img_res = doc.get("image_resolution", "1k")       # 1k (default) | 2k | 4k
    style = doc.get("style", "painterly")
    theme = resolve_theme(doc.get("theme")) or {}   # theme preset -> full look bundle
    collage_style = theme.get("idiom") or doc.get("collage_style", "american-retro")
    # a registered theme wins; a custom (unregistered) theme may set these at doc level
    t_palette = theme.get("palette") or doc.get("palette")
    t_type = theme.get("type_style") or doc.get("type_style")
    t_finish = theme.get("finish") or doc.get("finish")
    era = doc.get("era")            # only needed for the painterly (per-dynasty) style
    if style != "collage" and era not in STYLE_BASES:
        print(f"beats.json: style is \"{style}\" (painterly) but era \"{era}\" is not one of "
              f"{sorted(STYLE_BASES)}. For a paper-collage film set \"style\": \"collage\". "
              f"Nothing was generated.")
        return
    kf_dir = os.path.join(project_dir, "keyframes")
    os.makedirs(kf_dir, exist_ok=True)

    prov = get_provider(doc.get("provider"))
    items, skipped = [], []
    params = image_params(img_model, aspect, img_res)
    for beat in doc["beats"]:
        for shot, key in shots_of(beat):
            if shot.get("kind") == "host":      # presenter shots use host_plates.py
                continue
            if shot.get("keyframe_url"):        # already generated (e.g. reused wide) -> skip
                ok, why = check_media(shot.get("keyframe_path"), "image")
                if shot.get("keyframe_path") and not ok:
                    print(f"[{key}] note: keyframe_url set but local file unusable ({why}); "
                          f"clips use the URL")
                skipped.append(key)
                continue
            if shot.get("keyframe_path") and check_media(shot["keyframe_path"], "image")[0]:
                skipped.append(key)             # user-provided card: clips.py uploads it
                print(f"[{key}] using provided keyframe {shot['keyframe_path']}")
                continue
            scene = shot["scene"]
            title_cn, title_en = beat.get("title_cn", ""), beat.get("title_en", "")
            if style == "collage":
                prompt = compose_collage_prompt(scene, title_cn, title_en,
                                                beat.get("bg", "warm ochre"), aspect,
                                                with_title=shot.get("title", True),
                                                style=collage_style, palette=t_palette,
                                                type_style=t_type, finish=t_finish)
            else:
                prompt = compose_keyframe_prompt(era, scene, title_cn, title_en, aspect)
            shot["keyframe_prompt"] = prompt
            items.append(PaidItem(
                key, shot, "keyframe_job", sig(img_model, prompt, params),
                submit=(lambda p=prompt: prov.submit_image(img_model, p, **params)),
                dest=os.path.join(kf_dir, f"kf_{key}.jpg"),
                apply=(lambda url, dest, sh=shot: sh.update(keyframe_url=url, keyframe_path=dest))))
    save()
    try:
        summary = run_paid_items(prov, items, save, poll_s=3, stall_s=75, deadline_s=300)
    except AtlasAuthError as e:
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
    except AtlasAuthError:
        sys.exit(1)                       # message printed, progress saved
    if res and (res["failed"] or res["pending"] or res["blocked"]):
        sys.exit(3)                       # partial: re-run to continue
