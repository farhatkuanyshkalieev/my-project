#!/usr/bin/env python3
"""
Crash-safe project state for vox-director (no network, stdlib + ffprobe only).

  * atomic_write_json  - beats.json is written to a temp file, fsync'ed, then
                         os.replace'd, so a crash never leaves a half-written file.
  * check_media        - is a downloaded/generated file really a usable image /
                         video / audio file (not an HTML/XML/JSON error page)?
  * job records        - every paid job is recorded in beats.json the moment it is
                         submitted ({"id", "status", "sig", ...}). A re-run polls that
                         job instead of paying for a new one, re-downloads a finished
                         output instead of regenerating it, and refuses to resubmit a
                         prompt the API already rejected or whose submit outcome is
                         unknown. To force a regeneration, delete the item's `*_job`
                         record (and its output path) from beats.json.
"""
import hashlib
import json
import os
import subprocess
import tempfile

IMAGE_EXT = {".jpg", ".jpeg", ".png", ".webp"}
VIDEO_EXT = {".mp4", ".mov", ".m4v", ".webm"}
AUDIO_EXT = {".mp3", ".wav", ".m4a", ".aac", ".ogg", ".flac"}
MIN_BYTES = {"image": 1024, "video": 4096, "audio": 1024, None: 1}


# ------------------------------------------------------------------ json

def atomic_write_json(path, doc):
    """Write JSON atomically: temp file in the same dir -> fsync -> os.replace."""
    d = os.path.dirname(os.path.abspath(path)) or "."
    fd, tmp = tempfile.mkstemp(prefix=".beats.", suffix=".tmp", dir=d)
    try:
        with os.fdopen(fd, "w", encoding="utf-8") as f:
            json.dump(doc, f, ensure_ascii=False, indent=2)
            f.flush()
            os.fsync(f.fileno())
        os.replace(tmp, path)
    except BaseException:
        try:
            os.unlink(tmp)
        except OSError:
            pass
        raise


# ------------------------------------------------------------------ media checks

def media_kind(path):
    ext = os.path.splitext(path)[1].lower()
    if ext in IMAGE_EXT:
        return "image"
    if ext in VIDEO_EXT:
        return "video"
    if ext in AUDIO_EXT:
        return "audio"
    return None


def _sniff(head):
    """Kind of content from its first bytes: image|video|audio|error-doc|None."""
    if head[:3] == b"\xff\xd8\xff" or head[:8] == b"\x89PNG\r\n\x1a\n" or \
            (head[:4] == b"RIFF" and head[8:12] == b"WEBP") or head[:6] in (b"GIF87a", b"GIF89a"):
        return "image"
    if head[4:8] == b"ftyp":
        brand = head[8:12]
        return "audio" if brand in (b"M4A ", b"M4B ") else "video"
    if head[:4] == b"\x1a\x45\xdf\xa3":
        return "video"                                   # webm / matroska
    if head[:3] == b"ID3" or (len(head) > 1 and head[0] == 0xFF and (head[1] & 0xE0) == 0xE0) or \
            (head[:4] == b"RIFF" and head[8:12] == b"WAVE") or head[:4] in (b"OggS", b"fLaC"):
        return "audio"
    stripped = head.lstrip()
    if stripped[:1] in (b"<", b"{", b"["):
        return "error-doc"                               # XML / HTML / JSON error body
    return None


def _ffprobe_duration(path):
    try:
        out = subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration",
                              "-of", "csv=p=0", path], capture_output=True, text=True,
                             timeout=60).stdout.strip()
        return float(out)
    except (ValueError, OSError, subprocess.SubprocessError):
        return 0.0


def check_media(path, kind=None, probe=True):
    """(ok, reason). `kind` defaults to the one implied by the file extension.
    Checks: exists, minimum size, magic bytes match the kind, not an error page,
    and (video/audio, probe=True) ffprobe reads a positive duration."""
    if not path:
        return False, "no path recorded"
    if not os.path.isfile(path):
        return False, f"file not found: {path}"
    kind = kind or media_kind(path)
    size = os.path.getsize(path)
    with open(path, "rb") as f:
        head = f.read(64)
    got = _sniff(head)
    if got == "error-doc":
        snippet = head.decode("utf-8", "replace").strip().replace("\n", " ")[:80]
        return False, f"file is an error document, not media ({snippet!r}): {path}"
    if size < MIN_BYTES.get(kind, 1):
        return False, f"file too small ({size} bytes): {path}"
    if kind and got != kind:
        return False, f"expected {kind} data, found {got or 'unknown format'}: {path}"
    if probe and kind in ("video", "audio") and _ffprobe_duration(path) <= 0:
        return False, f"ffprobe cannot read a duration (corrupt/truncated?): {path}"
    return True, "ok"


def valid(path, kind=None):
    return check_media(path, kind)[0]


# ------------------------------------------------------------------ job records

def sig(*parts):
    """Short stable signature of what a paid job was asked to do (model+prompt+params).
    If the inputs change (new narration text, new keyframe, new voice), the
    signature changes and the item is regenerated; otherwise it is reused."""
    blob = json.dumps(parts, sort_keys=True, ensure_ascii=False, default=str)
    return hashlib.sha256(blob.encode("utf-8")).hexdigest()[:16]


def plan(job, signature):
    """Decide what to do with an item that has no valid output yet, from its job record.

    Returns (action, info):
      "submit"   - nothing usable recorded: a new (paid) job may be submitted
      "resume"   - job id still pending/unknown: poll it, do NOT submit a new one
      "download" - job completed but its output was never saved: re-download only
      "blocked"  - API rejected this exact request, or the submit outcome is unknown:
                   never auto-resubmit (change the inputs or delete the job record)
    Any record for a DIFFERENT signature is stale (inputs changed) -> "submit".
    """
    if not job or job.get("sig") != signature:
        return "submit", None
    st = job.get("status")
    if st in ("submitted", "pending", "poll_error", "timeout") and job.get("id"):
        return "resume", job["id"]
    if st in ("completed", "download_failed") and job.get("output"):
        return "download", job["output"]
    if st in ("rejected", "submit_unknown"):
        return "blocked", f"{st}: {job.get('error', '')}"[:300]
    return "submit", None          # failed (unclassified) / done-without-file -> user re-ran


def blocked_hint(field):
    return (f"to try again on purpose, change the inputs or delete \"{field}\" from beats.json")
