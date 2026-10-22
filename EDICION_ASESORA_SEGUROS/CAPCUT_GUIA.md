# Guía para CapCut Desktop

`FINAL_REELS_1080x1920.mp4` ya está **terminado y listo para publicar**. Esta guía sirve para dos casos:

- **A. Retoques sobre el render final**: cambiar la música por una pista con licencia, publicar, etc.
- **B. Reconstruir la edición desde cero en CapCut** a partir del video original, para tener un proyecto editable.

No se entrega un proyecto `.capcut`/`draft_content.json`: el formato es propietario, cambia entre versiones y no se puede validar aquí.

Todos los tiempos de esta guía usan el formato `mm:ss.cc` y corresponden a la **línea de tiempo final** (versión A), salvo los que se marcan como "origen".

---

## A. Retoques recomendados sobre el render final

### A1. Sustituir la música (recomendado antes de pautar)
La base musical actual es original y se sintetizó por código, así que no tiene problemas de derechos, pero es sencilla. Para sustituirla:

1. Importa `FINAL_REELS_1080x1920.mp4` en una pista de video.
2. Haz clic derecho en el clip → **Separar audio**. La pista de audio contiene voz, música y SFX ya mezclados.
   - Si quieres solo la voz limpia sin música, reconstruye la edición (sección B) o pide un render con la música desactivada. Hacerlo es trivial: hay que poner `music_gain` a −60 en `scripts/render.py`.
3. **Audio → Música → Licencia comercial** (filtro "Commercial use"/"Uso comercial"). Busca: *lo-fi minimal*, *corporate soft*, *piano pulse*. Evita las canciones virales con voz.
4. Volumen de la música: **−24 dB** en relación con la voz (en CapCut, 12–18 % de volumen).
5. Selecciona la música → **Ducking automático / Atenuar** sobre la pista de voz, intensidad 60–70 %.
6. Fade in 0.5 s y fade out 1.2 s (termina en 35.5 s).

### A2. Publicación
- **Exportar**: 1080×1920, 30 fps, bitrate "Recomendado/Alto", H.264. El archivo entregado ya tiene ese formato, así que conviene subirlo directamente sin reexportar.
- **Portada**: sube `PORTADA.png` como portada personalizada.
- **Subtítulos automáticos de la plataforma**: desactívalos. Los subtítulos ya están quemados en el video y aparecerían duplicados.

---

## B. Reconstrucción en CapCut desde el video original

### B1. Proyecto
- Relación **9:16**, 1080×1920, 30 fps.
- Importa el `.mov` original (478×850, 29.94 fps).
- Selecciona el clip → **Básico → Escala 226 %**. Así llena el lienzo de 1080 de ancho; CapCut lo interpola.

### B2. Cortes en la pista principal
Divide con **Ctrl+B** en los tiempos **de origen** (minutos:segundos del `.mov`) y borra los tramos sobrantes. Todos los puntos de corte caen dentro de silencios medidos.

| # | Conservar (origen) | Frase | Borrar después |
|---|---|---|---|
| 1 | 00:01.90 – 00:03.77 | Puede que tu jefe te pague bien, | 03.77–04.22 |
| 2 | 00:04.22 – 00:06.39 | pero que le esté diciendo al IMSS | 06.39–06.80 |
| 3 | 00:06.80 – 00:07.93 | que ganas menos. | 07.93–08.74 |
| 4 | 00:08.74 – 00:11.34 | A esto se le llama subregistro salarial. | **11.34–33.14** (redundancia + estadística sin fuente) |
| 5 | 00:33.14 – 00:41.57 | El problema es que tu pensión… aparece registrado | 41.57–41.76 |
| 6 | 00:41.76 – 00:43.66 | y no con el que realmente recibes. | 43.66–44.20 |
| 7 | 00:44.20 – 00:46.87 | Si nunca comparaste tu recibo de nómina | 46.87–47.33 |
| 8 | 00:47.33 – 00:52.86 | con tu constancia del IMSS… sin que lo sepas. | **52.86–55.48** ("Ahorita mismo, mientras ves este video") |
| 9 | 00:55.48 – 00:59.25 | Saca tu constancia de semanas cotizadas en la app del IMSS | 59.25–59.74 |
| 10 | 00:59.74 – fin | y cuéntame: ¿qué te salió? ¿Coincide o no? | — |

