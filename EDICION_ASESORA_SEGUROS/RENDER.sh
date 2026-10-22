#!/usr/bin/env bash
# Reproduce toda la edición a partir del video original.
# Uso:  ./RENDER.sh /ruta/al/video_original.mov
# Requisitos: ffmpeg/ffprobe con libass, Python 3.10+, numpy, pillow,
#             opencv-python-headless<5 (Haar cascades), fuente Inter instalada
#             (ruta configurable en scripts/edl.py -> FONT_DIR).
# Tiempo aprox.: 4 min en 4 núcleos (portada + versión A + versión B).
set -euo pipefail

SRC="${1:?Indica la ruta del video original (.mov)}"
DIR="$(cd "$(dirname "$0")" && pwd)"

command -v ffmpeg >/dev/null || { echo "Falta ffmpeg"; exit 1; }
command -v ffprobe >/dev/null || { echo "Falta ffprobe"; exit 1; }
python3 -c "import numpy, PIL, cv2; assert hasattr(cv2, 'CascadeClassifier')" \
  || { echo "Instala: pip install numpy pillow 'opencv-python-headless<5'"; exit 1; }

echo "== Fuente"
ffprobe -v error -show_entries stream=codec_name,width,height,r_frame_rate,duration -of compact "$SRC"

# Genera PORTADA.png, SUBTITULOS.srt, SUBTITULOS_B.srt, SUBTITULOS_ESTILO.ass,
# FINAL_REELS_1080x1920.mp4 y VERSION_B_HOOK.mp4 (música y SFX se sintetizan en .work/)
python3 "$DIR/scripts/render.py" "$SRC" "$DIR" all

echo "== Verificación"
for f in FINAL_REELS_1080x1920.mp4 VERSION_B_HOOK.mp4; do
  ffprobe -v error -show_entries stream=codec_name,width,height,r_frame_rate,duration -of compact "$DIR/$f"
  ffmpeg -hide_banner -i "$DIR/$f" -af ebur128=peak=true -f null - 2>&1 | grep -E "^\s+(I|Peak):" | tail -2
done

# Transcripción (referencia; ya está corregida y fijada en scripts/edl.py):
#   Whisper small (ONNX q8, Apache-2.0) vía @huggingface/transformers en Node,
#   timestamps por palabra + silencedetect=n=-35dB:d=0.2 para los puntos de corte.
