"""Reproducible renderer for the IMSS under-reporting reel.

Usage: python3 render.py <source.mov> <out_dir> [A|B|cover|subs|all]

Pipeline (all steps actually executed, nothing simulated):
  1. Face tracking (OpenCV Haar) on the source -> smoothed horizontal anchor.
  2. ffmpeg: denoise + colour correction at native resolution -> RGB frames in RAM.
  3. Per output frame (30 fps): map to source time via the EDL, sub-pixel crop/zoom
     with Lanczos to 1080x1920, mild unsharp, draw captions / editorial graphics.
  4. ffmpeg: voice cut list with 8 ms fades, cleanup chain, synthesized music bed
     side-chain ducked under voice, SFX, two-pass loudness to -14 LUFS / -1.5 dBTP.
  5. Mux H.264 High / AAC 48 kHz, faststart.
"""
import json
import math
import os
import subprocess
import sys

import numpy as np
from PIL import Image, ImageDraw, ImageFilter, ImageFont

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from edl import (CAPTIONS, CHARCOAL, END_HOLD, FONT, FPS, G, H, LIME, SEGMENTS,  # noqa: E402
                 SRC_H, SRC_W, SRT_LINES, VERSIONS, W, WARM)

HERE = os.path.dirname(os.path.abspath(__file__))
COLOR = ("hqdn3d=1.5:1.5:3:3,"
         "colorbalance=rs=-0.02:bs=0.02:rm=-0.03:bm=0.02:rh=-0.02:bh=0.01,"
         "eq=contrast=1.06:saturation=0.95:gamma=0.98")
ANCHOR_Y = 0.90 * SRC_H
SAFE_X0, SAFE_X1 = 120, 960
CTA_SHIFT = 170
PANEL_TOP = 1290


def run(cmd, **kw):
    return subprocess.run(cmd, check=True, **kw)


# ---------------------------------------------------------------- timeline
def timeline(version):
    v = VERSIONS[version]
    segs, t = [], 0.0
    for sid in v["order"]:
        a, b, text = SEGMENTS[sid]
        n = round((b - a) * FPS)
        segs.append(dict(id=sid, src_in=a, src_out=a + n / FPS, out_in=t, out_out=t + n / FPS,
                         n=n, text=text, zoom=v["zoom"][sid]))
        t += n / FPS
    total = t + END_HOLD
    return segs, total


def src_to_out(segs, src):
    for s in segs:
        if s["src_in"] - 1e-6 <= src < s["src_out"] + 1e-6:
            return s["out_in"] + (src - s["src_in"]), s
    return None, None


def out_to_src(segs, t):
    for s in segs:
        if t < s["out_out"]:
            return s["src_in"] + (t - s["out_in"]), s
    last = segs[-1]
    return last["src_out"] - 1 / FPS, last  # freeze hold


# ---------------------------------------------------------------- easing
def clamp(x, a=0.0, b=1.0):
    return max(a, min(b, x))


def ease_out(p):
    p = clamp(p)
    return 1 - (1 - p) ** 3


def ease_in_out(p):
    p = clamp(p)
    return 0.5 - 0.5 * math.cos(math.pi * p)


def ease_out_back(p, k=1.2):
    p = clamp(p)
    return 1 + (k + 1) * (p - 1) ** 3 + k * (p - 1) ** 2


# ---------------------------------------------------------------- fonts / sprites
_fonts = {}


def font(kind, size):
    key = (kind, size)
    if key not in _fonts:
        _fonts[key] = ImageFont.truetype(FONT[kind], size)
    return _fonts[key]


def rgba(c, a=1.0):
    return (c[0], c[1], c[2], int(255 * a))


def composite(base, sprite, x, y, alpha=1.0, clip=None):
    """alpha-composite sprite onto base at (x, y); clip=(l, t, r, b) in sprite coords."""
    if alpha <= 0.003:
        return
    if clip:
        l, t, r, b = [int(round(v)) for v in clip]
        if r <= l or b <= t:
            return
        sprite = sprite.crop((l, t, r, b))
        x, y = x + l, y + t
    if alpha < 0.997:
        sprite = sprite.copy()
        a = sprite.getchannel("A").point(lambda v: int(v * alpha))
        sprite.putalpha(a)
    base.alpha_composite(sprite, (int(round(x)), int(round(y))))


_cache = {}


def cached(key, fn):
    if key not in _cache:
        _cache[key] = fn()
    return _cache[key]


