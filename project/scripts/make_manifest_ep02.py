"""Ep. 2 manifest: what was produced, from which sources, how to rebuild, and the measured QC."""
import json, os, sys
sys.path.insert(0, os.path.dirname(__file__))
import ep02_timeline as TL

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
P = lambda *a: os.path.join(ROOT, *a)
qc = json.load(open(P("final", "episode_02_qc_report.json")))
vqc = json.load(open(P("ep02", "voices", "qc_report.json")))
snr = json.load(open(P("renders", "ep02", "ep02_dialogue_snr.json")))
text = {lid: t for lid, t, _, _ in TL.SUBTITLES}
VOICE = {"arman": "Egor g1G73EpCIdK4HUyDiLYF", "double": "Egor g1G73EpCIdK4HUyDiLYF (pitch ×0.928, formant kept, hall)",
         "mom_phone": "Soldani wlkyM0h4j74QgqHxZi4F (phone band 320–3300 Hz)", "mom": "Soldani wlkyM0h4j74QgqHxZi4F"}
m = dict(
    project="ТЕБЯ ЗДЕСЬ НЕ БЫЛО", episode=2, episode_title=TL.TITLE, language="ru", duration_s=TL.DURATION,
    format=dict(resolution="1080x1920", aspect="9:16", fps="60/1 CFR (every frame drawn at its own time)", video="H.264 High 4.2, 12 Mb/s 2-pass, yuv420p",
                audio="AAC 256k, 48 kHz stereo, -14 LUFS"),
    style_standard=dict(source="final/episode_01_final.mp4 (approved ep. 1 v2)", bible="references/standard/series_standard_bible.png",
                        doc="references/standard/SERIES_STANDARD.md", sheets=sorted("characters/standard/" + f for f in os.listdir(P("characters", "standard"))),
                        identity_test="renders/ep02/ep02_corridor_test.mp4 + references/standard/identity_check_corridor_test.png",
                        changes_vs_ep1=["Arman's rim locked to blue #8fb8ff in every location (ep. 1 used the scene light colour in the kitchen)",
                                        "Mom redrawn to standard v3 geometry with the same rig (CONCEPT['mom']); ep. 1 design kept as CONCEPT['mom_ep1']"]),
    dialogue=[dict(id=lid, who=L["who"], voice=VOICE[L["who"]], take=L["take"], start_s=L["t"], text=text[lid], fx=L["fx"],
                   whisper_heard=vqc[lid]["heard"], whisper_similarity=vqc[lid]["similarity"], speech_band_snr_db=snr[lid])
              for lid, L in TL.LINES.items()],
    shots=[dict(id=s, start=a, end=b, description=d) for s, a, b, d in TL.SHOTS],
    events=TL.EV,
    rebuild=["python3 scripts/ep02_voice_qc.py <whisper_model_dir>", "python3 scripts/ep02_audio.py", "python3 scripts/ep02_snr.py",
             "EP=02 python3 scripts/render.py renders/ep02/ep02_picture_master.mp4", "EP=02 python3 scripts/subtitles.py",
             "EP=02 python3 scripts/finalize.py", "EP=02 python3 scripts/qc.py", "python3 scripts/make_thumbnail_ep02.py",
             "python3 scripts/make_storyboard_ep02.py", "python3 scripts/make_standard_refs.py", "python3 scripts/make_manifest_ep02.py"],
    outputs=dict(final="final/episode_02_final.mp4", no_subtitles="final/episode_02_no_subtitles.mp4", subtitles="final/episode_02_subtitles.srt",
                 thumbnail="final/episode_02_thumbnail.png", storyboard="ep02/storyboard/storyboard.md", storyboard_sheet="ep02/storyboard/storyboard_sheet.png",
                 score="music/ep02_score.wav", mix_premaster="renders/ep02/ep02_mix_premaster.wav", stems="renders/ep02/stems/",
                 voices_raw="ep02/voices/raw/", voices_processed="ep02/voices/processed/", lipsync="ep02/compositions/lipsync.json"),
    qc=qc,
)
json.dump(m, open(P("ep02", "episode_02_manifest.json"), "w"), ensure_ascii=False, indent=1)
print("manifest ok")
