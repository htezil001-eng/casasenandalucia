#!/usr/bin/env python3
"""Añade la música al render visual de «El duelo invisible».

Analiza la envolvente del tema, elige el fragmento que mejor evoluciona de
melancolía (inicio contenido) a esperanza (final más pleno), aplica fade-in
breve, una ligera bajada de intensidad justo antes del clímax (imagen 6),
fade-out natural y normalización EBU R128 en dos pasadas (-16 LUFS, -1.5 dBTP).
Exporta AAC 48 kHz 192 kbps con faststart, copiando el vídeo sin recomprimir.

Uso:
  python3 musicalizar.py RUTA_AL_AUDIO [--inicio SEGUNDOS] [--video V.mp4] [--salida S.mp4]

Sin --inicio, el punto de entrada se elige automáticamente.
"""
import argparse
import json
import re
import subprocess
import sys
from pathlib import Path

import numpy as np

BASE = Path(__file__).resolve().parent.parent
SR = 11025      # análisis: mono a baja frecuencia basta para la envolvente
HOP = 0.1       # resolución de la envolvente en segundos
FADE_IN = 0.8
FADE_OUT = 3.2
DIP_DB = -3.5   # bajada antes del clímax


def decode(path):
    raw = subprocess.run(["ffmpeg", "-v", "error", "-i", str(path), "-ac", "1", "-ar", str(SR),
                          "-f", "f32le", "-"], capture_output=True, check=True).stdout
    return np.frombuffer(raw, dtype=np.float32)


def envelope(x):
    n = int(SR * HOP)
    frames = x[: len(x) // n * n].reshape(-1, n)
    rms = np.sqrt((frames ** 2).mean(1) + 1e-12)
    k = np.ones(20) / 20  # suavizado de 2 s
    return np.convolve(rms, k, mode="same")


def choose_start(env, dur, cut_t):
    """Puntúa cada posible entrada: curva ascendente, inicio audible, sin huecos."""
    n = int(round(dur / HOP))
    if len(env) < n:
        return 0.0, None
    t = np.arange(n) * HOP
    # Curva objetivo: contenida al principio, crece, pequeña bajada antes del corte
    # a la imagen 6 y apertura serena hacia el final.
    target = 0.35 + 0.65 * (t / dur)
    target -= 0.15 * np.exp(-((t - (cut_t - 0.6)) / 0.8) ** 2)
    target = (target - target.mean()) / target.std()
    med = np.median(env[env > 1e-4]) if (env > 1e-4).any() else 1e-4
    best, best_s = -1e9, 0.0
    for i in range(0, len(env) - n + 1, 5):  # pasos de 0.5 s
        seg = env[i:i + n]
        if seg.std() < 1e-6:
            continue
        z = (seg - seg.mean()) / seg.std()
        score = float((z * target).mean())
        if seg[:10].mean() < 0.15 * med:   # el piano debe sonar casi desde el inicio
            score -= 1.0
        if seg.min() < 0.05 * med:         # evitar silencios internos
            score -= 0.5
        if score > best:
            best, best_s = score, i * HOP
    return best_s, best


def loudnorm_measure(audio, start, dur, filt):
    r = subprocess.run(["ffmpeg", "-hide_banner", "-ss", f"{start:.3f}", "-t", f"{dur:.3f}", "-i", str(audio),
                        "-af", filt + ",loudnorm=I=-16:TP=-1.5:LRA=11:print_format=json",
                        "-f", "null", "-"], capture_output=True, text=True, check=True)
    return json.loads(re.findall(r"\{[^{}]+\}", r.stderr)[-1])


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("audio")
    ap.add_argument("--inicio", type=float, default=None)
    ap.add_argument("--video", default=str(BASE / "duelo_invisible_reel_sin_musica.mp4"))
    ap.add_argument("--salida", default=str(BASE / "duelo_invisible_reel_final.mp4"))
    a = ap.parse_args()

    tl = json.loads((BASE / "scripts" / "timeline.json").read_text())
    dur = tl["duration"]
    cut_t = tl["scenes"][5]["start"]  # entrada de la imagen 6

    x = decode(a.audio)
    track_len = len(x) / SR
    if track_len < dur:
        sys.exit(f"El audio dura {track_len:.1f} s; se necesitan al menos {dur:.1f} s.")
    if a.inicio is None:
        start, score = choose_start(envelope(x), dur, cut_t)
        print(f"Entrada elegida automáticamente: {start:.1f} s (puntuación {score:.3f})")
    else:
        start = a.inicio
        print(f"Entrada indicada: {start:.1f} s")

    dip0, dip1, rec = cut_t - 1.1, cut_t - 0.1, cut_t + 1.4
    g = 10 ** (DIP_DB / 20)
    vol = (f"volume='if(lt(t,{dip0}),1,if(lt(t,{dip1}),1+({g}-1)*(t-{dip0})/{dip1 - dip0},"
           f"if(lt(t,{rec}),{g}+(1-{g})*(t-{dip1})/{rec - dip1},1)))':eval=frame")
    shape = (f"asetpts=PTS-STARTPTS,{vol},afade=t=in:d={FADE_IN},"
             f"afade=t=out:st={dur - FADE_OUT:.3f}:d={FADE_OUT}:curve=qsin")

    m = loudnorm_measure(a.audio, start, dur, shape)
    norm = (f"{shape},loudnorm=I=-16:TP=-1.5:LRA=11:measured_I={m['input_i']}:measured_TP={m['input_tp']}:"
            f"measured_LRA={m['input_lra']}:measured_thresh={m['input_thresh']}:offset={m['target_offset']}:"
            f"linear=true,aresample=48000,alimiter=limit=0.79:level=false")  # 0.79 ≈ -2 dBFS: margen ante el AAC

    subprocess.run(["ffmpeg", "-y", "-hide_banner", "-loglevel", "error",
                    "-i", a.video, "-ss", f"{start:.3f}", "-t", f"{dur:.3f}", "-i", a.audio,
                    "-map", "0:v:0", "-map", "1:a:0", "-c:v", "copy",
                    "-af", norm, "-c:a", "aac", "-b:a", "192k", "-ar", "48000", "-ac", "2",
                    "-t", f"{dur:.3f}", "-movflags", "+faststart", a.salida], check=True)

    r = subprocess.run(["ffmpeg", "-hide_banner", "-i", a.salida, "-af", "ebur128=peak=true",
                        "-f", "null", "-"], capture_output=True, text=True).stderr
    summ = r[r.rfind("Summary:"):]
    i_lufs = re.search(r"I:\s+(-?[\d.]+) LUFS", summ).group(1)
    tp = re.search(r"Peak:\s+(-?[\d.]+) dBFS", summ).group(1)
    info = dict(audio=str(a.audio), inicio_fragmento_s=round(start, 2), duracion_s=round(dur, 3),
                lufs_integrados=float(i_lufs), true_peak_dbtp=float(tp))
    (BASE / "scripts" / "musica_aplicada.json").write_text(json.dumps(info, indent=2))
    print(json.dumps(info, indent=2, ensure_ascii=False))


if __name__ == "__main__":
    main()
