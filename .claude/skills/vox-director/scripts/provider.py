#!/usr/bin/env python3
"""
Provider abstraction — the pluggable media backend the pipeline stages talk to.

Atlas Cloud is the default and, for now, the only backend. Stages call a Provider
(submit_image/video/audio, remove_bg, get_status, upload, download) instead of a
concrete client, so adding a backend is: subclass Provider + one registry entry.
Pick a backend per project with beats.json `{"provider": "atlas_cloud"}` (default).

The layer is a thin in-process wrapper — zero extra network hops, so it does NOT
slow the pipeline; the only cost is the API latency, which is unchanged.
"""
import time
from abc import ABC, abstractmethod

import atlas_cloud


class ProviderError(RuntimeError):
    pass


class Provider(ABC):
    """The surface the stages need. get_status normalizes every backend's polling
    response to {status: pending|completed|failed, output: <url|None>, error}."""
    name = "base"

    @abstractmethod
    def submit_image(self, model, prompt, **params): ...
    @abstractmethod
    def submit_video(self, model, prompt, **params): ...
    @abstractmethod
    def submit_audio(self, model, **params): ...
    @abstractmethod
    def remove_bg(self, model, image_url, **params):
        body = {"model": model, "image": image_url, **params}
        return atlas_cloud._task_id(atlas_cloud._post("/model/generateImage", body),
                                    "/model/generateImage")

    def get_status(self, job_id):
        """Normalized status. A failed POLL is never reported as a failed JOB:
        transport errors -> "unknown" (keep polling, never resubmit); a job id the
        server does not know -> "lost"; 401/403 -> AtlasAuthError is raised."""
        try:
            resp = atlas_cloud._get(f"/model/prediction/{job_id}")
        except atlas_cloud.AtlasAuthError:
            raise
        except atlas_cloud.AtlasCloudError as e:
            return {"status": "unknown", "output": None, "error": str(e)}
        d = resp.get("data") if isinstance(resp, dict) else None
        if not isinstance(d, dict) or not d:
            if isinstance(resp, dict) and resp.get("code") == 404:
                return {"status": "lost", "output": None, "error": "prediction not found on server"}
            return {"status": "unknown", "output": None,
                    "error": f"unexpected status answer {str(resp)[:200]}"}
        st = d.get("status")
        if st in ("completed", "succeeded"):
            out = d.get("outputs") or d.get("output")
            out = out[0] if isinstance(out, list) and out else out
            if not out:
                return {"status": "failed", "output": None, "error": "completed but no output"}
            return {"status": "completed", "output": out, "error": None}
        if st == "failed":
            return {"status": "failed", "output": None,
                    "error": str(d.get("error") or d.get("error_code") or "failed")}
        return {"status": "pending", "output": None, "error": None}

    def upload(self, path): ...
    @abstractmethod
    def download(self, url, dest): ...


class AtlasCloudProvider(Provider):
    """Wraps the atlas_cloud client — identical behavior to calling it directly."""
    name = "atlas_cloud"

    def submit_image(self, model, prompt, **params):
        return atlas_cloud.submit_image(model, prompt, **params)

    def submit_video(self, model, prompt, **params):
        return atlas_cloud.submit_video(model, prompt, **params)

    def submit_audio(self, model, **params):
        return atlas_cloud.submit_media(model, **params)

    def remove_bg(self, model, image_url, **params):
        body = {"model": model, "image": image_url, **params}
        return atlas_cloud._post("/model/generateImage", body)["data"]["id"]

    def get_status(self, job_id):
        try:
            d = atlas_cloud._get(f"/model/prediction/{job_id}").get("data", {})
        except atlas_cloud.AtlasCloudError as e:
            return {"status": "failed", "output": None, "error": str(e)}
        st = d.get("status")
        if st in ("completed", "succeeded"):
            out = d.get("outputs") or d.get("output")
            out = out[0] if isinstance(out, list) else out
            return {"status": "completed", "output": out, "error": None}
        if st == "failed":
            return {"status": "failed", "output": None, "error": d.get("error", "")}
        return {"status": "pending", "output": None, "error": None}

    def upload(self, path):
        return atlas_cloud.upload(path)

    def download(self, url, dest):
        return atlas_cloud.download(url, dest)


_REGISTRY = {"atlas_cloud": AtlasCloudProvider}


