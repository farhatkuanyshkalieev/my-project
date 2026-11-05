"""Places the voice-over take on the v4 timeline and remixes the intro with the voice on top.

    python3 tools/vo.py <voice take: wav/mp3>

The take is one continuous read of timeline.json -> vo.lines. It is split at its pauses into phrases,
each phrase starts at its line's time, effects and music duck under the voice, and the result is
normalised for a voice-led social video. Writes exports/audio/THERMINAL_intro_v4_mix_vo.wav,
exports/audio/stems/07_voice.wav and remuxes exports/THERMINAL_intro_v4_VO_1080x1920.mp4 from the
silent-picture master (no re-render)."""
import json, pathlib, subprocess, sys, wave, re
import numpy as np
from scipy import signal

ROOT = pathlib.Path(__file__).resolve().parent.parent
TL = json.loads((ROOT / 'timeline.json').read_text(encoding='utf-8'))
VO = TL['vo']; SR = TL['audio']['sampleRate']; DUR = TL['duration']


def load(path):
    raw = subprocess.run(['ffmpeg', '-hide_banner', '-loglevel', 'error', '-i', str(path), '-ar', str(SR), '-ac', '2', '-f', 'f32le', '-'], capture_output=True, check=True).stdout
    return np.frombuffer(raw, dtype='<f4').reshape(-1, 2).T.astype(np.float64)


def write24(path, st):
    data = (np.clip(st, -1, 1).T * 8388607).astype('<i4').tobytes()
    with wave.open(str(path), 'wb') as w:
        w.setnchannels(2); w.setsampwidth(3); w.setframerate(SR); w.writeframes(b''.join(data[i:i + 3] for i in range(0, len(data), 4)))


def lufs(path):
    r = subprocess.run(['ffmpeg', '-hide_banner', '-nostats', '-i', str(path), '-af', 'ebur128=peak=true', '-f', 'null', '-'], capture_output=True, text=True).stderr
    return float(re.findall(r'I:\s+(-?[\d.]+) LUFS', r)[-1]), float(re.findall(r'Peak:\s+(-?[\d.]+) dBFS', r)[-1])


def phrases(x, n_want):
    """split a take at its pauses into n_want phrases"""
    m = x.mean(0); hop = int(0.01 * SR)
    e = np.sqrt(np.convolve(m ** 2, np.ones(hop * 2) / (hop * 2), 'same'))[::hop]
    on = e > e.max() * 10 ** (-38 / 20)
    segs = []; i = 0
    while i < len(on):
        if on[i]:
            j = i
            while j < len(on) and on[j]: j += 1
            segs.append([i, j]); i = j
        else: i += 1
    # merge segments separated by short gaps (inside a phrase) until n_want remain
    while len(segs) > n_want:
        gaps = [segs[k + 1][0] - segs[k][1] for k in range(len(segs) - 1)]
        k = int(np.argmin(gaps)); segs[k][1] = segs[k + 1][1]; del segs[k + 1]
    if len(segs) != n_want:
        raise SystemExit(f'take has {len(segs)} phrases, expected {n_want}')
    pad = int(0.04 * SR)
    return [x[:, max(0, a * hop - pad): min(x.shape[1], b * hop + pad)] for a, b in segs]


take = load(sys.argv[1])
take = signal.sosfilt(signal.butter(2, 75 / (SR / 2), 'high', output='sos'), take)
parts = phrases(take, len(VO['lines']))
N = int((DUR + TL['audio']['tail']) * SR)
voice = np.zeros((2, N))
for (ln, p) in zip(VO['lines'], parts):
    f = int(0.012 * SR); p = p.copy(); p[:, :f] *= np.linspace(0, 1, f); p[:, -f:] *= np.linspace(1, 0, f)
    i = int(ln['t'] * SR); end = min(N, i + p.shape[1]); voice[:, i:end] += p[:, :end - i]
    nxt = [l['t'] for l in VO['lines'] if l['t'] > ln['t']]
    over = (ln['t'] + p.shape[1] / SR) - (nxt[0] if nxt else DUR)
    print(f'{ln["t"]:5.2f}s  {p.shape[1] / SR:4.2f}s  «{ln["text"]}»' + (f'   !! заходит на следующую фразу на {over:.2f} s' if over > 0 else ''))
# gentle compression on the voice for clarity
env = np.sqrt(np.convolve((voice ** 2).mean(0), np.ones(int(0.02 * SR)) / int(0.02 * SR), 'same')) + 1e-9
thr = np.percentile(env[env > env.max() * 0.05], 70) if (env > env.max() * 0.05).any() else env.max()
gain = np.where(env > thr, (thr / env) ** 0.5, 1.0)
voice *= gain
# duck the existing mix (music + sound effects) under the voice
bed = load(ROOT / 'exports/audio/THERMINAL_intro_v4_mix_tail.wav')[:, :N]
bed = np.pad(bed, ((0, 0), (0, N - bed.shape[1])))
act = (np.sqrt(np.convolve((voice ** 2).mean(0), np.ones(int(0.03 * SR)) / int(0.03 * SR), 'same')) > env.max() * 0.03).astype(float)
att, rel = int(0.03 * SR), int(0.25 * SR)
sm = np.zeros(N); a = 0.0
ka, kr = 1 - np.exp(-1 / att), 1 - np.exp(-1 / rel)
for i in range(N):
    a += (act[i] - a) * (ka if act[i] > a else kr); sm[i] = a
duck = 10 ** (VO['duckDb'] * sm / 20)
vpk = np.abs(voice).max()
mix = bed * duck + voice / vpk * 0.7
out = ROOT / 'exports/audio'
tmp = out / '_vo.wav'; write24(tmp, mix / np.abs(mix).max() * 0.5); i_l, _ = lufs(tmp); tmp.unlink()
g = 10 ** ((VO['lufs'] - i_l) / 20) * 0.5 / np.abs(mix).max()
pk = 20 * np.log10(np.abs(mix * g).max())
if pk > -1.5: g *= 10 ** ((-1.5 - pk) / 20)
mix *= g
cut = int(DUR * SR); fade = np.ones(cut); fl = int(0.35 * SR); fade[-fl:] = np.cos(np.linspace(0, np.pi / 2, fl)) ** 2
write24(out / 'THERMINAL_intro_v4_mix_vo.wav', mix[:, :cut] * fade)
write24(out / 'stems' / '07_voice.wav', voice / vpk * 0.7 * g)
print('mix with voice: %.1f LUFS, peak %.1f dBFS' % lufs(out / 'THERMINAL_intro_v4_mix_vo.wav'))
src = ROOT / 'exports/THERMINAL_intro_v4_1080x1920.mp4'
if src.exists():
    subprocess.run(['ffmpeg', '-hide_banner', '-loglevel', 'error', '-y', '-i', str(src), '-i', str(out / 'THERMINAL_intro_v4_mix_vo.wav'), '-map', '0:v', '-map', '1:a',
                    '-c:v', 'copy', '-c:a', 'aac', '-b:a', '320k', '-shortest', '-movflags', '+faststart', str(ROOT / 'exports/THERMINAL_intro_v4_VO_1080x1920.mp4')], check=True)
    print('video: exports/THERMINAL_intro_v4_VO_1080x1920.mp4')