def text_w(txt, f, tracking=0):
    return f.getlength(txt) + tracking * max(0, len(txt) - 1)


def draw_tracked(d, xy, txt, f, fill, tracking=0):
    x, y = xy
    if not tracking:
        d.text((x, y), txt, font=f, fill=fill)
        return
    for ch in txt:
        d.text((x, y), ch, font=f, fill=fill)
        x += f.getlength(ch) + tracking


def wrap(words, f, max_w):
    lines, cur = [], []
    for w in words:
        trial = " ".join(cur + [w])
        if cur and f.getlength(trial) > max_w:
            lines.append(cur)
            cur = [w]
        else:
            cur.append(w)
    if cur:
        lines.append(cur)
    return lines


def caption_sprite(text, keyword, size=62):
    """Per-line charcoal tape boxes, warm-white type, keyword in lime."""
    f = font("bold", size)
    keys = set(keyword.split())
    lines = wrap(text.split(), f, SAFE_X1 - SAFE_X0 - 48)
    padx, pady, gap = 24, 14, 8
    asc, desc = f.getmetrics()
    lh = asc + desc
    widths = [f.getlength(" ".join(l)) for l in lines]
    bw = int(max(widths) + 2 * padx)
    bh = len(lines) * (lh + 2 * pady) + (len(lines) - 1) * gap
    img = Image.new("RGBA", (bw, bh), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    y = 0
    for l, w in zip(lines, widths):
        x0 = (bw - (w + 2 * padx)) / 2
        d.rounded_rectangle((x0, y, x0 + w + 2 * padx, y + lh + 2 * pady), 14, fill=rgba(CHARCOAL, 0.9))
        x = x0 + padx
        for i, word in enumerate(l):
            d.text((x, y + pady), word, font=f, fill=rgba(LIME if word in keys else WARM))
            x += f.getlength(word + (" " if i < len(l) - 1 else ""))
        y += lh + 2 * pady + gap
    return img


def pill_sprite(text, kind="semibold", size=46, dot=True, h=80, tracking=0, alpha=0.92):
    f = font(kind, size)
    tw = text_w(text, f, tracking)
    padl = 58 if dot else 30
    w = int(tw + padl + 30)
    img = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    d.rounded_rectangle((0, 0, w - 1, h - 1), h // 2, fill=rgba(CHARCOAL, alpha))
    if dot:
        d.ellipse((26, h / 2 - 8, 42, h / 2 + 8), fill=rgba(LIME))
    asc, desc = f.getmetrics()
    draw_tracked(d, (padl, (h - asc - desc) / 2 + 1), text, f, rgba(WARM), tracking)
    return img


def kicker_sprite():
    f = font("semibold", 34)
    txt = "NÓMINA  vs.  IMSS"
    tw = text_w(txt, f, 2)
    w, h = int(tw + 84), 64
    img = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    d.rounded_rectangle((0, 0, w - 1, h - 1), 12, fill=rgba(CHARCOAL, 0.85))
    d.rectangle((24, h / 2 - 8, 40, h / 2 + 8), fill=rgba(LIME))
    asc, desc = f.getmetrics()
    draw_tracked(d, (56, (h - asc - desc) / 2), txt, f, rgba(WARM), 2)
    return img


def fit_font(kind, txt, max_w, start, tracking=0):
    s = start
    while s > 20 and text_w(txt, font(kind, s), tracking) > max_w:
        s -= 2
    return font(kind, s)


# ---------------------------------------------------------------- graphics state
class Graphics:
    def __init__(self, segs, total, version):
        self.segs, self.total, self.version = segs, total, version
        o = lambda src: src_to_out(segs, src)[0]  # noqa: E731
        self.o = o
        seg_of = {s["id"]: s for s in segs}
        self.seg_of = seg_of
        # caption blocks in output time
        blocks = []
        for src, text, key in CAPTIONS:
            t, s = src_to_out(segs, src)
            if t is None:
                continue
            if t - s["out_in"] < 0.15:
                t = s["out_in"]
            blocks.append(dict(t=t, seg=s, text=text, key=key))
        blocks.sort(key=lambda b: b["t"])
        for i, b in enumerate(blocks):
            nxt = blocks[i + 1]["t"] if i + 1 < len(blocks) else 1e9
            b["end"] = min(nxt, b["seg"]["out_out"] + 0.3)
        self.blocks = blocks
        # beats in output time (None when the segment is not in this version)
        self.t_menos_small = o(G["menos_small"])
        self.t_menos_big = o(G["menos_big"])
        self.a3_end = seg_of["A3"]["out_out"]
        self.t_term = o(G["term_card"])
        self.t_term_word = o(G["term_word"])
        self.a4_end = seg_of["A4"]["out_out"]
        self.chips = []
        for src, txt in G["chips"]:
            t, s = src_to_out(segs, src)
            self.chips.append((s["out_in"] if t - s["out_in"] < 0.3 else t, txt))
        self.t_cmp = o(G["compare_in"])
        self.t_cmp_no = o(G["compare_no"])
        self.t_strike = (o(G["compare_strike"][0]), o(G["compare_strike"][1]))
        self.a8_end = seg_of["A8"]["out_out"]
        self.t_cta = o(G["cta_in"])
        self.t_bubble = self.t_cta + 0.45
        self.kicker = (0.0, 4.3)

    def sfx_events(self):
        return [("impact", 0.0, 0.32), ("tick", self.t_menos_big, 0.30),
                ("click", self.t_term_word, 0.22), ("click", self.t_strike[0], 0.22),
                ("pop", self.t_bubble, 0.30)]

    def zone_busy(self, t):
        if self.t_menos_small <= t < self.a3_end:
            return True
        if self.t_term <= t < self.a4_end + 0.12:
            return True
        if self.chips[0][0] <= t < self.a8_end + 0.12:
            return True
        return t >= self.t_cta

    def cta_progress(self, t):
        return ease_in_out((t - self.t_cta) / 0.4) if t >= self.t_cta else 0.0

    # ---------------------------------------------------------- draw
    def draw(self, layer, t):
        # hook kicker
        k0, k1 = self.kicker
        if k0 <= t < k1 + 0.2:
            a = 1.0 if t < k1 else 1 - (t - k1) / 0.2
            composite(layer, cached("kicker", kicker_sprite), SAFE_X0, 262, a)

        if not self.zone_busy(t):
            for b in self.blocks:
                if b["t"] <= t < b["end"]:
                    sp = cached(("cap", b["text"]), lambda b=b: caption_sprite(b["text"], b["key"]))
                    p = ease_out((t - b["t"]) / 0.14) if b["t"] > 0.01 else 1.0
                    y = 1445 - sp.height / 2 + (1 - p) * 16
                    composite(layer, sp, (W - sp.width) / 2, y, p)
                    break

        self.draw_menos(layer, t)
        self.draw_term(layer, t)
        self.draw_chips(layer, t)
        self.draw_compare(layer, t)
        self.draw_cta(layer, t)

    def draw_menos(self, layer, t):
        if not (self.t_menos_small <= t < self.a3_end):
            return
        sm = cached("ganas", lambda: caption_sprite("que ganas", "", 54))
        p = ease_out((t - self.t_menos_small) / 0.14)
        composite(layer, sm, (W - sm.width) / 2, 1300 + (1 - p) * 12, p)
        if t >= self.t_menos_big:
            def big():
                f = font("bold", 128)
                tw = f.getlength("MENOS")
                asc, desc = f.getmetrics()
                img = Image.new("RGBA", (int(tw + 64), asc + desc + 16), (0, 0, 0, 0))
                d = ImageDraw.Draw(img)
                d.rounded_rectangle((0, 0, img.width - 1, img.height - 1), 18, fill=rgba(CHARCOAL, 0.94))
                d.text((32, 4), "MENOS", font=f, fill=rgba(LIME))
                return img
            sp = cached("menos", big)
            p = ease_out((t - self.t_menos_big) / 0.18)
            # mask reveal: content rises inside its own box
            x, y = (W - sp.width) / 2, 1388
            off = (1 - p) * sp.height
            composite(layer, sp.crop((0, 0, sp.width, int(sp.height - off)) if off < sp.height else (0, 0, 1, 1)),
                      x, y + off, 1.0)

    def draw_term(self, layer, t):
        if not (self.t_term <= t < self.a4_end + 0.12):
            return
        a = 1.0 if t < self.a4_end else 1 - (t - self.a4_end) / 0.12
        x0, y0, x1, y1 = SAFE_X0, 1318, SAFE_X1, 1532

        def card():
            img = Image.new("RGBA", (x1 - x0, y1 - y0), (0, 0, 0, 0))
            d = ImageDraw.Draw(img)
            d.rounded_rectangle((0, 0, img.width - 1, img.height - 1), 28, fill=rgba(CHARCOAL, 0.93))
            f = font("semibold", 32)
            draw_tracked(d, (44, 30), "A esto se le llama", f, rgba(WARM, 0.72), 1)
            return img
        sp = cached("termcard", card)
        p = ease_out((t - self.t_term) / 0.22)
        off = (1 - p) * 40
        composite(layer, sp, x0, y0 + off, a * p)
        if t >= self.t_term_word:
            def word():
                f = fit_font("bold", "Subregistro salarial", (x1 - x0) - 88, 74)
                asc, desc = f.getmetrics()
                img = Image.new("RGBA", (int(f.getlength("Subregistro salarial")) + 4, asc + desc), (0, 0, 0, 0))
                ImageDraw.Draw(img).text((0, 0), "Subregistro salarial", font=f, fill=rgba(WARM))
                return img
            ws = cached("termword", word)
            pw = ease_out((t - self.t_term_word) / 0.35)
            composite(layer, ws, x0 + 44, y0 + 84, a, clip=(0, 0, ws.width * pw, ws.height))
            pu = ease_out((t - self.t_term_word - 0.35) / 0.4)
            if pu > 0:
                ImageDraw.Draw(layer).rectangle(
                    (x0 + 44, y0 + 84 + ws.height + 10, x0 + 44 + ws.width * pu, y0 + 84 + ws.height + 18),
                    fill=rgba(LIME, a))

    def draw_chips(self, layer, t):
        if self.chips[0][0] is None or not (self.chips[0][0] <= t < self.t_cmp + 0.12):
            return
        a = 1.0 if t < self.t_cmp else 1 - (t - self.t_cmp) / 0.12
        rows = [(SAFE_X0, 1340), None, (SAFE_X0, 1440)]
        first = cached(("chip", self.chips[0][1]), lambda: pill_sprite(self.chips[0][1]))
        rows[1] = (SAFE_X0 + first.width + 18, 1340)
        for (tc, txt), (x, y) in zip(self.chips, rows):
            if t < tc:
                continue
            sp = cached(("chip", txt), lambda txt=txt: pill_sprite(txt))
            p = 1.0 if tc < 0.01 else ease_out((t - tc) / 0.16)
            composite(layer, sp, x - (1 - p) * 24, y, a * p)

    def draw_compare(self, layer, t):
        if self.t_cmp is None or not (self.t_cmp <= t < self.a8_end + 0.12):
            return
        a = 1.0 if t < self.a8_end else 1 - (t - self.a8_end) / 0.12
        x0, y0, x1, y1 = SAFE_X0, 1300, SAFE_X1, 1534
        colw = (x1 - x0 - 3 * 22) / 2
        lx, rx = x0 + 22, x0 + 44 + colw
        bt, bb = y0 + 66, y1 - 22

        def base():
            img = Image.new("RGBA", (x1 - x0, y1 - y0), (0, 0, 0, 0))
            d = ImageDraw.Draw(img)
            d.rounded_rectangle((0, 0, img.width - 1, img.height - 1), 28, fill=rgba(CHARCOAL, 0.93))
            f = font("semibold", 26)
            draw_tracked(d, (lx - x0 + 4, 26), "SE CALCULAN CON", f, rgba(WARM, 0.72), 2)
            d.rounded_rectangle((lx - x0, bt - y0, lx - x0 + colw, bb - y0), 18, fill=rgba(LIME))
            fb = font("bold", 46)
            d.text((lx - x0 + 26, bt - y0 + 18), "Sueldo", font=fb, fill=rgba(CHARCOAL))
            d.text((lx - x0 + 26, bt - y0 + 74), "registrado", font=fb, fill=rgba(CHARCOAL))
            return img

        def right():
            img = Image.new("RGBA", (int(colw) + 4, y1 - y0), (0, 0, 0, 0))
            d = ImageDraw.Draw(img)
            f = font("semibold", 26)
            draw_tracked(d, (4, 26), "NO CON", f, rgba(WARM, 0.72), 2)
            d.rounded_rectangle((0, bt - y0, colw, bb - y0), 18, outline=rgba(WARM, 0.9), width=3)
            fb = font("bold", 46)
            d.text((26, bt - y0 + 18), "Lo que", font=fb, fill=rgba(WARM))
            d.text((26, bt - y0 + 74), "recibes", font=fb, fill=rgba(WARM))
            return img
        sp = cached("cmp", base)
        p = ease_out((t - self.t_cmp) / 0.22)
        composite(layer, sp, x0, y0 + (1 - p) * 40, a * p)
        if t >= self.t_cmp_no:
            rs = cached("cmp_r", right)
            pr = ease_out((t - self.t_cmp_no) / 0.18)
            composite(layer, rs, rx, y0 + (1 - pr) * 16, a * pr)
            s0, s1 = self.t_strike
            ps = ease_out((t - s0) / max(0.1, s1 - s0))
            if ps > 0:
                fb = font("bold", 46)
                yline = bt + 18 + 56 + fb.getmetrics()[0] * 0.55
                ImageDraw.Draw(layer).rectangle(
                    (rx + 18, yline - 4, rx + 18 + (fb.getlength("recibes") + 16) * ps, yline + 4),
                    fill=rgba(LIME, a))

    def draw_cta(self, layer, t):
        if t < self.t_cta:
            return
        p = self.cta_progress(t)
        top = H - (H - PANEL_TOP) * p
        d = ImageDraw.Draw(layer)
        d.rounded_rectangle((0, top, W, H + 60), 44, fill=rgba(CHARCOAL, 0.97))
        pc = ease_out((t - self.t_cta - 0.25) / 0.25)
        if pc <= 0:
            return

        def head():
            img = Image.new("RGBA", (SAFE_X1 - SAFE_X0, 130), (0, 0, 0, 0))
            dd = ImageDraw.Draw(img)
            draw_tracked(dd, (0, 0), "¿NO COINCIDE?", font("semibold", 30), rgba(LIME), 3)
            fh = fit_font("bold", "¿Quieres conocer tus opciones?", SAFE_X1 - SAFE_X0, 52)
            dd.text((0, 46), "¿Quieres conocer tus opciones?", font=fh, fill=rgba(WARM))
            return img
        hs = cached("cta_head", head)
        composite(layer, hs, SAFE_X0, PANEL_TOP + 30 + (1 - pc) * 14, pc)

        def line():
            img = Image.new("RGBA", (560, 110), (0, 0, 0, 0))
            dd = ImageDraw.Draw(img)
            f1 = font("semibold", 38)
            dd.text((0, 4), "Escríbeme ", font=f1, fill=rgba(WARM))
            dd.text((f1.getlength("Escríbeme "), 4), "INFO", font=f1, fill=rgba(LIME))
            dd.text((0, 56), "por mensaje privado", font=font("medium", 38), fill=rgba(WARM, 0.88))
            return img
        ls = cached("cta_line", line)
        composite(layer, ls, SAFE_X0 + 270, PANEL_TOP + 158 + (1 - pc) * 14, pc)

        pb = (t - self.t_bubble) / 0.32
        if pb > 0:
            def bubble():
                bw, bh = 236, 104
                img = Image.new("RGBA", (bw, bh + 18), (0, 0, 0, 0))
                dd = ImageDraw.Draw(img)
                dd.rounded_rectangle((0, 0, bw, bh), 30, fill=rgba(LIME))
                dd.polygon([(30, bh - 6), (30, bh + 18), (62, bh - 6)], fill=rgba(LIME))
                f = font("bold", 56)
                asc, desc = f.getmetrics()
                dd.text(((bw - f.getlength("INFO")) / 2, (bh - asc - desc) / 2 + 2), "INFO", font=f,
                        fill=rgba(CHARCOAL))
                return img
            bs = cached("bubble", bubble)
            sc = 0.82 + 0.18 * ease_out_back(pb, 0.9)
            sp = bs.resize((max(1, int(bs.width * sc)), max(1, int(bs.height * sc))), Image.LANCZOS)
            cx, cy = SAFE_X0 + bs.width / 2, PANEL_TOP + 150 + bs.height / 2
            composite(layer, sp, cx - sp.width / 2, cy - sp.height / 2, clamp(pb * 2))


# ---------------------------------------------------------------- face track
def face_track(src, cache_path):
    if os.path.exists(cache_path):
        return json.load(open(cache_path))
    import cv2
    cap = cv2.VideoCapture(src)
    fps = cap.get(cv2.CAP_PROP_FPS)
    cc = cv2.CascadeClassifier(cv2.data.haarcascades + "haarcascade_frontalface_default.xml")
    pts, i = [], 0
    while True:
        ok, f = cap.read()
        if not ok:
            break
        if i % 3 == 0:
            g = cv2.cvtColor(f, cv2.COLOR_BGR2GRAY)
            fs = cc.detectMultiScale(g, 1.1, 5, minSize=(80, 80))
            if len(fs):
                x, y, w, h = max(fs, key=lambda r: r[2] * r[3])
                pts.append([i / fps, float(x + w / 2)])
        i += 1
    json.dump(pts, open(cache_path, "w"))
    return pts


def smooth_anchor(pts, dur):
    a = np.array(pts)
    ts = np.arange(0, dur + 0.5, 0.05)
    cx = np.interp(ts, a[:, 0], a[:, 1])
    sig = 1.0 / 0.05  # 1 s gaussian
    k = np.exp(-0.5 * (np.arange(-60, 61) / sig) ** 2)
    k /= k.sum()
    cx = np.convolve(np.pad(cx, 60, mode="edge"), k, mode="valid")
    return lambda t: float(np.interp(t, ts, cx))


# ---------------------------------------------------------------- video
def load_frames(src):
    p = subprocess.run(["ffmpeg", "-v", "error", "-i", src, "-vf", COLOR, "-f", "rawvideo", "-pix_fmt", "rgb24", "-"],
                       check=True, stdout=subprocess.PIPE)
    buf = np.frombuffer(p.stdout, np.uint8)
    n = buf.size // (SRC_W * SRC_H * 3)
    dur = float(subprocess.check_output(
        ["ffprobe", "-v", "error", "-select_streams", "v:0", "-show_entries", "stream=duration", "-of", "csv=p=0",
         src]).decode().strip())
    return buf[: n * SRC_W * SRC_H * 3].reshape(n, SRC_H, SRC_W, 3), n / dur


def zoom_at(seg, t_out):
    z = seg["zoom"]
    d = z[2] if len(z) > 2 else (seg["out_out"] - seg["out_in"])
    p = ease_in_out((t_out - seg["out_in"]) / d) if len(z) <= 2 else ease_out((t_out - seg["out_in"]) / d)
    return z[0] + (z[1] - z[0]) * p


def render_frame(frames, src_fps, segs, gfx, anchor, t):
    src_t, seg = out_to_src(segs, t)
    idx = min(len(frames) - 1, int(round(src_t * src_fps)))
    im = Image.fromarray(frames[idx])
    s = zoom_at(seg, min(t, seg["out_out"] - 1e-3))
    ax = min(max(anchor(src_t), 0), SRC_W)
    vw, vh = SRC_W / s, SRC_H / s
    left, top = ax - ax / s, ANCHOR_Y - ANCHOR_Y / s
    frame = im.resize((W, H), Image.LANCZOS, box=(left, top, left + vw, top + vh))
    frame = frame.filter(ImageFilter.UnsharpMask(radius=2.2, percent=38, threshold=2))
    pc = gfx.cta_progress(t)
    if pc > 0:
        shifted = Image.new("RGB", (W, H), CHARCOAL)
        shifted.paste(frame, (0, -int(round(CTA_SHIFT * pc))))
        frame = shifted
    layer = frame.convert("RGBA")
    gfx.draw(layer, t)
    return layer.convert("RGB")


# ---------------------------------------------------------------- audio
def loudness(path):
    out = subprocess.run(["ffmpeg", "-hide_banner", "-i", path, "-af", "loudnorm=I=-14:TP=-1.5:LRA=11:print_format=json",
                          "-f", "null", "-"], stderr=subprocess.PIPE, text=True).stderr
    return json.loads(out[out.rindex("{"):])


def build_audio(src, segs, total, gfx, work):
    run(["python3", os.path.join(HERE, "synth_audio.py"), work, f"{total:.3f}"])
    m = loudness(f"{work}/music.wav")
    music_gain = -27.0 - float(m["input_i"])  # bed at ~-27 LUFS before ducking
    parts, labels = [], []
    for i, s in enumerate(segs):
        d = s["src_out"] - s["src_in"]
        parts.append(f"[0:a]atrim={s['src_in']:.4f}:{s['src_out']:.4f},asetpts=PTS-STARTPTS,"
                     f"afade=t=in:d=0.008,afade=t=out:st={d - 0.008:.4f}:d=0.008[a{i}]")
        labels.append(f"[a{i}]")
    fc = ";".join(parts)
    fc += f";{''.join(labels)}concat=n={len(segs)}:v=0:a=1,apad=whole_dur={total:.3f},"
    fc += ("highpass=f=80,afftdn=nr=10:nf=-42,"
           "acompressor=threshold=-22dB:ratio=2.5:attack=8:release=160:makeup=2,"
           "loudnorm=I=-16:TP=-2:LRA=9,aresample=48000,pan=stereo|c0=c0|c1=c0,asplit=2[voice][key]")
    fc += (f";[1:a]aresample=48000,volume={music_gain:.2f}dB[mus];"
           "[mus][key]sidechaincompress=threshold=0.02:ratio=5:attack=40:release=450:makeup=1[duck]")
    inputs = ["-i", src, "-i", f"{work}/music.wav"]
    mix = ["[voice]", "[duck]"]
    for j, (name, t, vol) in enumerate(gfx.sfx_events()):
        inputs += ["-i", f"{work}/sfx_{name}.wav"]
        ms = int(round(t * 1000))
        fc += f";[{j + 2}:a]aresample=48000,volume={vol},adelay={ms}|{ms}[s{j}]"
        mix.append(f"[s{j}]")
    fc += f";{''.join(mix)}amix=inputs={len(mix)}:normalize=0:duration=first,atrim=0:{total:.4f}[mix]"
    pre = f"{work}/mix_pre.wav"
    run(["ffmpeg", "-v", "error", "-y", *inputs, "-filter_complex", fc, "-map", "[mix]", "-c:a", "pcm_s24le", pre])
    m = loudness(pre)
    final = f"{work}/mix_final.wav"
    run(["ffmpeg", "-v", "error", "-y", "-i", pre, "-af",
         f"loudnorm=I=-14:TP=-1.5:LRA=11:measured_I={m['input_i']}:measured_TP={m['input_tp']}:"
         f"measured_LRA={m['input_lra']}:measured_thresh={m['input_thresh']}:offset={m['target_offset']}:linear=true,"
         "aresample=48000", "-c:a", "pcm_s24le", final])
    return final


# ---------------------------------------------------------------- subtitles
def fmt_srt(t):
    ms = int(round(t * 1000))
    return f"{ms // 3600000:02d}:{ms // 60000 % 60:02d}:{ms // 1000 % 60:02d},{ms % 1000:03d}"


def fmt_ass(t):
    cs = int(round(t * 100))
    return f"{cs // 360000}:{cs // 6000 % 60:02d}:{cs // 100 % 60:02d}.{cs % 100:02d}"


def write_srt(segs, path):
    rows = []
    for a, b, txt in SRT_LINES:
        t0, s = src_to_out(segs, a)
        if t0 is None:
            continue
        t1 = min(s["out_out"], s["out_in"] + (b - s["src_in"]))
        rows.append((t0, t1, txt))
    rows.sort()
    if rows:
        rows[0] = (rows[0][0], rows[0][1], rows[0][2][0].upper() + rows[0][2][1:])
    with open(path, "w", encoding="utf-8") as f:
        for i, (t0, t1, txt) in enumerate(rows, 1):
            f.write(f"{i}\n{fmt_srt(t0)} --> {fmt_srt(t1)}\n{txt}\n\n")


def write_ass(gfx, path):
    lime = "&H005BF3D9&"
    head = f"""[Script Info]
Title: Subregistro salarial - captions
ScriptType: v4.00+
PlayResX: {W}
PlayResY: {H}
WrapStyle: 0
ScaledBorderAndShadow: yes

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Caption,Inter,62,&H00EBF2F5,&H00EBF2F5,&H00191919,&H00191919,-1,0,0,0,100,100,0,0,3,14,0,2,120,120,430,1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
"""
    lines = []
    for b in gfx.blocks:
        keys = set(b["key"].split())
        txt = " ".join(f"{{\\c{lime}}}{w}{{\\c&H00EBF2F5&}}" if w in keys else w for w in b["text"].split())
        end = min(b["end"], gfx.t_cta)
        if gfx.zone_busy(b["t"]):
            continue
        lines.append(f"Dialogue: 0,{fmt_ass(b['t'])},{fmt_ass(end)},Caption,,0,0,0,,{{\\fad(120,0)}}{txt}")
    with open(path, "w", encoding="utf-8") as f:
        f.write(head + "\n".join(lines) + "\n")


# ---------------------------------------------------------------- cover
def cover(frames, src_fps, anchor, out_path, src_t=52.9):
    im = Image.fromarray(frames[int(round(src_t * src_fps))])
    s, ax = 1.06, anchor(src_t)
    left, top = ax - ax / s, ANCHOR_Y - ANCHOR_Y / s
    fr = im.resize((W, H), Image.LANCZOS, box=(left, top, left + SRC_W / s, top + SRC_H / s))
    fr = fr.filter(ImageFilter.UnsharpMask(radius=2.2, percent=38, threshold=2))
    base = Image.new("RGB", (W, H), CHARCOAL)
    base.paste(fr, (0, -200))
    layer = base.convert("RGBA")
    d = ImageDraw.Draw(layer)
    d.rounded_rectangle((0, 1180, W, H + 60), 48, fill=rgba(CHARCOAL))
    draw_tracked(d, (SAFE_X0, 1228), "SUBREGISTRO SALARIAL", font("semibold", 32), rgba(LIME), 3)
    f = font("bold", 92)
    d.text((SAFE_X0, 1282), "¿El IMSS conoce", font=f, fill=rgba(WARM))
    d.text((SAFE_X0, 1392), "tu ", font=f, fill=rgba(WARM))
    d.text((SAFE_X0 + f.getlength("tu "), 1392), "sueldo real?", font=f, fill=rgba(LIME))
    layer.convert("RGB").save(out_path)


# ---------------------------------------------------------------- main
def render_version(src, out_dir, version, frames, src_fps, anchor, work):
    segs, total = timeline(version)
    gfx = Graphics(segs, total, version)
    audio = build_audio(src, segs, total, gfx, work)
    out = os.path.join(out_dir, VERSIONS[version]["out"])
    nframes = int(round(total * FPS))
    enc = subprocess.Popen(["ffmpeg", "-v", "error", "-y", "-f", "rawvideo", "-pix_fmt", "rgb24", "-s", f"{W}x{H}",
                            "-r", str(FPS), "-i", "-", "-i", audio, "-map", "0:v", "-map", "1:a",
                            "-c:v", "libx264", "-preset", "medium", "-crf", "17", "-profile:v", "high",
                            "-pix_fmt", "yuv420p", "-colorspace", "bt709", "-color_primaries", "bt709",
                            "-color_trc", "bt709", "-c:a", "aac", "-b:a", "192k", "-ar", "48000",
                            "-movflags", "+faststart", "-shortest", out], stdin=subprocess.PIPE)
    for n in range(nframes):
        enc.stdin.write(render_frame(frames, src_fps, segs, gfx, anchor, n / FPS).tobytes())
        if n % 150 == 0:
            print(f"  {version}: frame {n}/{nframes}", flush=True)
    enc.stdin.close()
    enc.wait()
    return segs, total, gfx


def main():
    src, out_dir = sys.argv[1], sys.argv[2]
    what = sys.argv[3] if len(sys.argv) > 3 else "all"
    work = os.path.join(out_dir, ".work")
    os.makedirs(work, exist_ok=True)
    frames, src_fps = load_frames(src)
    anchor = smooth_anchor(face_track(src, f"{work}/faces.json"), len(frames) / src_fps)
    print(f"source frames: {len(frames)} @ {src_fps:.3f} fps")
    for v in ("A", "B"):
        segs, total = timeline(v)
        gfx = Graphics(segs, total, v)
        suffix = "" if v == "A" else "_B"
        write_srt(segs, os.path.join(out_dir, f"SUBTITULOS{suffix}.srt"))
        if v == "A":
            write_ass(gfx, os.path.join(out_dir, "SUBTITULOS_ESTILO.ass"))
        print(f"version {v}: {total:.2f}s")
    if what in ("cover", "all"):
        cover(frames, src_fps, anchor, os.path.join(out_dir, "PORTADA.png"))
    if what == "frames":  # QC stills: render.py src out frames A 0.5 3.2 ...
        v = sys.argv[4]
        segs, total = timeline(v)
        gfx = Graphics(segs, total, v)
        for ts in sys.argv[5:]:
            render_frame(frames, src_fps, segs, gfx, anchor, float(ts)).save(f"{work}/qc_{v}_{ts}.png")
        return
    for v in ("A", "B"):
        if what in (v, "all"):
            render_version(src, out_dir, v, frames, src_fps, anchor, work)


if __name__ == "__main__":
    main()
