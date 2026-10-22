#!/usr/bin/env python3
"""El duelo invisible: montaje cinematográfico de las 7 imágenes en vídeo vertical.

Genera cada fotograma en Python (transformaciones afines subpíxel con curvas de
aceleración suaves) y lo envía por tubería a FFmpeg (H.264, 1080x1920, 30 fps
constantes, yuv420p, faststart). También escribe timeline.json, que usa
musicalizar.py para sincronizar la música con los cambios de escena.

Uso: python3 render_video.py [salida.mp4]
"""
import json
import math
import subprocess
import sys
from pathlib import Path

import numpy as np
from PIL import Image

W, H, FPS = 1080, 1920, 30
BASE = Path(__file__).resolve().parent.parent
SRC = BASE / "fuentes"

# Escenas: duración nominal, escala inicial/final, punto focal inicial/final
# (fracción de la imagen), curva de movimiento y transición de ENTRADA.
# La escala máxima es 1.032: con ella se recortan 17 px por lado en horizontal,
# y los textos más anchos (imágenes 3 y 5) dejan ~85 px de margen.
SCENES = [
    # 1 · Gancho: empieza con la imagen completa y avanza hacia la pregunta.
    dict(dur=5.0, s=(1.000, 1.030), f=((0.50, 0.50), (0.50, 0.40)), ease="inout", tin=None),
    # 2 · Diagnóstico invisible: microdesplazamiento lateral de derecha a izquierda.
    dict(dur=6.0, s=(1.024, 1.028), f=((0.515, 0.46), (0.485, 0.46)), ease="inout", tin=0.25),
    # 3 · Medicación: aproximación íntima y controlada.
    dict(dur=5.8, s=(1.006, 1.030), f=((0.50, 0.48), (0.50, 0.42)), ease="inout", tin=0.22),
    # 4 · Dolor crónico: entrada contenida, ligero alejamiento (pausa emocional).
    dict(dur=5.5, s=(1.028, 1.014), f=((0.49, 0.38), (0.51, 0.42)), ease="out", tin=0.30),
    # 5 · Acumulación de pérdidas: movimiento mínimo para leer con calma.
    dict(dur=8.0, s=(1.010, 1.018), f=((0.50, 0.40), (0.50, 0.44)), ease="inout", tin=0.25),
    # 6 · Clímax: corte seco y aproximación delicada hacia «DUELE».
    dict(dur=5.8, s=(1.000, 1.032), f=((0.50, 0.46), (0.50, 0.37)), ease="inout", tin=0.0),
    # 7 · Resolución: alejamiento cada vez más lento, cierre sereno.
    dict(dur=7.3, s=(1.026, 1.006), f=((0.50, 0.40), (0.50, 0.46)), ease="out4", tin=0.30),
]
END_FADE = 0.9  # disolvencia final hacia el crema del propio material


def ease(kind, t):
    t = min(max(t, 0.0), 1.0)
    if kind == "inout":  # coseno: arranque y frenado suaves
        return 0.5 - 0.5 * math.cos(math.pi * t)
    if kind == "out":
        return 1 - (1 - t) ** 3
    if kind == "out4":
        return 1 - (1 - t) ** 4
    return t


def smooth(t):
    t = min(max(t, 0.0), 1.0)
    return t * t * (3 - 2 * t)


def build_timeline():
    """Escena i empieza cuando la anterior termina menos el solapamiento de su entrada."""
    t, out = 0.0, []
    for i, sc in enumerate(SCENES):
        start = t - (sc["tin"] or 0.0) if i else 0.0
        out.append(dict(index=i + 1, start=round(start, 4), end=round(start + sc["dur"], 4),
                        transition_in=sc["tin"]))
        t = start + sc["dur"]
    return out, t


