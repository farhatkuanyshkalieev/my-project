#!/usr/bin/env python3
"""
Assembly stage (ffmpeg): multi-shot clips + per-beat narration + music -> final.mp4

Model: beats -> shots. Each shot is one short clip (its own cut). Narration and
captions are per BEAT and span all the beat's shots, so the voice stays aligned
while the visuals cut. BGM is ducked under the narration. Captions + watermark
are Pillow PNGs composited with `overlay` (this ffmpeg has no libass/drawtext).

Usage: python3 assemble.py <project_dir>   (default: out/tang-30s)
"""
import json
import os
import subprocess
import sys

import text_overlay
from project_io import check_media

FPS, TAIL = 24, 0.5
WATERMARK = "Made with Atlas Cloud · vox-director"
RES = {"16:9": (1920, 1080), "9:16": (1080, 1920), "1:1": (1080, 1080)}


def ff(args):
    subprocess.run(["ffmpeg", "-y", "-loglevel", "error", *args], check=True)


def probe_dur(path):
    out = subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration",
                          "-of", "csv=p=0", path], capture_output=True, text=True).stdout
    try:
        return float(out.strip())
    except ValueError:
        return 0.0


def shots_of(beat):
    if beat.get("shots"):
        for s in beat["shots"]:
            yield s
    else:
        yield beat


class MissingInputs(RuntimeError):
    """Raised (after a readable report is printed) when inputs are missing/broken."""


_FIX = {"clip": "run clips.py", "narration": "run audio.py", "bgm": "run audio.py"}


def _job_note(job):
    if not job:
        return ""
    st = job.get("status")
    if st in ("rejected",):
        return (f" [job {st}: {str(job.get('error', ''))[:90]} -> change the inputs or delete "
                f"the job record to retry]")
    if st in ("submit_unknown", "submitting", "lost"):
        return (f" [job {st}: a PAID task may exist; Atlas has no way to look it up - check the "
                f"Atlas console/billing before deleting the job record]")
    if st == "output_expired":
        return (" [paid output not downloadable (expired?) -> re-run retries the free download; "
                "delete the job record only if you accept paying for a new one]")
    if st in ("submitted", "timeout", "poll_error"):
        return " [job still running -> re-run the stage to collect it]"
    if st == "download_failed":
        return " [generated but download failed -> re-run the stage (free re-download)]"
    if st == "failed":
        return f" [job failed: {str(job.get('error', ''))[:90]}]"
    return ""


_STATE_MSG = {
    "stale": "OUT OF DATE (made from different inputs than beats.json now has)",
    "unverified": "no record of the inputs it was made from (old project) - set the *_locked "
                  "flag to keep it or delete the path to regenerate",
    "missing": "missing or unusable",
    "no_keyframe": "its keyframe is missing -> run keyframes.py, then clips.py",
    "keyframe_stale": "its keyframe is OUT OF DATE -> run keyframes.py, then clips.py",
    "no_music": "no music chosen",
}


def preflight(doc):
    """List every missing, broken or OUT-OF-DATE input of the final assembly.
    Freshness uses the same signatures as the stages, so a clip/narration/music made
    from older inputs (edited scene, narration text, voice, music...) is never used."""
    import audio as _audio
    import clips as _clips
    import keyframes as _kf
    problems = []
    beats = doc.get("beats") or []
    if not beats:
        return ["beats.json has no beats"]
    try:
        setup = _clips.clip_setup(doc)
    except ValueError as e:
        setup, problems = None, [str(e)]
    v = _audio.voice_setup(doc)
    gate = _audio.language_gate(v["voice"], v["language"], v["clone_ref"],
                                [b.get("narration", "") for b in beats])
    if gate:
        problems.append(gate)
    for bi, beat in enumerate(beats, 1):
        bid = beat.get("id", bi)
        if not str(beat.get("narration", "")).strip():
            problems.append(f"beat {bid}: no narration text (needed for the caption)")
        else:
            st, _ = _audio.narration_state(v, beat)
            if st not in ("fresh", "locked"):
                why = check_media(beat.get("narration_audio"), "audio")[1] if st == "missing" \
                    else _STATE_MSG[st]
                problems.append(f"beat {bid}: narration audio - {why} -> {_FIX['narration']}"
                                + _job_note(beat.get("narration_job")))
        for shot in shots_of(beat):
            key = f"{bid}{shot.get('id', '') if shot is not beat else ''}"
            if shot.get("kind") == "host":            # host composites: integrity only
                ok, why = check_media(shot.get("clip_path"), "video")
                if not ok:
                    problems.append(f"beat {bid}, shot {key}: host clip - {why} -> run host_clips.py")
                continue
            if setup is None:
                continue
            try:
                st, _ = _clips.clip_state(doc, beat, shot, setup)
            except ValueError as e:
                problems.append(f"beat {bid}, shot {key}: {e}")
                continue
            if st not in ("fresh", "locked"):
                why = check_media(shot.get("clip_path"), "video")[1] if st == "missing" \
                    else _STATE_MSG[st]
                fix = "" if st in ("no_keyframe", "keyframe_stale") else f" -> {_FIX['clip']}"
                problems.append(f"beat {bid}, shot {key}: video clip - {why}{fix}"
                                + _job_note(shot.get("clip_job")))
    st, info = _audio.bgm_state(doc)
    if st not in ("fresh", "locked"):
        why = (info if st == "no_music" else
               check_media(doc.get("bgm_path"), "audio")[1] if st == "missing" else _STATE_MSG[st])
        problems.append(f"background music - {why} -> {_FIX['bgm']}" + _job_note(doc.get("bgm_job")))
    return problems


