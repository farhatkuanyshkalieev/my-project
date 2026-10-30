"""project_manifest.json: sources, scenes, tools, parameters — everything needed to rebuild or change one scene."""
import json, os, subprocess, sys, hashlib
sys.path.insert(0, os.path.dirname(__file__))
import ep01_timeline as TL
from voice_takes import VOICES, LINES as VL
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
P = lambda *a: os.path.join(ROOT, *a)


def ver(cmd):
    try:
        return subprocess.run(cmd, capture_output=True, text=True).stdout.splitlines()[0]
    except Exception:
        return "n/a"


def sha(p):
    return hashlib.sha256(open(p, "rb").read()).hexdigest()[:16] if os.path.exists(p) else None


import skia, numpy, scipy
qc = json.load(open(P("final", "qc_report.json"))) if os.path.exists(P("final", "qc_report.json")) else {}
shots = json.load(open(P("storyboard", "shot_list.json")))
m = dict(
    project="ТЕБЯ ЗДЕСЬ НЕ БЫЛО", episode=1, episode_title="НЕ ОТВЕЧАЙ", language="ru", format="vertical 9:16",
    duration_s=TL.DURATION, resolution=[1080, 1920], fps=60,
    style="CINEMATIC STICKMAN 2.5D — procedural vector animation (skia), multiplicative lighting passes, DOF, parallax",
    pipeline=[
        "1 voice: ElevenLabs eleven_v4 (tagged emotional direction) -> voices/raw/*.mp3",
        "2 voice QC: faster-whisper small (ru) transcription vs script -> voices/qc_report.json",
        "3 audio_build.py: trim, process (room / phone / double pitch -1.3 st + hall reverb), lip-sync envelopes, synth SFX, original score, mix, limiter",
        "4 ep01_shots.py + render.py: every frame drawn at its own time (true 60 fps, no interpolation) -> renders/ep01_picture_master.mp4",
        "5 subtitles.py: SRT + overlay PNGs from real dialogue timing",
        "6 finalize.py: loudnorm -14 LUFS / -1.5 dBTP, grain, 2-pass H.264, subtitle burn-in",
        "7 qc.py: ffprobe, duplicate-frame analysis, loudness, black-bar check",
    ],
    rebuild=["python3 scripts/audio_build.py", "python3 scripts/render.py renders/ep01_picture_master.mp4",
             "python3 scripts/subtitles.py", "python3 scripts/finalize.py", "python3 scripts/qc.py",
             "python3 scripts/make_manifest.py"],
    rerender_one_scene="edit scripts/ep01_shots.py::sNN, then python3 scripts/render.py renders/ep01_picture_master.mp4 (renders 3804 frames, ~9 min on 4 CPU); stills: python3 scripts/render_stills.py OUT_DIR T1 T2...",
    tools=dict(python=sys.version.split()[0], skia_python=skia.__version__, numpy=numpy.__version__, scipy=scipy.__version__,
               ffmpeg=ver(["ffmpeg", "-version"]), elevenlabs=dict(model="eleven_v4", flow="https://elevenlabs.io/app/flows/IwBapBwwAluvM3OQnm5C"),
               whisper="faster-whisper small int8 (QC only)",
               fonts=["Russo One (OFL)", "Rubik (OFL)", "Oswald (OFL)", "Inter (OFL, system)"]),
    characters={k: dict(style_sheet=f"characters/{k}_reference_sheet.png") for k in ("arman", "double", "mom", "girl", "barista", "operator")},
    voices=VOICES,
    dialogue={lid: dict(speaker=VL[lid][0], text=VL[lid][1], eleven_prompt=VL[lid][2], takes=VL[lid][3],
                        selected_take=TL.TAKES[lid], direction=VL[lid][4], start_s=TL.LINES[lid]["t"],
                        fx_chain=TL.LINES[lid]["fx"], processed=f"voices/processed/{lid}.wav") for lid in TL.TAKES},
    locations=dict(sets_code="scripts/engine/sets.py, scripts/engine/sets_future.py",
                   sheet="references/environment_reference_sheet.png", backgrounds=sorted(os.listdir(P("backgrounds")))),
    scenes=shots,
    events=TL.EV,
    audio=dict(score="music/ep01_score.wav (original, synthesized in audio_build.py)",
               sfx=sorted(os.listdir(P("sound_effects"))), mix_premaster="renders/ep01_mix_premaster.wav",
               lipsync="compositions/lipsync.json"),
    outputs={k: dict(path=v, sha256_16=sha(P(v))) for k, v in dict(
        final="final/episode_01_final.mp4", no_subtitles="final/episode_01_no_subtitles.mp4",
        thumbnail="final/episode_01_thumbnail.png", subtitles="final/episode_01_subtitles.srt",
        storyboard="storyboard/storyboard.md", storyboard_sheet="storyboard/storyboard_sheet.png",
        report="production_report.md").items()},
    qc=qc,
)
json.dump(m, open(P("project_manifest.json"), "w"), ensure_ascii=False, indent=1)
print("manifest ok")
