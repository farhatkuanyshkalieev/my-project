#!/usr/bin/env python3
"""
Atlas Cloud API client for vox-director.

Thin, dependency-free wrapper around the Atlas Cloud Media Generation API
(image / video / upload) plus the OpenAI-compatible LLM endpoint.

Hard-won gotchas baked in:
  1. Every request MUST send a real User-Agent header — the default urllib UA
     is blocked by the WAF and returns 403 Forbidden.
  2. Generated assets live on OSS behind the user's local proxy; python's
     urlretrieve dies with "Remote end closed connection". Download via curl.
  3. POST generation calls are NOT retried (they create billable tasks).
     GET polls are safe to retry. A failed POST raises a typed error so callers
     know whether resending is safe:
       AtlasAuthError       401/403            -> fix auth; nothing was created
       AtlasRejected        other 4xx          -> the API refused the request (bad
                                                 params / moderation); do not resend
       AtlasTransient       429/503, DNS/refused connect -> request not accepted;
                                                 one resend is safe
       AtlasUnknownOutcome  timeout / reset / 5xx after sending -> a billable task
                                                 MAY exist; never resend automatically
  4. download() checks the HTTP status, size and file signature, writes to a
     temp file and only then renames it into place -- an error page is never
     saved as .jpg/.mp4/.mp3.

Auth (either one works):
  * ATLASCLOUD_API_KEY in the environment -> sent as "Authorization: Bearer <key>".
  * No ATLASCLOUD_API_KEY -> requests go out WITHOUT an Authorization header, so an
    egress proxy that injects credentials (e.g. a Claude Code cloud "network secret"
    bound to api.atlascloud.ai) can add the Bearer token itself.
  Check which one is active, for free:  python3 atlas_cloud.py   (see auth_check()).
  The key is never printed, logged, written to disk or put on a command line.
"""
import json
import os
import subprocess
import time
import urllib.request
import urllib.error

MEDIA_BASE = "https://api.atlascloud.ai/api/v1"
LLM_BASE = "https://api.atlascloud.ai/v1"
UA = "vox-director/0.1 (+https://atlascloud.ai)"


class AtlasCloudError(RuntimeError):
    pass


class AtlasRejected(AtlasCloudError):
    """The API answered and refused the request (4xx). Not retriable as-is."""


class AtlasAuthError(AtlasRejected):
    """401/403: not authenticated. Nothing was created."""


class AtlasTransient(AtlasCloudError):
    """The request was not accepted (429/503 or the connection never opened). Safe to resend once."""


class AtlasUnknownOutcome(AtlasCloudError):
    """Sent, but no usable answer (timeout/reset/5xx). A billable task may exist: never resend.
    Atlas Cloud has no task-list/history endpoint and no client idempotency key (docs,
    2026-11-03), so such a task cannot be looked up automatically; the X-Request-ID (when
    any answer arrived) is kept in the message for Atlas support."""


class AtlasPaymentRequired(AtlasCloudError):
    """402: insufficient balance / plan allowance. Nothing was created; stop and top up."""


STOP_ERRORS = (AtlasAuthError, AtlasPaymentRequired)   # stop the whole stage, retry later


AUTH_HINT = ("Atlas Cloud rejected the request as unauthenticated (401). Either export "
             "ATLASCLOUD_API_KEY (https://www.atlascloud.ai/console/api-keys) or add a "
             "network secret for api.atlascloud.ai (header Authorization, prefix Bearer).")


def _key():
    """The API key from ATLASCLOUD_API_KEY, or None when it is not set.

    None is not an error: the request is then sent without an Authorization header so
    a credential-injecting proxy (network secret) can supply the Bearer token.
    """
    return os.environ.get("ATLASCLOUD_API_KEY") or None


def _auth_headers() -> dict:
    """{"Authorization": "Bearer <key>"} if a key is set locally, else {}."""
    k = _key()
    return {"Authorization": f"Bearer {k}"} if k else {}


def _headers(json_body: bool = True) -> dict:
    h = {"User-Agent": UA, **_auth_headers()}
    if json_body:
        h["Content-Type"] = "application/json"
    return h


def _not_connected(reason) -> bool:
    """True if the connection was never established (so the request was never sent)."""
    import socket
    return isinstance(reason, (socket.gaierror, ConnectionRefusedError))