def run(project_dir):
    with open(os.path.join(project_dir, "beats.json")) as f:
        doc = json.load(f)
    problems = preflight(doc)
    if problems:
        print(f"CANNOT ASSEMBLE YET - {len(problems)} missing or unusable input(s):")
        for p in problems:
            print(f"  - {p}")
        print("Nothing was rendered and beats.json was not changed. Fix the items above "
              "(re-running a stage reuses everything already made), then run assemble.py again.")
        raise MissingInputs(f"{len(problems)} missing/unusable input(s)")
    beats = doc["beats"]
    W, H = RES.get(doc.get("aspect", "16:9"), (1920, 1080))
    wm_text = doc.get("watermark", WATERMARK)
    mix = doc.get("mix", {})                      # per-project audio balance (optional)
    music_vol = float(mix.get("music", 0.6))      # BGM level (was a fixed 0.9 — lowered so VO leads)
    voice_vol = float(mix.get("voice", 1.25))     # narration boost before the duck + final mix
    cap_style = doc.get("caption_style", "white") # white (default, clean) | paper (collage)
    tmp = os.path.join(project_dir, "_seg")
    os.makedirs(tmp, exist_ok=True)

    # ---- flatten shots into timed segments; track each beat's span ----
    segs = []          # {clip, dur}
    beat_spans = []    # {start, dur, beat}
    t = 0.0
    for beat in beats:
        beat_start = t
        shot_list = list(shots_of(beat))
        # ensure the beat covers its narration (extend last shot if needed)
        durs = [float(s.get("dur", 10)) for s in shot_list]
        need = float(beat.get("narration_dur", sum(durs))) + TAIL
        # a host shot's audio IS its clip, so it is never extended or slowed (sync would break)
        if sum(durs) < need and shot_list[-1].get("kind") != "host":
            durs[-1] += need - sum(durs)
        for s, d in zip(shot_list, durs):
            segs.append({"clip": s["clip_path"], "dur": round(d, 2),
                         "host": s.get("kind") == "host"})
            t += d
        beat_spans.append({"start": beat_start, "dur": round(t - beat_start, 2), "beat": beat})
    total = round(t, 2)

    # ---- 1) normalise each shot to a silent segment of exactly its dur ----
    seg_files = []
    for i, s in enumerate(segs):
        out = os.path.join(tmp, f"seg_{i:02d}.mp4")
        # If the clip is shorter than the segment (narration longer than the AI
        # clip), slow it to fill instead of freezing the last frame.
        cd = probe_dur(s["clip"])
        factor = s["dur"] / cd if cd > 0 else 1.0
        pre = f"setpts={factor:.4f}*PTS," if factor > 1.02 and not s["host"] else ""
        # blurred-fill background so off-aspect clips (e.g. 3:4 card in 9:16) get a
        # nice bg instead of black bars; for matching-aspect clips the fg fills fully.
        fc = (f"[0:v]{pre}split[s0][s1];"
              f"[s0]scale={W}:{H}:force_original_aspect_ratio=increase,crop={W}:{H},"
              f"boxblur=26:2,eq=brightness=-0.05[bg];"
              f"[s1]scale={W}:{H}:force_original_aspect_ratio=decrease[fg];"
              f"[bg][fg]overlay=(W-w)/2:(H-h)/2,setsar=1,fps={FPS},"
              f"tpad=stop_mode=clone:stop_duration=1[v]")
        ff(["-i", s["clip"], "-an", "-filter_complex", fc, "-map", "[v]", "-t", f"{s['dur']}",
            "-c:v", "libx264", "-pix_fmt", "yuv420p", out])
        seg_files.append(out)

    # ---- 2) concat all shot segments (video only) ----
    listf = os.path.join(tmp, "list.txt")
    with open(listf, "w") as f:
        for s in seg_files:
            f.write(f"file '{os.path.abspath(s)}'\n")
    body = os.path.join(tmp, "body_silent.mp4")
    ff(["-f", "concat", "-safe", "0", "-i", listf, "-c", "copy", body])

    # ---- 3) captions (per beat) + watermark PNGs ----
    captions_on = bool(doc.get("captions", True))  # "captions": false -> no burned-in captions
    cap_pngs = []
    if captions_on:
        for bs in beat_spans:
            beat = bs["beat"]
            p = os.path.join(tmp, f"cap_{beat['id']}.png")
            acc = None
            if cap_style == "paper":              # only the paper style uses a per-beat keyline
                kf = next((s["keyframe_path"] for s in (beat.get("shots") or [beat])
                           if s.get("keyframe_path") and os.path.exists(s["keyframe_path"])), None)
                acc = text_overlay.accent_color(kf) if kf else None
            text_overlay.render_caption(beat["narration"], p, W, H, accent=acc, style=cap_style)
            cap_pngs.append(p)
    wm_png = text_overlay.render_watermark(wm_text, os.path.join(tmp, "wm.png"), W, H)

    # ---- 4) one pass: overlay captions+wm, mix per-beat narration, duck BGM ----
    nb = len(beat_spans)
    ncap = len(cap_pngs)                        # 0 when captions are off
    inputs = ["-i", body]                       # 0
    for p in cap_pngs:
        inputs += ["-i", p]                     # 1..ncap
    inputs += ["-i", wm_png]                    # ncap+1
    narr_base = ncap + 2
    for bs in beat_spans:
        inputs += ["-i", bs["beat"]["narration_audio"]]   # narr inputs
    bgm_idx = narr_base + nb
    inputs += ["-i", doc["bgm_path"]]

    chain, prev = [], "[0:v]"
    for i, bs in enumerate(beat_spans[:ncap]):
        s, e = bs["start"] + 0.2, bs["start"] + bs["dur"] - 0.1
        lbl = f"[v{i+1}]"
        chain.append(f"{prev}[{i+1}:v]overlay=0:0:enable='between(t,{s:.2f},{e:.2f})'{lbl}")
        prev = lbl
    chain.append(f"{prev}[{ncap+1}:v]overlay=0:0[v]")

    # per-beat narration delayed to its start, then mixed
    nlabels = []
    for i, bs in enumerate(beat_spans):
        ms = int(bs["start"] * 1000)
        chain.append(f"[{narr_base+i}:a]adelay={ms}:all=1[n{i}]")
        nlabels.append(f"[n{i}]")
    # pad the narration mix to the FULL duration, else sidechaincompress follows the (shorter)
    # narration length and -shortest clips the tail (e.g. a silent payoff/ending beat).
    chain.append(f"{''.join(nlabels)}amix=inputs={nb}:normalize=0:duration=longest,volume={voice_vol},apad,atrim=0:{total}[narrmix]")
    # a filter-output label can only be consumed once -> split narration in two
    chain.append("[narrmix]asplit=2[narrA][narrB]")
    chain.append(f"[{bgm_idx}:a]atrim=0:{total},volume={music_vol},afade=t=out:st={max(total-2,0):.2f}:d=2[bgt]")
    chain.append("[bgt][narrA]sidechaincompress=threshold=0.02:ratio=12:attack=5:release=350[bgd]")
    chain.append(f"[narrB][bgd]amix=inputs=2:normalize=0:duration=longest,volume=1.4,atrim=0:{total}[a]")
    filt = ";".join(chain)

    final = os.path.join(project_dir, "final.mp4")
    ff([*inputs, "-filter_complex", filt, "-map", "[v]", "-map", "[a]",
        "-c:v", "libx264", "-pix_fmt", "yuv420p", "-c:a", "aac", "-shortest", final])
    print("FINAL:", final, f"(~{total}s, {len(segs)} shots)")


if __name__ == "__main__":
    proj = sys.argv[1] if len(sys.argv) > 1 else os.path.join(
        os.path.dirname(__file__), "..", "out", "tang-30s")
    try:
        run(os.path.abspath(proj))
    except MissingInputs:
        sys.exit(2)
