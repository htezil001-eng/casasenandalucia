# Informe final: Reel "Subregistro salarial"

## 1. Material analizado

| Dato | Valor (ffprobe) |
|---|---|
| Archivo | `.mov` único, sin B-roll ni identidad de marca proporcionada |
| Video | H.264, **478×850 vertical** (9:16), 29.94 fps, 64.56 s, 1.2 Mb/s |
| Audio | AAC mono 44.1 kHz; −26.6 dB de media y −7.6 dB de pico; sin zumbido apreciable |
| Plano | Selfie fijo, fondo de madera cálido, blusa azul claro, luz suave. El rostro ocupa el centro y se mueve menos de ±25 px |

**Limitación de origen:** la resolución es baja, así que se escala ×2.26 para llegar a 1080×1920. Por eso los zooms se limitaron a un máximo de 113 % y se aplicó un enfoque suave (unsharp) sin halos.

## 2. Transcripción literal (corregida) con marcas de tiempo de origen

**Método.** Whisper small (ONNX q8, Apache-2.0) ejecutado en local con timestamps por palabra. Los pasajes dudosos se re-transcribieron por separado y se contrastaron con la envolvente de energía y con `silencedetect`.

**Correcciones sobre el reconocimiento automático:**
- "lims / limbs / alims" → **IMSS**
- "cotas" → **cuotas**
- "en FONABIT" → **Infonavit** (la reescucha aislada devolvió "crédito infonabit")
- "según el propio [omitido]" → **según el propio IMSS** (confirmado en la segunda pasada)

| Origen | Texto |
|---|---|
| 0.00–1.99 | (silencio) |
| 1.99–7.77 | Puede que tu jefe te pague bien, pero que le esté diciendo al IMSS que ganas menos. |
| 8.86–11.22 | A esto se le llama subregistro salarial. |
| 11.89–18.21 | Muchas de las empresas registran a sus trabajadores con un sueldo menor al que realmente les pagan, para pagar menos cuotas al IMSS. |
| 18.78–32.15 | Es tan común que, según el propio IMSS, la diferencia promedio entre lo que la gente gana y lo que se reporta es más de 580 pesos diarios, casi 17,400 pesos al mes. |
| 33.26–43.55 | El problema es que tu pensión, tus incapacidades y hasta tu crédito Infonavit se calculan con el sueldo que aparece registrado y no con el que realmente recibes. |
| 44.32–52.74 | Si nunca comparaste tu recibo de nómina con tu constancia del IMSS, es muy probable que esto te esté pasando también a ti sin que lo sepas. |
| 53.35–64.00 | Ahorita mismo, mientras ves este video, saca tu constancia de semanas cotizadas en la app del IMSS y cuéntame: ¿qué te salió? ¿Coincide o no? |

**Nivel de confianza.** Alto en todo el texto. La palabra "Infonavit" se dedujo por contexto y por la segunda pasada; conviene confirmarla con la asesora.

## 3. Lectura editorial

- **Tema real:** el video no habla de seguros ni de ahorro. Trata del **subregistro salarial ante el IMSS** y de su efecto en pensión, incapacidades e Infonavit. Por eso la estrategia y la CTA se adaptaron a ese tema y no se mencionó ningún producto.
- **Mejor hook:** la primera frase. Es contraria a la expectativa ("tu jefe te paga bien, pero…"), concreta y se resuelve en 5 s.
- **Segundo hook válido:** "Tu pensión, tus incapacidades y hasta tu crédito Infonavit se calculan con el sueldo registrado…". Es un hook de consecuencias, y se usa en la versión B.
- **Mejores frases para generar confianza:** "Si nunca comparaste tu recibo de nómina…" y "…es muy probable que esto te esté pasando también a ti sin que lo sepas".
- **Energía y muletillas:** la locución es fluida y casi no tiene muletillas. Las pérdidas de ritmo se concentran en los silencios (en total ≈ 9 s) y en dos bloques largos que repiten información.

## 4. Decisiones de montaje

1. **Recorte de 64.6 s a 35.5 s (A) y 34.2 s (B).** No se aceleró la voz y ningún corte cae a mitad de palabra: todos están en silencios medidos o en el cierre oclusivo de una consonante. Cada unión lleva un fundido de 8 ms. El análisis de discontinuidades confirma que no hay clics: el salto máximo es ≤0.001.
   - **Duración.** La versión A dura 0.5 s más de los 35 s previstos. Se aceptó porque lo que alarga es la CTA, que ocupa unos 5 s.
