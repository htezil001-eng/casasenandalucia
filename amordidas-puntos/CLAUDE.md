# Amordidas Puntos — Especificación del proyecto

App de puntos de lealtad para **Amordidas** ("Dale una mordida al antojo."), un negocio de postres con fresas y **delivery propio** en México. Es un **DEMO**: el objetivo es que funcione de verdad, se vea bien en el celular y **cueste $0**.

## Idea central
- **El negocio registra y controla todo.** El equipo da de alta clientes, crea pedidos, confirma entregas y canjea premios.
- **El cliente solo consulta.** No tiene usuario ni contraseña. Recibe por **WhatsApp** un link personal secreto (`/c/<token>`) donde ve sus puntos, su historial, sus premios, el código de entrega de su pedido y el código de canje. **No puede editar nada.**

## Puntos semanales (regla principal)
- **1 punto por cada $1** de pedido entregado.
- **El contador se reinicia cada lunes a las 00:00 (hora de Ciudad de México).** Los puntos no se acumulan de una semana a otra.
- No se borra nada: el historial completo se guarda y el saldo se calcula solo con los movimientos de la semana (ya resuelto en SQL con `private.week_start()`).
- Premios de la semana:
  | Puntos | Premio |
  |---|---|
  | 300 | Frappé |
  | 500 | 4 dedos de queso |
  | 800 | Crepa |
  | 1200 | Fresas con crema de 13 oz |
- Al canjear se descuentan los puntos del saldo disponible de esa semana.
- `customer_view` devuelve:
  - `week_earned`: lo que lleva ganado en la semana
  - `balance`: lo disponible para canjear
  - `rewards[].faltan`: lo que le falta para cada premio
  - `week_resets_at`: cuándo se reinicia

## Stack (todo con plan gratuito)
- **Next.js (App Router) + TypeScript + Tailwind**, como PWA instalable (manifest + íconos en `/assets`).
- **Supabase** (plan Free): Postgres + Auth (correo y contraseña, **solo para el equipo**). Sin SMS: los clientes no inician sesión.
- **Vercel** (plan Hobby) para publicar.
- **WhatsApp sin costo:** solo enlaces `https://wa.me/52<10 dígitos>?text=<mensaje codificado>`. No usar la API de WhatsApp Business (cuesta).

## Base de datos
- Ya está escrita y probada en `supabase/schema.sql`. **Úsala tal cual** y no la rediseñes.
- Ninguna tabla se lee ni se escribe directo desde el navegador. Todo pasa por funciones RPC (`supabase.rpc(...)`), que validan el rol, las reglas y los límites.
- El cliente usa solo `customer_view(token)` con la anon key.
- El equipo usa las demás RPC con su sesión iniciada.
- **Nunca** pongas la `service_role` key en el frontend ni en variables `NEXT_PUBLIC_*`.

## Pantallas

### 1. Link del cliente — `/c/[token]` (público, solo lectura)
- Logo arriba. Saludo: "Hola, {nombre}".
- **Lo más importante de la pantalla:** un contador enorme, "Llevas **{week_earned}** puntos esta semana". Si ya canjeó algo, debajo y más chico: "Disponibles: {balance}".
- Cuenta regresiva: "Tus puntos se reinician el lunes · faltan 2 días 5 h" (usar `week_resets_at`). Cuando falten 2 días o menos, ponerla en amarillo.
- **Escalera de premios:** una barra de progreso vertical u horizontal con los 4 premios como metas (300, 500, 800, 1200).
  - Para cada premio: "Te faltan **{faltan}** pts" o "¡Ya lo tienes! 🎉 Pídelo al hacer tu pedido".
  - Destacar el siguiente premio por alcanzar.
- Texto fijo pequeño: "1 punto por cada $1 · El contador se reinicia cada lunes".
- **Pedido en camino:** folio, monto, puntos que ganará y el **código de entrega de 4 dígitos** grande, con el texto "Dáselo al repartidor solo cuando recibas tu pedido".
- **Canje activo:** código de 6 caracteres grande con barra de tiempo (cambia cada 30 s), con el texto "Muéstraselo a quien te entrega el premio".
- Los premios **no tienen botón de canjear**: el canje lo inicia el negocio.
- Historial de **esta semana**: fecha, detalle y puntos.
- Botón verde "Pedir por WhatsApp" a `wa.me/<NEXT_PUBLIC_WHATSAPP_NEGOCIO>` con el texto "Hola Amordidas, soy {nombre}, quiero hacer un pedido 🍓".
- Refrescar cada 5 s mientras haya pedido en camino o canje activo; si no, cada 30 s.
- Si el token no existe: "Este link no es válido. Pide uno nuevo por WhatsApp", con el botón de WhatsApp.

