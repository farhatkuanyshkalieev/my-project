"""«Concept look» post-processing: turns the crisp vector render into the soft, glowing, painterly
image of the key art.  Operates on uint8 RGB numpy frames.

  bloom      — bright parts (lamp, eyes, rims, phone) bleed light, two radii
  haze       — low-frequency atmospheric light (warm or cold), lifts the blacks slightly like the art
  paint      — fine brush/paper texture modulation + micro-softening of hard vector edges
  grade      — filmic tone curve (soft shoulder) + warm/cold split toning
  grain      — temporal film grain
"""
import functools

import numpy as np
from scipy import ndimage


@functools.lru_cache(maxsize=4)
def _paper(h, w, seed=3):
    rng = np.random.default_rng(seed)
    n = rng.standard_normal((h // 2, w // 2)).astype(np.float32)
    n = ndimage.gaussian_filter(n, 1.4) * 0.6 + ndimage.gaussian_filter(n, 6) * 1.6
    n = np.repeat(np.repeat(n, 2, 0), 2, 1)[:h, :w]
    return (n / (np.abs(n).max() + 1e-6))[..., None].astype(np.float32)


def _blur_small(x, sigma, k=4):
    """Gaussian blur on a k-times downsampled copy (fast wide blur)."""
    h, w = x.shape[:2]
    s = x[::k, ::k]
    s = ndimage.gaussian_filter(s, (sigma / k, sigma / k, 0))
    s = np.repeat(np.repeat(s, k, 0), k, 1)[:h, :w]
    return s


def concept_look(rgb, t=0.0, warm=1.0, cold=0.0, bloom=0.55, soften=0.6, grain=0.03, seed=0, sat=1.0):
    x = rgb.astype(np.float32) / 255.0
    h, w = x.shape[:2]
    if soften > 0:
        x = ndimage.gaussian_filter(x, (soften, soften, 0))
    # bloom
    lum = x.max(axis=2, keepdims=True)
    hi = np.clip((lum - 0.68) / 0.32, 0, 1) ** 1.8 * x
    b = _blur_small(hi, 18) * 0.9 + _blur_small(hi, 60, 8) * 0.8
    x = x + b * bloom
    # paper / brush texture (stronger in mid-tones)
    pap = _paper(h, w)
    mid = 4 * lum * (1 - lum)
    x = x * (1 + 0.045 * pap * (0.4 + mid))
    # haze: lift blacks towards a tinted atmosphere
    tint = np.array([0.16, 0.085, 0.04], np.float32) * warm + np.array([0.03, 0.055, 0.11], np.float32) * cold
    x = x + tint[None, None, :] * 0.05 * (1 - np.clip(lum * 1.4, 0, 1))
    # filmic shoulder + split tone
    # keep blacks deep (key art), roll off only the highlights, gentle S-contrast
    x = np.where(x < 0.78, x, 0.78 + 0.22 * np.tanh((x - 0.78) / 0.22))
    x = np.clip(x, 0, 1)
    x = x * x * (3 - 2 * x) * 0.35 + x * 0.65
    sh = np.array([0.0, 0.01, 0.03], np.float32)        # cool shadows
    hl = np.array([0.03, 0.012, -0.02], np.float32) * warm  # warm highlights
    l2 = x.mean(axis=2, keepdims=True)
    x = x + sh * (1 - l2) + hl * l2
    if sat != 1.0:
        g0 = x.mean(axis=2, keepdims=True)
        x = g0 + (x - g0) * sat
    # grain
    if grain > 0:
        rng = np.random.default_rng(int(t * 60) + seed * 7919)
        g = rng.standard_normal((h // 2, w // 2, 1)).astype(np.float32)
        g = np.repeat(np.repeat(g, 2, 0), 2, 1)[:h, :w]
        x = x + g * grain * (0.5 + 0.5 * (1 - l2))
    return (np.clip(x, 0, 1) * 255 + 0.5).astype(np.uint8)