2. **Bloques omitidos:**
   - **"Muchas de las empresas…" (6.3 s).** Repite lo que ya dice el hook.
   - **Estadística "580 pesos diarios / 17,400 al mes" (13.4 s).** La asesora la atribuye al IMSS, pero no hay fuente documental en el material. Publicar una cifra sin verificar en una pieza de captación es un riesgo de cumplimiento, sobre todo en publicidad pagada. Si la asesora aporta la fuente (por ejemplo, un comunicado o un informe del IMSS con fecha), puede reincorporarse como versión C (+11 s), con la fuente sobreimpresa.
   - **"Ahorita mismo, mientras ves este video" (2 s).** Es una muletilla de transición.

   Ninguna omisión cambia el sentido de las frases conservadas. El orden de la versión A es el original. En la versión B, el bloque de consecuencias pasa delante, pero ninguna frase se altera.
3. **Seis intervenciones visuales** (y nada más):
   1. Punch-in del hook + kicker "NÓMINA vs. IMSS".
   2. Palabra de alto contraste "MENOS".
   3. Tarjeta de término "Subregistro salarial" con subrayado animado.
   4. Chips "Pensión / Incapacidades / Crédito Infonavit".
   5. Comparativa "Sueldo registrado" frente a "Lo que recibes", con tachado.
   6. Panel de CTA con burbuja de DM.

   Solo hay tres interrupciones de patrón (inicio, giro "El problema es que…" y CTA). El bloque de confianza (18–30 s) es un plano limpio, solo con subtítulos.
4. **Reencuadre y tracking.** El zoom se ancla en la posición horizontal del rostro, detectada con OpenCV Haar y suavizada con una gaussiana de 1 s, y en un punto vertical bajo. Así, al acercar, la cara sube y se aleja de la franja de texto. La boca queda siempre libre y la frente nunca se corta.
5. **Subtítulos cinéticos.** Bloques de 2 a 5 palabras con una palabra clave en lima, entrada de 0.14 s (fundido y subida de 16 px) y sin rebotes. Van sobre una cinta carbón para que se lean igual sobre la piel y sobre la blusa clara. Los tiempos salen de la alineación por palabra, ajustada al final de los silencios.
6. **Color.** Reducción de ruido ligera (hqdn3d), balance de blancos un poco más frío para contrarrestar el naranja del fondo, contraste +6 % y saturación −5 %. No se aplicó suavizado de piel, filtro de belleza ni ningún cambio de rasgos.
7. **CTA.**
   - **Texto.** "¿NO COINCIDE? · ¿Quieres conocer tus opciones? · [INFO] Escríbeme INFO por mensaje privado". Es una sola acción.
   - **Por qué encaja.** La pregunta de la asesora ("¿Coincide o no?") se convierte en el gancho de la CTA, y su "cuéntame" se convierte en "Escríbeme".
   - **Lo que no incluye.** No pide comentar, seguir ni compartir.
   - **Posición.** Las líneas esenciales van entre y 1320 y 1530, por encima de la reserva inferior de 380 px.

## 5. Sonido

**Voz.** Cadena: pasa-altos de 80 Hz → `afftdn` moderado (nr 10) → compresor 2.5:1 → normalización a −16 LUFS. El timbre se conserva y no hay efectos robóticos.

**Música.** Base **original sintetizada por código** (`synth_audio.py`), por lo que no hay terceros ni licencias de por medio:
- 92 BPM, progresión Fmaj7–Am7–Cmaj7–G6 con pad, piano eléctrico suave, sub y percusión mínima.
- Va unos 24 dB por debajo de la voz, con ducking por sidechain.
- Es funcional pero sencilla. Para pautar, se recomienda sustituirla por una pista con licencia comercial (ver CAPCUT_GUIA A1).

**SFX.** Cinco efectos, también sintetizados:
- impacto suave en el hook;
- golpe grave en "MENOS";
- dos clics editoriales;
- un pop en la burbuja de DM.

**Máster.** −14.1 LUFS (A) y −14.0 LUFS (B); pico −2.4 / −3.0 dBFS; LRA 2.7 / 3.7 LU.

## 6. Verificación técnica de los exportados