def _post(path: str, payload: dict, base: str = MEDIA_BASE, timeout: int = 60) -> dict:
    req = urllib.request.Request(base + path, data=json.dumps(payload).encode(),
                                 headers=_headers(), method="POST")
    try:
        with urllib.request.urlopen(req, timeout=timeout) as r:
            body = r.read()
    except urllib.error.HTTPError as e:
        body = e.read().decode(errors="replace")
        rid = (e.headers.get("X-Request-ID") if e.headers else None) or ""
        if not rid:
            try:
                rid = json.loads(body).get("request_id") or ""
            except (ValueError, AttributeError):
                rid = ""
        msg = f"POST {path} -> {e.code}: {body[:400]}" + (f" [X-Request-ID {rid}]" if rid else "")
        if e.code in (401, 403):
            raise AtlasAuthError(f"{msg} {AUTH_HINT}") from e
        if e.code == 402:
            raise AtlasPaymentRequired(f"{msg} - insufficient balance; top up, then re-run") from e
        if e.code in (429, 503):
            raise AtlasTransient(msg) from e
        if 400 <= e.code < 500:
            raise AtlasRejected(msg) from e
        raise AtlasUnknownOutcome(msg) from e               # 5xx: may or may not exist
    except urllib.error.URLError as e:
        if _not_connected(e.reason):
            raise AtlasTransient(f"POST {path}: could not connect ({e.reason})") from e
        raise AtlasUnknownOutcome(f"POST {path}: no answer ({e.reason})") from e
    except (TimeoutError, ConnectionError, OSError) as e:
        raise AtlasUnknownOutcome(f"POST {path}: no answer ({e})") from e
    try:
        return json.loads(body)
    except ValueError as e:
        raise AtlasUnknownOutcome(f"POST {path}: unreadable answer {body[:200]!r}") from e


def _get(path: str, base: str = MEDIA_BASE, timeout: int = 60, retries: int = 3) -> dict:
    last = None
    for i in range(retries):
        try:
            req = urllib.request.Request(base + path, headers=_headers(json_body=False))
            with urllib.request.urlopen(req, timeout=timeout) as r:
                return json.load(r)
        except urllib.error.HTTPError as e:
            # A prediction that failed upstream (e.g. a content-policy rejection) can
            # come back wrapped in a non-2xx status, but the body is still the normal
            # JSON envelope with the real status/error_code -- `except URLError` below
            # would catch this too (HTTPError subclasses it) but collapses it to a bare
            # "HTTP Error 400: Bad Request" and throws the diagnosis away. Parse it and
            # hand it back like any other response so callers see the real status.
            body = e.read().decode(errors="replace")
            if e.code in (401, 403):
                raise AtlasAuthError(f"GET {path} -> {e.code}: {body[:200]} {AUTH_HINT}") from e
            try:
                return json.loads(body)
            except ValueError:
                last = AtlasCloudError(f"GET {path} -> {e.code}: {body[:400]}")
                break
        except (urllib.error.URLError, TimeoutError) as e:  # transient
            last = e
            time.sleep(2 ** i)
    raise AtlasCloudError(f"GET {path} failed after {retries} tries: {last}")


# ---------------------------------------------------------------- generation

def _task_id(resp: dict, path: str) -> str:
    """Prediction id from a submit answer. A 200 answer without an id is either an
    in-band refusal (JSON code 4xx -> AtlasRejected) or unreadable (-> unknown outcome)."""
    data = resp.get("data") if isinstance(resp, dict) else None
    if isinstance(data, dict) and data.get("id"):
        return data["id"]
    code = resp.get("code") if isinstance(resp, dict) else None
    msg = f"POST {path}: no task id in answer {json.dumps(resp, ensure_ascii=False)[:300]}"
    if isinstance(code, int) and (400 <= code < 500 or 40000 <= code < 50000):
        if code in (401, 403):
            raise AtlasAuthError(f"{msg} {AUTH_HINT}")
        raise AtlasRejected(msg)
    raise AtlasUnknownOutcome(msg)


def submit_image(model: str, prompt: str, **params) -> str:
    """Submit an image generation task; return prediction id."""
    body = {"model": model, "prompt": prompt, **params}
    return _task_id(_post("/model/generateImage", body), "/model/generateImage")


def submit_video(model: str, prompt: str, **params) -> str:
    """Submit a video generation task; return prediction id.

    For image-to-video pass image="<url>"; for reference-to-video pass the model's own
    keys: Kling takes images=["<url>", ...] (1-5 refs); Seedance 2.0 takes
    reference_images=[...] and reference_audios=[...] (see references/host-mode.md).
    """
    body = {"model": model, "prompt": prompt, **params}
    return _task_id(_post("/model/generateVideo", body), "/model/generateVideo")


