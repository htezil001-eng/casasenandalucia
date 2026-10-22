"""Decision list for the IMSS under-reporting reel.

All times are SOURCE seconds in the original .mov (verified by Whisper word
timestamps + silencedetect at -35 dB). Cut points sit inside measured silences
or inside a plosive closure, never mid-word.
"""

FPS = 30
W, H = 1080, 1920
SRC_W, SRC_H = 478, 850

CHARCOAL = (25, 25, 25)
WARM = (245, 242, 235)
LIME = (217, 243, 91)

FONT_DIR = "/usr/share/fonts/opentype/inter"
FONT = {
    "medium": f"{FONT_DIR}/Inter-Medium.otf",
    "semibold": f"{FONT_DIR}/Inter-SemiBold.otf",
    "bold": f"{FONT_DIR}/Inter-Bold.otf",
}

# id: (src_in, src_out, literal text as spoken, corrected)
SEGMENTS = {
    "A1": (1.90, 3.75, "Puede que tu jefe te pague bien,"),
    "A2": (4.22, 6.40, "pero que le esté diciendo al IMSS"),
    "A3": (6.80, 7.92, "que ganas menos."),
    "A4": (8.74, 11.33, "A esto se le llama subregistro salarial."),
    # 11.89-18.21 "Muchas de las empresas registran..." -> omitted (redundant with hook)
    # 18.78-32.15 statistic "580 pesos diarios / 17,400 al mes" -> omitted (unverified figure, see INFORME)
    "A7": (33.14, 41.58, "El problema es que tu pensión, tus incapacidades y hasta tu crédito Infonavit se calculan con el sueldo que aparece registrado"),
    "A7b": (34.46, 41.58, "Tu pensión, tus incapacidades y hasta tu crédito Infonavit se calculan con el sueldo que aparece registrado"),
    "A8": (41.76, 43.66, "y no con el que realmente recibes."),
    "A9": (44.20, 46.88, "Si nunca comparaste tu recibo de nómina"),
    "A10": (47.33, 52.86, "con tu constancia del IMSS, es muy probable que esto te esté pasando también a ti sin que lo sepas."),
    # 53.35-55.32 "Ahorita mismo, mientras ves este video," -> omitted (filler before the action)
    "A11": (55.48, 59.24, "Saca tu constancia de semanas cotizadas en la app del IMSS"),
    "A12": (59.74, 64.50, "y cuéntame: ¿qué te salió? ¿Coincide o no?"),
}

END_HOLD = 0.8  # freeze of last frame so the CTA stays readable

# zoom (start, end[, ease_seconds]) per segment; anchor is the tracked face x and a point near
# the bottom of frame so zooming lifts the face away from the caption band.
VERSIONS = {
    "A": {
        "out": "FINAL_REELS_1080x1920.mp4",
        "order": ["A1", "A2", "A3", "A4", "A7", "A8", "A9", "A10", "A11", "A12"],
        "zoom": {"A1": (1.00, 1.06, 0.45), "A2": (1.10, 1.10), "A3": (1.10, 1.13), "A4": (1.00, 1.00),
                 "A7": (1.08, 1.08), "A8": (1.08, 1.08), "A9": (1.00, 1.00), "A10": (1.00, 1.03),
                 "A11": (1.03, 1.03), "A12": (1.00, 1.00)},
    },
    "B": {
        "out": "VERSION_B_HOOK.mp4",
        "order": ["A7b", "A8", "A1", "A2", "A3", "A4", "A9", "A10", "A11", "A12"],
        "zoom": {"A7b": (1.00, 1.07, 0.45), "A8": (1.07, 1.07), "A1": (1.00, 1.00), "A2": (1.04, 1.04),
                 "A3": (1.04, 1.07), "A4": (1.00, 1.00), "A9": (1.00, 1.00), "A10": (1.00, 1.03),
                 "A11": (1.03, 1.03), "A12": (1.00, 1.00)},
    },
}

# Caption blocks: (src_start, text, keyword). Starts snapped to silence ends
# where a pause precedes, else Whisper word start minus ~0.12 s.
CAPTIONS = [
    (1.99, "Puede que tu jefe", "jefe"),
    (3.05, "te pague bien,", "bien,"),
    (4.34, "pero que le esté", "pero"),
    (5.62, "diciendo al IMSS", "IMSS"),
    (33.26, "El problema es que", "problema"),
    (44.32, "Si nunca comparaste", "nunca"),
    (45.62, "tu recibo de nómina", "nómina"),
    (47.45, "con tu constancia del IMSS,", "constancia"),
    (49.00, "es muy probable", "probable"),
    (49.72, "que esto te esté pasando", "pasando"),
    (51.10, "también a ti", "ti"),
    (51.85, "sin que lo sepas.", "sepas."),
    (55.60, "Saca tu constancia", "constancia"),
    (56.45, "de semanas cotizadas", "semanas cotizadas"),
    (58.15, "en la app del IMSS", "app"),
]

# Graphic beats (src times)
G = {
    "menos_small": 6.92,     # "que ganas"
    "menos_big": 7.38,       # "menos"
    "term_card": 8.86,       # "A esto se le llama"
    "term_word": 10.05,      # "subregistro salarial"
    "chips": [(34.70, "Pensión"), (35.75, "Incapacidades"), (37.35, "Crédito Infonavit")],
    "compare_in": 39.50,     # "el sueldo que aparece registrado"
    "compare_no": 41.88,     # "y no con..."
    "compare_strike": (42.65, 43.25),  # "realmente recibes"
    "cta_in": 59.80,
}

# Sentence-level transcript of the final audio, for SRT (src_start, src_end, text)
SRT_LINES = [
    (1.99, 3.63, "Puede que tu jefe te pague bien,"),
    (4.34, 6.28, "pero que le esté diciendo al IMSS"),
    (6.92, 7.77, "que ganas menos."),
    (8.86, 11.22, "A esto se le llama\nsubregistro salarial."),
    (33.26, 34.40, "El problema es que"),
    (34.50, 37.30, "tu pensión, tus incapacidades"),
    (37.30, 39.50, "y hasta tu crédito Infonavit\nse calculan"),
    (39.50, 41.47, "con el sueldo\nque aparece registrado"),
    (41.88, 43.55, "y no con el que\nrealmente recibes."),
    (44.32, 46.76, "Si nunca comparaste\ntu recibo de nómina"),
    (47.45, 48.61, "con tu constancia del IMSS,"),
    (49.00, 51.10, "es muy probable\nque esto te esté pasando"),
    (51.10, 52.74, "también a ti sin que lo sepas."),
    (55.60, 57.76, "Saca tu constancia\nde semanas cotizadas"),
    (58.15, 59.12, "en la app del IMSS"),
    (59.86, 61.69, "y cuéntame: ¿qué te salió?"),
    (62.48, 64.00, "¿Coincide o no?"),
]