- Al terminar, el clip final debe durar ≈ 34.8 s.
- Al último fotograma añade **Congelar** de 0.7 s.
- En cada corte aplica **Audio → Fundido** de entrada y de salida de 0.01 s para evitar clics. No uses transiciones de video: todos son cortes secos.

### B3. Zoom / punch-in (pista principal, **Básico → Escala** con keyframes)
Para todos los zooms, el ancla es la cara horizontalmente y un punto bajo (aprox. 90 % de la altura). Si CapCut solo escala desde el centro, compénsalo con **Posición Y ≈ +4 %** para que la cara no baje hacia los subtítulos.

| Tiempo final | Segmento | Escala (sobre la base del 226 %) | Keyframe |
|---|---|---|---|
| 00:00.00 → 00:00.45 | 1 | 100 % → 106 % | ease-out ("Salida suave") |
| 00:01.87 | 2 | 110 % | corte seco: el keyframe va en el primer fotograma del clip |
| 00:04.03 → 00:05.17 | 3 | 110 % → 113 % | lineal suave |
| 00:05.17 | 4 | 100 % | — |
| 00:07.77 | 5–6 | 108 % | — |
| 00:18.10 | 7 | 100 % | — |
| 00:20.77 → 00:26.30 | 8 | 100 % → 103 % | lineal |
| 00:26.30 | 9 | 103 % | — |
| 00:30.07 | 10 | 100 %; posición Y −170 px entre 30.13 y 30.53 | ease in-out |

> La "Estabilización" y el "Seguimiento de cámara/rostro" de CapCut no hacen falta: el plano es fijo y el rostro se mueve menos de ±25 px.

### B4. Corrección de color (Ajustar)
Corrige primero y estiliza solo si hace falta. No uses filtros de belleza ni suavizado de piel.

| Ajuste | Valor |
|---|---|
| Temperatura | −4 |
| Tono | 0 |
| Contraste | +6 |
| Saturación | −5 |
| Nitidez | +10 |
| Reducción de ruido (si la versión lo tiene) | baja |

### B5. Subtítulos (pista de texto)
Importa `SUBTITULOS.srt`: **Texto → Subtítulos locales → Importar**.

Estilo:
- Fuente **Inter Bold** o **Poppins SemiBold**, 9–10 pt.
- Color `#F5F2EB`.
- Fondo `#191919` al 90 %, radio 14.
- Posición Y ≈ −470 px desde el centro (centro del texto en y = 1445 de 1920).

Palabra clave por bloque: selecciónala y aplica **color `#D9F35B`**.

| Bloque | Palabra clave |
|---|---|
| Puede que tu jefe | jefe |
| te pague bien | bien |
| pero que le esté | pero |
| diciendo al IMSS | IMSS |
| El problema es que | problema |
| Si nunca comparaste | nunca |
| tu recibo de nómina | nómina |
| con tu constancia del IMSS | constancia |
| es muy probable | probable |
| que esto te esté pasando | pasando |
| también a ti | ti |
| sin que lo sepas | sepas |
| Saca tu constancia | constancia |
| de semanas cotizadas | semanas cotizadas |
| en la app del IMSS | app |

- **Animación de entrada**: "Fundido + subir" (o *Fade in* + *Slide up*), 0.14 s. Sin animación de salida.
- **Animaciones que no hay que usar**: rebotes, máquina de escribir y "Pop" exagerado.
- **Bloques que hay que borrar**: los que coinciden con las tarjetas (04.03–05.17, 05.17–07.77, 09.13–18.10 y desde 30.07). En esos tramos la tarjeta ya hace de subtítulo.

### B6. Gráficos editoriales (pistas de texto/forma sobre el video)
Todos van dentro de x 120–960 px y por encima de y = 1540 px.

1. **00:00.00–04.30 · Kicker superior**
   - Texto "NÓMINA vs. IMSS", Inter SemiBold, espaciado +2, color `#F5F2EB`, sobre una caja `#191919` al 85 % con radio 12.
   - Cuadrito lima a la izquierda.
   - Posición: x = 120, y = 262 px.
   - Salida: fundido de 0.2 s.