def get_provider(name=None):
    """Return a Provider instance by name (default 'atlas_cloud')."""
    name = (name or "atlas_cloud").lower()
    if name not in _REGISTRY:
        raise ProviderError(f"unknown provider '{name}'; available: {list(_REGISTRY)}")
    return _REGISTRY[name]()


# Failure text -> class. Moderation/API refusals are never retried automatically;
# only clearly temporary failures get (at most) one resubmit; anything unrecognised
# is NOT retried within a run (a deliberate re-run of the stage may try again).
REJECT_HINTS = ("policy", "moderat", "safety", "sensitive", "nsfw", "inappropriate", "prohibit",
                "violat", "content", "invalid", "not allowed", "reject", "forbidden", "copyright",
                "celebrit", "real person", "parameter", "unsupported", "bad request")
TRANSIENT_HINTS = ("timeout", "timed out", "temporar", "try again", "overload", "busy",
                   "capacity", "unavailable", "internal error", "internal server", "rate limit",
                   "502", "503", "504")


def classify_failure(error):
    e = (error or "").lower()
    if any(h in e for h in REJECT_HINTS):
        return "rejected"
    if any(h in e for h in TRANSIENT_HINTS):
        return "transient"
    return "failed"


def run_jobs(prov, specs, *, poll_s=3, stall_s=90, max_retries=1, deadline_s=900,
             existing=None, on_event=None):
    """Submit + poll a batch of paid jobs without ever paying twice by accident.

    specs:    key -> submit() callable returning a job id.
    existing: key -> job id already submitted earlier (e.g. recorded in beats.json):
              its status is checked first and it is polled, never resubmitted.
    on_event: callback(key, event, info), called the moment something happens so the
              caller can persist it: "submitting"(None, BEFORE the paid POST), "submitted"
              (job id), "completed"(output url), "rejected"/"failed"/"not_accepted"/"lost"
              (error), "submit_unknown"(error), "timeout"(job id).

    Rules: a job that is still running is never resubmitted (`stall_s` only prints a
    notice); a job rejected by the API/moderation is never resubmitted; a submit whose
    outcome is unknown (timeout/reset/5xx) is never resent; at most ONE resubmit
    (max_retries is capped at 1) and only for a clearly temporary failure.
    401/403/402 raise immediately (STOP_ERRORS; the item is reported "not_accepted").
    Returns key -> output URL (or None), as before.
    """
    from atlas_cloud import STOP_ERRORS, AtlasRejected, AtlasTransient
    max_retries = min(int(max_retries), 1)
    existing = dict(existing or {})
    emit = on_event or (lambda k, e, i: None)
    st, done = {}, {}

    def submit(key):
        """Submit once (+1 resend only if the request was provably not accepted)."""
        for attempt in (0, 1):
            emit(key, "submitting", None)            # persisted BEFORE money can be spent
            try:
                pid = specs[key]()
            except STOP_ERRORS as e:
                emit(key, "not_accepted", str(e))
                raise
            except AtlasTransient as e:
                if attempt == 0 and max_retries:
                    print(f"[{key}] not accepted ({e}); resending once")
                    time.sleep(3)
                    continue
                done[key] = None
                emit(key, "not_accepted", f"not accepted: {e}")
                print(f"[{key}] FAILED to submit: {e}")
                return
            except AtlasRejected as e:
                done[key] = None
                emit(key, "rejected", str(e))
                print(f"[{key}] REJECTED by API (not retried): {str(e)[:200]}")
                return
            except Exception as e:                   # unknown outcome: a task may exist
                done[key] = None
                emit(key, "submit_unknown", f"{type(e).__name__}: {e}")
                print(f"[{key}] SUBMIT OUTCOME UNKNOWN (not resent, may be billed): {e}")
                return
            st[key] = {"pid": pid, "t": time.time(), "tries": 0, "noted": False}
            emit(key, "submitted", pid)
            print(f"[{key}] submitted {pid}")
            return

    for key, pid in existing.items():                 # resume: check status before anything
        st[key] = {"pid": pid, "t": time.time(), "tries": 1, "noted": False}
        print(f"[{key}] resuming existing job {pid} (not resubmitting)")
    for key in specs:
        if key not in existing:
            submit(key)

    keys = list(existing) + [k for k in specs if k not in existing]
    deadline = time.time() + deadline_s
    first = True
    while any(k not in done for k in keys) and time.time() < deadline:
        if not (first and existing):
            time.sleep(poll_s)
        first = False
        now = time.time()
        for key in keys:
            if key in done or key not in st:
                continue
            s = st[key]
            r = prov.get_status(s["pid"])
            status = r["status"]
            if status == "completed":
                done[key] = r["output"]
                emit(key, "completed", r["output"])
                print(f"[{key}] done")
            elif status == "lost":                   # id unknown to the server: cannot verify
                done[key] = None
                emit(key, "lost", r.get("error") or "prediction not found")
                print(f"[{key}] LOST: server does not know job {s['pid']} (not resubmitted)")
            elif status == "failed":
                cls = classify_failure(r.get("error"))
                if cls == "transient" and s["tries"] < max_retries and key in specs:
                    s["tries"] += 1
                    print(f"[{key}] temporary failure ({(r.get('error') or '')[:100]}) -> one resubmit")
                    del st[key]
                    submit(key)
                    if key in st:
                        st[key]["tries"] = s["tries"]          # the one retry is now used
                    continue
                cls = "rejected" if cls == "rejected" else "failed"   # failed tasks are not billed
                done[key] = None
                emit(key, cls, r.get("error") or status)
                print(f"[{key}] {cls.upper()} (not retried): {(r.get('error') or status)[:160]}")
            else:                                     # pending / unknown poll: keep waiting
                if not s["noted"] and now - s["t"] > stall_s:
                    s["noted"] = True
                    print(f"[{key}] still running after {int(stall_s)}s - waiting (no resubmit)")
    for key in keys:
        if key not in done:
            done[key] = None
            if key in st:
                emit(key, "timeout", st[key]["pid"])
                print(f"[{key}] still running at deadline; job {st[key]['pid']} kept - "
                      f"re-run this stage later to collect it (no new charge)")
    return done