def render_scene(img, sc, local_t):
    p = ease(sc["ease"], local_t / sc["dur"])
    s = sc["s"][0] + (sc["s"][1] - sc["s"][0]) * p
    fx = sc["f"][0][0] + (sc["f"][1][0] - sc["f"][0][0]) * p
    fy = sc["f"][0][1] + (sc["f"][1][1] - sc["f"][0][1]) * p
    # Ventana visible (W/s x H/s) centrada en el foco y siempre dentro de la imagen.
    hw, hh = W / (2 * s), H / (2 * s)
    cx = min(max(fx * W, hw), W - hw)
    cy = min(max(fy * H, hh), H - hh)
    x0, y0 = cx - hw, cy - hh
    a = 1.0 / s
    frame = img.transform((W, H), Image.AFFINE, (a, 0, x0, 0, a, y0), resample=Image.BICUBIC)
    return np.asarray(frame, dtype=np.float32)


# Luz ambiental: banda diagonal muy suave (±1.2 %) que se desplaza con el tiempo
# global, nunca por escena, para que no haya saltos de exposición en los cortes.
_gy, _gx = np.mgrid[0:96, 0:54].astype(np.float32)
_gx /= 54.0
_gy /= 96.0


def light_gain(t):
    phase = 0.15 * t
    band = np.cos(2 * math.pi * (0.55 * _gx + 0.35 * _gy - phase))
    g = 1.0 + 0.012 * band
    big = Image.fromarray(g.astype(np.float32), mode="F").resize((W, H), Image.BILINEAR)
    return np.asarray(big, dtype=np.float32)[..., None]


def main():
    out_path = Path(sys.argv[1]) if len(sys.argv) > 1 else BASE / "duelo_invisible_reel_sin_musica.mp4"
    imgs = [Image.open(SRC / f"Foto_{i}_TikTok_Reels.jpg").convert("RGB") for i in range(1, 8)]
    for im in imgs:
        assert im.size == (W, H), im.size
    timeline, total = build_timeline()
    n_frames = int(round(total * FPS))
    total = n_frames / FPS
    # Color de cierre: crema medio de la franja superior de la última imagen.
    cream = np.asarray(imgs[-1].crop((0, 0, W, 300)), dtype=np.float32).reshape(-1, 3).mean(0)

    (BASE / "scripts" / "timeline.json").write_text(json.dumps(
        dict(fps=FPS, duration=total, end_fade=END_FADE, scenes=timeline), indent=2))

    ff = subprocess.Popen([
        "ffmpeg", "-y", "-hide_banner", "-loglevel", "error",
        "-f", "rawvideo", "-pix_fmt", "rgb24", "-s", f"{W}x{H}", "-r", str(FPS), "-i", "-",
        "-c:v", "libx264", "-preset", "slow", "-crf", "16", "-tune", "film",
        "-profile:v", "high", "-level", "4.2", "-pix_fmt", "yuv420p",
        "-color_primaries", "bt709", "-color_trc", "bt709", "-colorspace", "bt709",
        "-r", str(FPS), "-g", str(FPS * 2), "-movflags", "+faststart", str(out_path),
    ], stdin=subprocess.PIPE)

    for n in range(n_frames):
        t = n / FPS
        active = [(i, sc) for i, sc in enumerate(SCENES)
                  if timeline[i]["start"] <= t < timeline[i]["end"] - 1e-9]
        if len(active) == 1:
            i, sc = active[0]
            frame = render_scene(imgs[i], sc, t - timeline[i]["start"])
        else:  # disolvencia entre la escena saliente y la entrante
            (i, a), (j, b) = active[0], active[-1]
            k = smooth((t - timeline[j]["start"]) / b["tin"])
            frame = (render_scene(imgs[i], a, t - timeline[i]["start"]) * (1 - k)
                     + render_scene(imgs[j], b, t - timeline[j]["start"]) * k)
        frame *= light_gain(t)
        fade = smooth((t - (total - END_FADE)) / END_FADE)
        if fade > 0:
            frame = frame * (1 - fade) + cream * fade
        ff.stdin.write(np.clip(frame + 0.5, 0, 255).astype(np.uint8).tobytes())
        if n % 150 == 0:
            print(f"fotograma {n}/{n_frames}", flush=True)
    ff.stdin.close()
    if ff.wait() != 0:
        sys.exit("FFmpeg falló")
    print(f"OK {out_path} · {total:.3f} s · {n_frames} fotogramas")


if __name__ == "__main__":
    main()