2. **00:04.15–05.17 · "que ganas" + "MENOS"**
   - "que ganas": caja carbón, Inter Bold.
   - 04.61: aparece "MENOS" en Inter Bold de 128 px, color lima sobre caja carbón.
   - Animación de entrada: **Revelar ↑ / Wipe up**, 0.18 s.
   - SFX: un golpe grave corto.
3. **00:05.29–07.77 · Tarjeta de término**
   - Rectángulo carbón al 93 %, de 840×214 px, radio 28, en y = 1318.
   - Texto pequeño: "A esto se le llama".
   - 06.48: "Subregistro salarial" en Inter Bold de 74 px, con animación **Barrido →** de 0.35 s.
   - 06.83: línea lima de 8 px debajo del término que crece de izquierda a derecha en 0.4 s (keyframes de escala X de 0 → 100 % con el ancla a la izquierda).
   - SFX: clic suave en 06.48.
4. **00:09.33 / 10.38 / 11.98 · Chips** (fila 1, y = 1340; fila 2, y = 1440)
   - Píldoras carbón de 80 px de alto con punto lima: "Pensión", "Incapacidades", "Crédito Infonavit".
   - Entrada: "Fundido + desplazar →", 0.16 s.
   - Salida conjunta: 14.13.
5. **00:14.13–18.10 · Comparativa** (tarjeta carbón de 840×234 px, en y = 1300)
   - Columna izquierda: título "SE CALCULAN CON" y una caja lima con "Sueldo registrado" en Inter Bold de 46 px, color carbón.
   - 16.32: aparece la columna derecha, con título "NO CON" y una caja de contorno blanco cálido con "Lo que recibes".
   - 17.09–17.69: una línea lima de 8 px tacha "recibes" (escala X, de izquierda a derecha).
   - SFX: clic en 17.09.
6. **00:30.13–final · CTA**
   - Panel `#191919` de ancho completo, con las esquinas superiores redondeadas a 44. Entra desde abajo y su borde superior queda en y = 1290, en 0.4 s ease in-out. Al mismo tiempo el video sube 170 px.
   - 30.38: aparecen el kicker lima "¿NO COINCIDE?" y el título "¿Quieres conocer tus opciones?" (Inter Bold de 52 px).
   - 30.58: aparece la burbuja DM lima "INFO" (236×104 px, radio 30, con la cola abajo a la izquierda), con escala 82 → 100 % en 0.32 s y un rebote mínimo.
   - Junto a la burbuja va el texto "Escríbeme **INFO** / por mensaje privado".
   - SFX: "pop" de dos tonos.
   - Comprueba en la **vista previa de la plataforma** que el panel no quede tapado. Si se solapa con la descripción de la publicación, sube todo 60 px.

### B7. Audio
1. Pista de voz:
   - **Reducción de ruido**: activada, nivel bajo-medio.
   - **Mejorar voz**: desactivado, porque vuelve la voz metálica.
   - **Normalizar volumen**: activado.
2. Música: igual que en A1, a −24 dB y con ducking.
3. SFX, entre 4 y 5 en total, con el volumen al 25–35 %:
   - impacto suave en 00.00;
   - golpe grave en 04.61;
   - clic en 06.48;
   - clic en 17.09;
   - pop en 30.58.

   La biblioteca de CapCut tiene equivalentes ("UI click", "soft impact", "bubble pop"). Los archivos WAV originales están en `.work/sfx_*.wav` después de ejecutar `RENDER.sh`.
4. Objetivo de la mezcla: −14 LUFS y un pico de −1.5 dBTP.

### B8. Versión B (hook alternativo)
Usa el mismo proyecto. Reordena los clips así:

**5 → 6 → 1 → 2 → 3 → 4 → 7 → 8 → 9 → 10**

Ajustes de la versión B:
- El clip 5 empieza en el origen **00:34.46**, sin "El problema es que". El corte cae en el cierre de la "t", así que no corta ninguna palabra.
- Zoom del clip 5: de 100 a 107 % en 0.45 s.
- El chip "Pensión" está visible desde el fotograma 0.
- Usa `SUBTITULOS_B.srt`.