### 2. Inicio de sesión del equipo — `/equipo/login`
Correo y contraseña de Supabase. Después redirigir según el rol (`my_staff_profile()`).

### 3. Panel del gerente — `/equipo/gerente`
- **Clientes:** búsqueda, alta (nombre y WhatsApp) y editar o desactivar.
  - Al dar de alta, mostrar el botón **"Enviar link por WhatsApp"**: `wa.me/52{tel}?text=¡Hola {nombre}! 🍓 Bienvenid@ a Amordidas Puntos. Aquí puedes ver tus puntos: {URL}/c/{token}`.
  - Botón "Generar link nuevo" (`rotate_customer_token`) por si el link se filtró.
- **Nuevo pedido:** elegir cliente, monto y repartidor (`create_order`). Después ofrecer "Avisar por WhatsApp": "Tu pedido {folio} va en camino 🛵. Abre tu link para ver tu código de entrega: {URL}/c/{token}". **El código nunca va en el mensaje.**
- **Canjear premio:** elegir cliente y premio (`start_redeem`), y luego un campo para el código que dicta el cliente (`confirm_redeem`).
- **Ajuste manual:** puntos (±), motivo obligatorio (`manual_adjust`).
- **Alertas** (`manager_alerts`), **historial completo** (`manager_ledger`) y el botón "Verificar historial" (`verify_ledger`), que muestra ✅ o ⚠️.
- En la lista de clientes, mostrar los puntos de la semana y una columna con el siguiente premio y cuánto le falta.
- Botón "Mandar saldo por WhatsApp" en cada cliente, con el texto: "Hola {nombre} 🍓, llevas {week_earned} pts esta semana. Te faltan {faltan} para tu {siguiente premio}. ¡Se reinician el lunes! {URL}/c/{token}".
- Sección **"Recordatorios de fin de semana"**: lista de los clientes a quienes les faltan 150 puntos o menos para el siguiente premio, cada uno con su botón de WhatsApp prellenado. Ayuda a vender más el sábado y el domingo.

### 4. App del repartidor — `/equipo/repartidor`
- Lista de mis entregas (`my_deliveries`) **sin código**. Botón "Abrir WhatsApp del cliente".
- Campo de 4 dígitos y el botón "Confirmar entrega" (`confirm_delivery`). Mostrar los intentos (x/3) y los puntos otorgados.
- "Canjear premio" igual que el gerente (buscar cliente → premio → código).

## Reglas antifraude (ya implementadas en SQL, no duplicar lógica en el frontend)
- Los puntos solo se dan al confirmar la entrega con el código que únicamente ve el cliente.
- Tres códigos incorrectos bloquean el pedido y generan una alerta.
- Límites diarios: 3 pedidos con puntos y 1500 puntos por cliente (zona horaria de Ciudad de México).
- Alerta si un mismo repartidor entrega 3 o más veces al día al mismo cliente.
- El canje necesita el código rotativo del cliente (ventana de 30 s, un solo uso, la sesión dura 5 min).
- Historial *append-only* con cadena de hashes. Un trigger impide cualquier UPDATE o DELETE.
- Ajustes manuales solo para el gerente, con motivo y un máximo de ±300 puntos.
- Reinicio semanal automático, calculado en SQL. No hace falta ningún proceso programado.
- Las reglas se editan en la tabla `private.rules`.

## Marca
- Logo: `assets/logo.png` (el original está en `assets/logo-original.png`). Íconos PWA: `assets/icon-192.png` y `assets/icon-512.png`.
- Colores:
  - Rosa `#E0509A` (principal y botones)
  - Azul `#2F5BB7`
  - Verde `#5CB82E` (tarjeta de saldo)
  - Amarillo `#F5E14A` (acentos)
  - Morado `#3B2366` (texto y bordes)
  - Rojo fresa `#D6304A` (errores)
  - Fondo `#FFF8FB`
  - Verde WhatsApp `#25D366`
- Tipografía: **Fredoka** (Google Fonts), redondeada como el logo. Esquinas muy redondeadas (16–20 px) y bordes gruesos suaves. Tono alegre, mobile-first.
- Todo el texto en **español de México**.

## Referencia
`referencia/prototipo.html` es el prototipo funcional del flujo, con el servidor simulado. Úsalo para el flujo y los textos, no para la arquitectura. **Ojo:** el prototipo es anterior al cambio a puntos semanales. Sus premios, su proporción de puntos y su caducidad están desactualizados; manda esta especificación.

## Variables de entorno (`.env.local`)
Ver `.env.example`.

## Entregables
1. El proyecto Next.js funcionando en local con `npm run dev`.
2. `README` con los pasos para publicar en Vercel.
3. Un script `supabase/seed.sql` opcional con premios y datos de prueba.
4. Probar el flujo completo: alta del cliente → pedido → código en el link → entrega → puntos → canje.