def submit_media(model: str, **params) -> str:
    """Submit any media task that runs through the generateVideo endpoint
    (audio/TTS, music, etc.); return prediction id."""
    body = {"model": model, **params}
    return _task_id(_post("/model/generateVideo", body), "/model/generateVideo")


def transcribe(audio_url: str, interval: int = 3, timeout_s: int = 300, job_id: str = None,
               on_submitted=None, **params) -> dict:
    """Blocking ASR via xai/stt-v1. Returns the full stt_result: {"text", "language",
    "duration", "words": [{"text","start","end"}, ...]} (word-level timestamps).

    Submits to /model/generateAudio (the model's real endpoint per its schema),
    NOT /model/generateVideo like submit_media -- and polls for the raw stt_result
    dict directly rather than going through poll()/get_status(), because those only
    surface outputs[0] (the plain transcript string) and would silently drop the
    word timestamps this exists to fetch.
    """
    if job_id:                       # resume an already-submitted task: no new POST
        pid = job_id
    else:
        body = {"model": "xai/stt-v1", "audio": audio_url, **params}
        pid = _task_id(_post("/model/generateAudio", body), "/model/generateAudio")
        if on_submitted:
            on_submitted(pid)            # caller persists the id before polling
    deadline = time.time() + timeout_s
    while time.time() < deadline:
        time.sleep(interval)
        d = _get(f"/model/prediction/{pid}").get("data", {})
        status = d.get("status", "?")
        if status in ("completed", "succeeded"):
            result = d.get("stt_result")
            if not result:
                raise AtlasCloudError(f"{pid}: completed but no stt_result")
            return result
        if status == "failed":
            raise AtlasCloudError(f"{pid} failed: {json.dumps(d)[:300]}")
    raise AtlasCloudError(f"{pid} timed out after {timeout_s}s")


def poll(prediction_id: str, interval: int = 3, timeout_s: int = 900) -> str:
    """Poll a prediction until done; return the first output URL."""
    deadline = time.time() + timeout_s
    while time.time() < deadline:
        time.sleep(interval)
        d = _get(f"/model/prediction/{prediction_id}").get("data", {})
        status = d.get("status", "?")
        if status in ("completed", "succeeded"):
            out = d.get("outputs") or d.get("output")
            if isinstance(out, str):
                out = [out]
            if not out:
                raise AtlasCloudError(f"{prediction_id}: completed but no output")
            return out[0]
        if status == "failed":
            raise AtlasCloudError(f"{prediction_id} failed: {json.dumps(d)[:300]}")
    raise AtlasCloudError(f"{prediction_id} timed out after {timeout_s}s")


def image(model: str, prompt: str, **params) -> str:
    """Blocking image generation -> output URL."""
    return poll(submit_image(model, prompt, **params), interval=3, timeout_s=180)


def video(model: str, prompt: str, **params) -> str:
    """Blocking video generation -> output URL."""
    return poll(submit_video(model, prompt, **params), interval=4, timeout_s=900)


# ---------------------------------------------------------------- upload / dl

def upload(file_path: str) -> str:
    """Upload a local file, return its public URL. Uses curl (multipart).

    With ATLASCLOUD_API_KEY set, the Authorization header is fed to curl on stdin
    (`-H @-`) so the key never appears in the process list; without it no
    Authorization header is sent and the proxy's network secret supplies it.
    """
    if not os.path.isfile(file_path):
        raise AtlasCloudError(f"upload: no such file: {file_path}")
    args = ["/usr/bin/curl", "-sS", "-X", "POST", f"{MEDIA_BASE}/model/uploadMedia",
            "-H", f"User-Agent: {UA}", "-F", f"file=@{file_path}"]
    auth = _auth_headers()
    stdin = None
    if auth:
        args[1:1] = ["-H", "@-"]
        stdin = "".join(f"{k}: {v}\n" for k, v in auth.items())
    out = subprocess.run(args, input=stdin, capture_output=True, text=True,
                         check=True).stdout
    try:
        resp = json.loads(out)
    except ValueError:
        raise AtlasCloudError(f"upload: non-JSON response: {out[:300]}")
    if resp.get("code") == 401:
        raise AtlasCloudError(f"upload -> 401. {AUTH_HINT}")
    data = resp.get("data") or {}
    url = data.get("download_url") or data.get("url")
    if not url:
        raise AtlasCloudError(f"upload failed: {out[:300]}")
    return url


