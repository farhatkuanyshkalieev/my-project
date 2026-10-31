"""Ep. 3 manifest: what was produced, from which sources, how to rebuild, and the measured QC."""
import json, os, sys
sys.path.insert(0, os.path.dirname(__file__))
import ep03_timeline as TL

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
P = lambda *a: os.path.join(ROOT, *a)
qc = json.load(open(P("final", "episode_03_qc_report.json")))
vqc = json.load(open(P("ep03", "voices", "qc_report.json")))
snr = json.load(open(P("renders", "ep03", "ep03_dialogue_snr.json")))
text = {lid: t for lid, t, _, _ in TL.SUBTITLES}
VOICE = {"arman": "Egor g1G73EpCIdK4HUyDiLYF", "double": "Egor g1G73EpCIdK4HUyDiLYF (pitch ×0.928, formant kept, hall)",
         "mom": "Soldani wlkyM0h4j74QgqHxZi4F", "girl": "Mila Svetlova RxivyypsDodFBfmDDOZF (pitch ×1.07, formant kept)",
         "operator": "Sofia ziugImoL1hGpJBhONQzw (band 160–6500 Hz + short echo)"}
m = dict(
    project="ТЕБЯ ЗДЕСЬ НЕ БЫЛО", episode=3, episode_title=TL.TITLE, language="ru", duration_s=TL.DURATION,
    format=dict(resolution="1080x1920", aspect="9:16", fps="60/1 CFR (every frame drawn at its own time)", video="H.264 High 4.2, 12 Mb/s 2-pass, yuv420p",
                audio="AAC 256k, 48 kHz stereo, -14 LUFS"),
    style_standard=dict(source="final/episode_01_final.mp4 (approved ep. 1 v2)", bible="references/standard/series_standard_bible.png",
                        doc="references/standard/SERIES_STANDARD.md", sheets=sorted("characters/standard/" + f for f in os.listdir(P("characters", "standard"))),
                        identity_test="renders/ep03/ep03_corridor_test.mp4 + references/standard/identity_check_corridor_test.png",
                        new_in_ep3=["Girl v3 (rig2 CONCEPT['girl'], port of characters/girl_reference_sheet.png v1)",
                                    "Stairwell / door 048 (engine/sets3.py, geography of backgrounds/stairwell_048.png v1)",
                                    "Operator (voice + phone UI only)",
                                    "test: renders/ep03/ep03_girl_door_test.mp4 (300 frames, 60/1, 0 duplicates)"],
                        changes_vs_ep1=["Arman's rim locked to blue #8fb8ff in every location (ep. 1 used the scene light colour in the kitchen)",
                                        "Mom redrawn to standard v3 geometry with the same rig (CONCEPT['mom']); ep. 1 design kept as CONCEPT['mom_ep1']"]),
    dialogue=[dict(id=lid, who=L["who"], voice=VOICE[L["who"]], take=L["take"], take_from=L.get("raw", "ep03"), start_s=L["t"], text=text[lid], fx=L["fx"],
                   whisper_heard=vqc[lid]["heard"], whisper_similarity=vqc[lid]["similarity"], speech_band_snr_db=snr[lid])
              for lid, L in TL.LINES.items()],
    shots=[dict(id=s, start=a, end=b, description=d) for s, a, b, d in TL.SHOTS],
    events=TL.EV,
    rebuild=["python3 scripts/ep03_voice_qc.py <whisper_model_dir>", "python3 scripts/ep03_audio.py", "python3 scripts/ep03_snr.py",
             "EP=02 python3 scripts/render.py renders/ep03/ep03_picture_master.mp4", "EP=02 python3 scripts/subtitles.py",
             "EP=02 python3 scripts/finalize.py", "EP=02 python3 scripts/qc.py", "python3 scripts/make_thumbnail_ep03.py",
             "python3 scripts/make_storyboard_ep03.py", "python3 scripts/make_standard_refs.py", "python3 scripts/make_manifest_ep03.py"],
    outputs=dict(final="final/episode_03_final.mp4", no_subtitles="final/episode_03_no_subtitles.mp4", subtitles="final/episode_03_subtitles.srt",
                 thumbnail="final/episode_03_thumbnail.png", storyboard="ep03/storyboard/storyboard.md", storyboard_sheet="ep03/storyboard/storyboard_sheet.png", girl_test="renders/ep03/ep03_girl_door_test.mp4",
                 score="music/ep03_score.wav", mix_premaster="renders/ep03/ep03_mix_premaster.wav", stems="renders/ep03/stems/",
                 voices_raw="ep03/voices/raw/", voices_processed="ep03/voices/processed/", lipsync="ep03/compositions/lipsync.json"),
    qc=qc,
)
json.dump(m, open(P("ep03", "episode_03_manifest.json"), "w"), ensure_ascii=False, indent=1)
print("manifest ok")