# ---------------------------------------------------------------- crash-safe stage runner

class PaidItem:
    """One paid output of a stage (a keyframe, a clip, a narration, the BGM).

    rec[field] holds the item's job record; `apply(url, dest)` writes the output
    fields (keyframe_url/path, clip_path, narration_audio, ...) onto the project doc
    and is called only after the file has been downloaded AND verified."""
    def __init__(self, key, rec, field, signature, submit, dest, apply):
        self.key, self.rec, self.field, self.sig = key, rec, field, signature
        self.submit, self.dest, self.apply = submit, dest, apply


def run_paid_items(prov, items, save, *, poll_s=3, stall_s=90, deadline_s=900, force=()):
    """Run a stage's paid items so that a crash or API failure never loses or
    re-buys a result. Every event is written to the item's job record and `save()`
    (atomic beats.json write) is called immediately -- i.e. after each single item.

    `force`: keys to submit anew even if a record exists (explicit --redo).
    Returns {"done": [...], "failed": [...], "blocked": [...], "pending": [...],
    "urls": {key: output url}, "status": {key: final status}}.
    401/403/402 (STOP_ERRORS) re-raise after saving."""
    from datetime import datetime, timezone
    from project_io import plan, blocked_hint
    now = lambda: datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
    by_key = {it.key: it for it in items}
    specs, existing, downloads = {}, {}, []
    summary = {"done": [], "failed": [], "blocked": [], "pending": [], "urls": {}, "status": {}}
    force = set(force or ())

    def record(it, fresh=False, **kw):
        old = dict(it.rec.get(it.field) or {})
        job = old
        if fresh or old.get("sig") != it.sig:
            job = {"sig": it.sig}
            if old.get("id") or old.get("status") in ("submit_unknown", "submitting", "lost"):
                job["superseded"] = {k: old.get(k) for k in ("id", "status", "sig", "at", "error")
                                     if old.get(k) is not None}  # evidence of a possibly-paid task
        job.update(kw, at=now())
        it.rec[it.field] = job
        summary["status"][it.key] = job.get("status")
        save()

    def collect(it, url):
        """Download + verify + apply; on failure keep the output url for a free retry.
        If the stored url is dead, ask the job (free GET) once for a fresh one."""
        if it.dest is None:                         # caller downloads (helper modes)
            it.apply(url, None)
            record(it, status="done", output=url, error=None)
            summary["done"].append(it.key); summary["urls"][it.key] = url
            return
        err = None
        for attempt in (0, 1):
            try:
                prov.download(url, it.dest)
                err = None
                break
            except Exception as e:
                err = e
                job_id = (it.rec.get(it.field) or {}).get("id")
                if attempt or not job_id:
                    break
                try:
                    r = prov.get_status(job_id)
                except Exception:
                    break
                if r.get("status") != "completed" or not r.get("output") or r["output"] == url:
                    break
                print(f"[{it.key}] stored output url failed; job {job_id} gave a fresh url")
                url = r["output"]
        if err is not None:
            dead = any(f"HTTP {c}" in str(err) for c in ("403", "404", "410"))
            st = "output_expired" if dead else "download_failed"
            record(it, status=st, output=url, error=str(err)[:300])
            summary["failed"].append(it.key)
            print(f"[{it.key}] DOWNLOAD FAILED: {err}\n    " + (
                f"the PAID output is not downloadable now (expired or not yet available). "
                f"Re-runs retry the free download only; it is never regenerated "
                f"automatically. To pay for a new one, delete \"{it.field}\" from the record."
                if dead else "output url kept; re-run retries the download for free"))
            return
        it.apply(url, it.dest)
        record(it, status="done", output=url, error=None)
        summary["done"].append(it.key); summary["urls"][it.key] = url
        print(f"[{it.key}] saved {it.dest}")

    for it in items:
        job = it.rec.get(it.field)
        action, info = plan(job, it.sig)
        if it.key in force:
            if action in ("resume", "blocked"):
                print(f"[{it.key}] WARNING: forced redo although the previous job is "
                      f"'{(job or {}).get('status')}' - it may still be billed")
            action = "submit"
            record(it, fresh=True, status="forced")
        if action == "blocked":
            summary["blocked"].append(it.key)
            summary["status"][it.key] = (job or {}).get("status")
            print(f"[{it.key}] SKIPPED, not resubmitted ({info}); {blocked_hint(it.field, job)}")
        elif action == "download":
            downloads.append((it, info))
        elif action == "resume":
            existing[it.key] = info
            specs[it.key] = it.submit
        else:
            specs[it.key] = it.submit

    for it, url in downloads:                      # finished earlier, never saved: free
        print(f"[{it.key}] job already completed earlier -> downloading saved output")
        collect(it, url)

    def on_event(key, event, info):
        it = by_key[key]
        if event == "submitting":
            record(it, status="submitting", id=None, output=None, error=None)
        elif event == "submitted":
            record(it, id=info, status="submitted", error=None)
        elif event == "completed":
            collect(it, info)
        elif event == "timeout":
            record(it, status="timeout")
            summary["pending"].append(key)
        else:                                       # rejected | failed | submit_unknown
            record(it, status=event, error=str(info)[:300])
            (summary["blocked"] if event in ("rejected", "submit_unknown", "lost")
             else summary["failed"]).append(key)

    if specs:
        try:
            run_jobs(prov, specs, poll_s=poll_s, stall_s=stall_s, max_retries=1,
                     deadline_s=deadline_s, existing=existing, on_event=on_event)
        finally:
            save()
    return summary