| Archivo | Formato | Duración | Fotogramas | Estado |
|---|---|---|---|---|
| FINAL_REELS_1080x1920.mp4 | H.264 High yuv420p 1080×1920 30 fps CFR + AAC 48 kHz estéreo 192 kb/s, faststart | 35.53 s | 1066 | Decodificación completa sin errores |
| VERSION_B_HOOK.mp4 | Igual que A | 34.23 s | 1027 | Decodificación completa sin errores |
| PORTADA.png | 1080×1920. Fotograma real (origen 52.9 s, ojos abiertos y sonrisa leve) + titular de 6 palabras "¿El IMSS conoce tu sueldo real?" dentro del recorte 3:4 de la cuadrícula | — | — | — |
| SUBTITULOS.srt / SUBTITULOS_B.srt | Transcripción final sincronizada con cada versión | — | — | — |
| SUBTITULOS_ESTILO.ass | Estilo y animación de los subtítulos (Inter Bold, cinta carbón, palabra clave en lima, `\fad`). Validado con libass | — | — | — |

**Revisión de fotogramas.** Se revisaron fotogramas del archivo codificado en todos los momentos con gráficos: 0, 2, 4.8, 6.7, 8.3, 14.3, 17.2 y 35.3 s. Se detectaron y corrigieron dos fallos:
- en la versión B, el chip "Pensión" no aparecía en el fotograma 0;
- la primera portada tenía la boca abierta a media palabra.

**Sincronía.** Video y audio salen de la misma lista de cortes, cuantizada a fotogramas exactos. La congelación final quedó en 0.7 s: el mux con `-shortest` recortó 3 fotogramas.

## 7. Control de calidad

| Pregunta | Respuesta |
|---|---|
| ¿Los primeros 2 s despiertan interés sin mentir? | Sí. A abre con "Puede que tu jefe te pague bien," y la idea se resuelve en 5 s. B abre con "Pensión" y "Tu pensión… se calculan con el sueldo registrado". |
| ¿Se entiende sin audio? | Sí. Hay subtítulos completos y las tarjetas sustituyen al subtítulo en los conceptos clave. La CTA es textual. |
| ¿Hay errores en los subtítulos? | Se revisaron a mano: ortografía, tildes (nómina, pensión, cuéntame) y siglas (IMSS, Infonavit). Pendiente: confirmar "Infonavit" con la asesora. |
| ¿Cada efecto aporta algo? | Sí. Cada uno explica un concepto o marca un giro. No hay transiciones decorativas. |
| ¿La asesora conserva su naturalidad? | Sí. Velocidad, voz y gestos son originales. Se conserva la pausa natural tras la coma, y el plano de confianza está limpio. |
| ¿Se entiende qué puede consultar el espectador? | Sí: si su sueldo registrado coincide con el real, y sus opciones. **Punto débil:** el video no dice qué hace la asesora (ver §8). |
| ¿La CTA se ve con claridad y sin nada que la tape? | Sí. Va en un panel opaco, en y 1320–1530. Hay que comprobarlo en la vista previa de cada plataforma, porque la descripción larga de Instagram y TikTok puede crecer. |
| ¿Hay promesas financieras sin respaldo? | No. Se eliminó la única cifra y no se prometen resultados, coberturas ni ahorros. |
| ¿El archivo existe y se reproduce? | Sí. Lo confirman ffprobe y una decodificación completa. |

## 8. Cumplimiento y puntos que hay que validar con la asesora

1. **Afirmaciones que conserva el video** (son de la asesora):
   - el subregistro salarial existe;
   - la pensión, las incapacidades y el crédito Infonavit se calculan con el salario registrado.

   Son información general correcta en términos amplios. Aun así, conviene que la asesora confirme que está cómoda con la formulación absoluta: los cálculos dependen del régimen de cada persona (Ley 73 o Ley 97), de los topes salariales, etc.
2. **Estadística omitida.** Si se reincorpora, hay que citar la fuente exacta y la fecha.
3. **Qué ofrece la asesora.** El material no menciona seguros, planes de retiro ni ningún producto. La CTA ("conocer tus opciones") es deliberadamente genérica para no atribuirle servicios que no menciona.
   - **Recomendación:** que la asesora defina qué responderá a quien escriba INFO (orientación sobre retiro, protección, etc.), para que la respuesta sea coherente y no prometa resolver un problema laboral o legal. Una denuncia de subregistro corresponde al IMSS, PROFEDET o un abogado laboral.
   - En la descripción del post puede aclararse su perfil: "Asesora independiente de seguros y planeación financiera".
