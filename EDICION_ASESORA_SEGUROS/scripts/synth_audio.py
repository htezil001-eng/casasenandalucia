"""Original, royalty-free music bed and SFX, synthesized from scratch with numpy.

Usage: python3 synth_audio.py <out_dir> <duration_seconds>
Writes music.wav, sfx_impact.wav, sfx_click.wav, sfx_tick.wav, sfx_pop.wav (44.1 kHz).
Deterministic (fixed seed) so renders are reproducible.
"""
import sys
import wave
import numpy as np

SR = 44100
rng = np.random.default_rng(7)


def write(path, x, stereo=True):
    x = np.clip(x, -1, 1)
    if stereo and x.ndim == 1:
        x = np.stack([x, x], 1)
    with wave.open(path, "wb") as w:
        w.setnchannels(2 if stereo else 1)
        w.setsampwidth(2)
        w.setframerate(SR)
        w.writeframes((x * 32767).astype(np.int16).tobytes())


def onepole_lp(x, fc):
    a = np.exp(-2 * np.pi * fc / SR)
    y = np.empty_like(x)
    acc = 0.0
    for i, v in enumerate(x):
        acc = (1 - a) * v + a * acc
        y[i] = acc
    return y


def note_hz(m):
    return 440.0 * 2 ** ((m - 69) / 12)


def music(dur):
    bpm = 92
    beat = 60 / bpm
    n = int((dur + 1) * SR)
    t = np.arange(n) / SR
    L = np.zeros(n)
    R = np.zeros(n)
    # Fmaj7 - Am7 - Cmaj7 - G6, one bar (4 beats) each
    prog = [[53, 57, 60, 64], [57, 60, 64, 67], [48, 55, 59, 64], [55, 59, 62, 64]]
    roots = [41, 45, 48, 43]
    bar = 4 * beat
    nbars = int(np.ceil(dur / bar)) + 1
    for b in range(nbars):
        t0 = b * bar
        i0 = int(t0 * SR)
        i1 = min(n, int((t0 + bar + 0.6) * SR))
        if i0 >= n:
            break
        tt = t[i0:i1] - t0
        env = np.minimum(1, tt / 0.45) * np.exp(-np.maximum(0, tt - bar) / 0.25)
        chord = prog[b % 4]
        for k, m in enumerate(chord):
            f = note_hz(m)
            v = (np.sin(2 * np.pi * f * tt) + 0.35 * np.sin(2 * np.pi * 2 * f * tt + 0.3)) * env * 0.055
            v2 = np.sin(2 * np.pi * f * 1.003 * tt) * env * 0.04
            pan = 0.35 + 0.1 * k
            L[i0:i1] += v * (1 - pan) + v2 * pan
            R[i0:i1] += v * pan + v2 * (1 - pan)
        # sub bass, beats 1 and 3
        for bt in (0, 2):
            s = int((t0 + bt * beat) * SR)
            e = min(n, s + int(1.6 * beat * SR))
            if s >= n:
                continue
            tb = t[s:e] - t[s]
            v = np.sin(2 * np.pi * note_hz(roots[b % 4]) * tb) * np.exp(-tb / 0.9) * np.minimum(1, tb / 0.01) * 0.16
            L[s:e] += v
            R[s:e] += v
        # soft electric-piano arpeggio on 8ths
        for k in range(8):
            s = int((t0 + k * beat / 2) * SR)
            e = min(n, s + int(0.5 * SR))
            if s >= n:
                continue
            tb = t[s:e] - t[s]
            m = chord[[0, 2, 1, 3, 2, 1, 3, 2][k]] + 12
            f = note_hz(m)
            v = (np.sin(2 * np.pi * f * tb) + 0.2 * np.sin(2 * np.pi * 3 * f * tb)) * np.exp(-tb / 0.18) * 0.025
            p = 0.3 if k % 2 else 0.7
            L[s:e] += v * (1 - p)
            R[s:e] += v * p
    # kick on 1 & 3, hat on off-beats (very low)
    nbeats = int(dur / beat) + 2
    for k in range(nbeats):
        s = int(k * beat * SR)
        if s >= n:
            break
        if k % 2 == 0:
            e = min(n, s + int(0.25 * SR))
            tb = t[s:e] - t[s]
            f = 45 + 75 * np.exp(-tb / 0.03)
            v = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-tb / 0.09) * 0.22
            L[s:e] += v
            R[s:e] += v
        s2 = int((k + 0.5) * beat * SR)
        e2 = min(n, s2 + int(0.04 * SR))
        if s2 < n:
            nz = rng.standard_normal(e2 - s2)
            nz = nz - onepole_lp(nz, 6000)
            v = nz * np.exp(-np.arange(e2 - s2) / SR / 0.012) * 0.03
            L[s2:e2] += v
            R[s2:e2] += v * 0.8
    x = np.stack([L, R], 1)[: int(dur * SR)]
    fade = np.ones(len(x))
    fi, fo = int(0.6 * SR), int(1.2 * SR)
    fade[:fi] = np.linspace(0, 1, fi)
    fade[-fo:] = np.linspace(1, 0, fo)
    x *= fade[:, None]
    return x / np.max(np.abs(x)) * 0.7


def impact():
    d = 0.7
    tb = np.arange(int(d * SR)) / SR
    f = 38 + 50 * np.exp(-tb / 0.06)
    body = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-tb / 0.22)
    nz = onepole_lp(rng.standard_normal(len(tb)), 900) * np.exp(-tb / 0.05) * 1.5
    x = body + nz
    return x / np.max(np.abs(x)) * 0.8


def click():
    d = 0.08
    tb = np.arange(int(d * SR)) / SR
    nz = rng.standard_normal(len(tb))
    nz = nz - onepole_lp(nz, 2500)
    x = nz * np.exp(-tb / 0.004) * 0.6 + np.sin(2 * np.pi * 2100 * tb) * np.exp(-tb / 0.012) * 0.5
    return x / np.max(np.abs(x)) * 0.6


def tick():
    d = 0.2
    tb = np.arange(int(d * SR)) / SR
    f = 160 + 120 * np.exp(-tb / 0.015)
    x = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-tb / 0.05)
    return x / np.max(np.abs(x)) * 0.7


def pop():
    out = np.zeros(int(0.6 * SR))
    for k, (f0, f1, st) in enumerate([(700, 990, 0.0), (990, 1320, 0.09)]):
        s = int(st * SR)
        tb = np.arange(len(out) - s) / SR
        f = f1 + (f0 - f1) * np.exp(-tb / 0.02)
        out[s:] += np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-tb / 0.12) * np.minimum(1, tb / 0.003) * (0.8 - 0.2 * k)
    return out / np.max(np.abs(out)) * 0.6


if __name__ == "__main__":
    out, dur = sys.argv[1], float(sys.argv[2])
    write(f"{out}/music.wav", music(dur))
    write(f"{out}/sfx_impact.wav", impact())
    write(f"{out}/sfx_click.wav", click())
    write(f"{out}/sfx_tick.wav", tick())
    write(f"{out}/sfx_pop.wav", pop())
