"""Per-episode file locations, selected with the EP environment variable (default 01).
Ep. 1 keeps its original top-level layout; later episodes live under epNN/ and renders/epNN/."""
import importlib, os

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
EP = os.environ.get("EP", "01")
P = lambda *a: os.path.join(ROOT, *a)
TL = importlib.import_module(f"ep{EP}_timeline")

if EP == "01":
    LIPS = P("compositions", "lipsync.json")
    SUBS = P("subtitles")
    RENDERS = P("renders")
    QC_REPORT = P("final", "qc_report.json")
else:
    LIPS = P(f"ep{EP}", "compositions", "lipsync.json")
    SUBS = P(f"ep{EP}", "subtitles")
    RENDERS = P("renders", f"ep{EP}")
    QC_REPORT = P("final", f"episode_{EP}_qc_report.json")
PIC = os.path.join(RENDERS, f"ep{EP}_picture_master.mp4")
MIX = os.path.join(RENDERS, f"ep{EP}_mix_premaster.wav")
MIX_MASTER = os.path.join(RENDERS, f"ep{EP}_mix_master.wav")
SRT = os.path.join(SUBS, f"episode_{EP}_subtitles.srt")
FINAL = P("final", f"episode_{EP}_final.mp4")
FINAL_NOSUB = P("final", f"episode_{EP}_no_subtitles.mp4")