4. **Independencia.** No se menciona ni se insinúa ninguna aseguradora.
5. **Si se usa como anuncio pagado** (México + Meta/TikTok):
   - **Categoría.** Meta y TikTok exigen declarar la categoría de servicios financieros/seguros. En algunos países eso restringe la segmentación por edad o por código postal. Revisa el estado actual en México.
   - **Producto.** Si en el futuro el anuncio promociona un producto de seguro o ahorro, el contenido debe ajustarse a las disposiciones de publicidad de la **CNSF** (Circular Única de Seguros y Fianzas, publicidad) y de **CONDUSEF**. Entre ellas: no ofrecer beneficios, rendimientos o coberturas no contractuales; identificar al agente y su cédula/autorización vigente; no usar urgencia artificial.
   - **Organismos públicos.** No usar logotipos del IMSS ni del Infonavit, ni sugerir afiliación con ellos. La pieza actual cumple: solo los nombra.
   - Confirma la cédula de agente vigente de la asesora antes de pautar.
6. **Derechos.** Música y SFX son originales. La tipografía es Inter (SIL Open Font License). El modelo de transcripción es Whisper (MIT) en la conversión ONNX de Xenova, con licencia Apache-2.0.

## 9. Lo que se ejecutó y lo que no

**Ejecutado de verdad:**
- transcripción;
- cortes;
- reencuadre con tracking;
- zooms con keyframes y easing;
- corrección de color;
- subtítulos y tipografía cinética;
- motion graphics;
- limpieza de voz;
- música y SFX originales con ducking;
- loudness a dos pasadas;
- export y verificación;
- portada.

**No ejecutado, con su motivo:**

| Elemento | Motivo |
|---|---|
| Texto detrás de la persona / segmentación de sujeto | No hay un modelo de segmentación fiable disponible offline. Con un recorte sucio se verían bordes en el pelo, así que se descartó, como indica el brief. |
| Speed ramps | No hay B-roll ni movimientos de cámara a los que aplicarlos. Sobre la voz están prohibidos. |
| Música con licencia de biblioteca | Las bibliotecas externas no estaban accesibles desde este entorno. Se sustituyó por música original (ver CAPCUT_GUIA A1). |
| Transcripción con Whisper large-v3 | Hugging Face estaba bloqueado por la red. Se usó Whisper small y se reforzó con una re-transcripción por pasajes y con revisión manual. |
| Proyecto editable de CapCut | Formato propietario, no validable. Se entrega una guía paso a paso con marcas de tiempo. |

## 10. Pruebas A/B sugeridas

1. **Hook (incluido).** A, contrario a la expectativa ("tu jefe te paga bien…"), frente a B, consecuencias ("tu pensión… se calculan con el sueldo registrado"). Mismo cuerpo y misma CTA. Métricas: retención a 3 s, % de vistas a 50 % y DMs con "INFO" por cada 1,000 alcances.
2. **Kicker superior.** "NÓMINA vs. IMSS" frente a "¿Tu sueldo real está registrado?".
3. **CTA.** "¿Quieres conocer tus opciones?" frente a "¿Quieres revisar tu caso?". Hay que validar antes qué puede ofrecer la asesora en esa conversación.
4. **Versión C con la estadística.** Solo si la asesora aporta la fuente: comprobar si el dato concreto sube la retención a pesar de sumar unos 11 s.
5. **Portada.** Titular "¿El IMSS conoce tu sueldo real?" frente a "Tu pensión depende de esto".

**Descripción sugerida para el post** (sin cifras ni promesas):
> ¿Tu constancia del IMSS coincide con lo que realmente ganas? Revísala en la app del IMSS (constancia de semanas cotizadas). Si quieres conocer tus opciones, escríbeme INFO por mensaje privado.
> Asesora independiente. Información general, no constituye asesoría legal.

## 11. Cómo reproducir

```bash
./RENDER.sh /ruta/al/video_original.mov
```

**Dependencias:**
- ffmpeg con libass
- Python 3 con numpy, pillow y `opencv-python-headless<5`
- la fuente Inter

**Archivos:**
- `scripts/edl.py`: decisiones (segmentos, zooms, bloques de subtítulos, tiempos de los gráficos)
- `scripts/render.py`: renderizado
- `scripts/synth_audio.py`: música y SFX