def run_jobs_ledger(prov, specs, sigs, ledger, *, force=(), status_out=None,
                    poll_s=3, stall_s=90, deadline_s=900, **_ignored):
    """Drop-in for run_jobs() in helper modes: same `specs` and the same return value
    (key -> output url | None), but every job is recorded in a project_io.Ledger (the
    "submitting" marker before the POST, then the id) so a crash, a deadline or an
    unknown submit outcome never leads to a second paid task on the next run, and a
    finished job's output is returned again without resubmitting. `sigs` (key ->
    signature of the stable inputs) decides when a record is stale."""
    items = [PaidItem(k, ledger.rec(k), "job", sigs[k], specs[k], None, lambda u, d: None)
             for k in specs]
    summary = run_paid_items(prov, items, ledger.save, poll_s=poll_s, stall_s=stall_s,
                             deadline_s=deadline_s, force=force)
    if status_out is not None:
        status_out.update({k: (ledger.rec(k).get("job") or {}).get("status") for k in specs})
    return {k: summary["urls"].get(k) for k in specs}


def print_summary(stage, summary, skipped):
    print(f"\n[{stage}] reused {len(skipped)} | new {len(summary['done'])} | "
          f"failed {len(summary['failed'])} | blocked {len(summary['blocked'])} | "
          f"still running {len(summary['pending'])}")
    for k in ("failed", "blocked", "pending"):
        if summary[k]:
            print(f"  {k}: {', '.join(summary[k])}")
    if summary["failed"] or summary["pending"]:
        print("  Re-run this stage to continue: finished items are reused, running jobs "
              "are resumed, nothing already paid for is bought again.")