def download(url: str, dest: str, kind: str = None) -> str:
    """Download `url` to `dest` safely (curl: proxy-safe, urllib breaks on the OSS host).

    The body goes to a temp file next to `dest`; it is moved into place only if the
    HTTP status is 2xx and the content really is the expected media (kind from the
    extension unless given). Otherwise the temp file is deleted, any earlier good
    `dest` is left untouched, and AtlasCloudError explains what came back.
    """
    from project_io import check_media, media_kind
    kind = kind or media_kind(dest)
    os.makedirs(os.path.dirname(os.path.abspath(dest)) or ".", exist_ok=True)
    tmp = f"{dest}.part"
    try:
        r = subprocess.run(["/usr/bin/curl", "-sS", "-L", "--retry", "3", "--retry-delay", "2",
                            "-o", tmp, "-w", "%{http_code}", url],
                           capture_output=True, text=True)
        code = r.stdout.strip()[-3:]
        if r.returncode != 0:
            raise AtlasCloudError(f"download failed (curl exit {r.returncode}: "
                                  f"{r.stderr.strip()[:200]}): {url}")
        if not code.startswith("2"):
            body = ""
            if os.path.exists(tmp):
                with open(tmp, "rb") as f:
                    body = f.read(300).decode("utf-8", "replace").replace("\n", " ")
            raise AtlasCloudError(f"download failed: HTTP {code} for {url} "
                                  f"(expired or missing output?) {body[:160]!r}")
        ok, why = check_media(tmp, kind)
        if not ok:
            raise AtlasCloudError(f"download rejected, not a valid {kind or 'file'}: "
                                  f"{why.replace(tmp, dest)} (from {url})")
        os.replace(tmp, dest)
        return dest
    finally:
        if os.path.exists(tmp):
            os.unlink(tmp)


# ---------------------------------------------------------------- llm

def chat(model: str, messages: list, **params) -> str:
    """OpenAI-compatible chat completion -> assistant text."""
    body = {"model": model, "messages": messages, **params}
    resp = _post("/chat/completions", body, base=LLM_BASE, timeout=120)
    return resp["choices"][0]["message"]["content"]


# ---------------------------------------------------------------- auth check

AUTH_PROBE_ID = "00000000-0000-0000-0000-000000000000"


def auth_check(timeout: int = 20) -> dict:
    """FREE auth probe: GET the status of a prediction id that cannot exist.

    Creates nothing and spends no credits. Returns {"status": <http code>, "ok": bool,
    "source": "env"|"proxy", "msg": <API message>}:
      401           -> not authenticated (no env key and no network secret applied)
      404           -> authenticated; the task simply does not exist (expected)
      anything else -> reached the API but the result is unexpected; inspect msg.
    """
    req = urllib.request.Request(f"{MEDIA_BASE}/model/prediction/{AUTH_PROBE_ID}",
                                 headers=_headers(json_body=False))
    try:
        with urllib.request.urlopen(req, timeout=timeout) as r:
            code, body = r.status, r.read()
    except urllib.error.HTTPError as e:
        code, body = e.code, e.read()
    try:
        msg = json.loads(body).get("msg", "")
    except ValueError:
        msg = body[:120].decode(errors="replace")
    return {"status": code, "ok": code == 404, "msg": msg,
            "source": "env" if _key() else "proxy"}


if __name__ == "__main__":
    # Free smoke test: is auth working? (never prints the key)
    import sys
    r = auth_check()
    src = ("ATLASCLOUD_API_KEY (env)" if r["source"] == "env"
           else "no env key -> relying on proxy / network secret")
    print("auth source:", src)
    verdict = {401: "NOT authenticated", 404: "authenticated (probe task not found, as expected)"}
    print(f"auth check: HTTP {r['status']} {r['msg']!r} -> "
          f"{verdict.get(r['status'], 'unexpected response, inspect it')}")
    if r["status"] == 401:
        print(AUTH_HINT)
    if "--ping" in sys.argv:
        # PAID: generates one image (~$0.08). Only run when the user asked for it.
        url = image("google/nano-banana-2/text-to-image",
                    "a tiny red seal stamp on white paper, minimalist",
                    aspect_ratio="1:1", resolution="1k")
        print("image ok:", url)
    sys.exit(0 if r["ok"] else 1)
