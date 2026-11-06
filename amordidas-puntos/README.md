# Amordidas Puntos 🍓🐊

App de puntos semanales para Amordidas. El negocio controla todo; el cliente solo consulta su link personal (`/c/<token>`) que le llega por WhatsApp.

- **Cliente** — `/c/<token>`: puntos de la semana, escalera de premios, código de entrega, código de canje, historial.
- **Gerente** — `/equipo/gerente`: clientes, pedidos, canjes, ajustes, recordatorios de fin de semana, alertas e historial.
- **Repartidor** — `/equipo/repartidor`: sus entregas, confirmar con el código de 4 dígitos, canjear premios.

Stack: Next.js 15 + TypeScript + Tailwind 4 (PWA instalable) · Supabase (plan Free) · Vercel (plan Hobby) · WhatsApp con enlaces `wa.me` (gratis).

---

## 1. Base de datos (Supabase)

1. Crea un proyecto en [supabase.com](https://supabase.com) (plan Free, región *East US*).
2. **SQL Editor** → pega y corre **uno** de estos archivos:
   - Proyecto nuevo: `supabase/schema.sql`.
   - Si ya habías corrido el `schema.sql` original del paquete: `supabase/actualizar_desde_original.sql`
     (el original fallaba en Supabase al entregar pedidos; este lo corrige sin tocar tus datos).
3. (Opcional) Corre `supabase/seed.sql` para tener 3 clientes de prueba con puntos.
4. **Authentication → Users → Add user**: crea tu usuario de gerente (correo y contraseña) y copia su ID. En el SQL Editor:
   ```sql
   insert into public.staff(id, name, role) values ('PEGA-EL-ID', 'Tu nombre', 'gerente');
   ```
   Repite para cada repartidor con `'repartidor'`.
5. **Authentication → Sign In / Providers**: deja solo **Email** y apaga **Allow new users to sign up**.

Las reglas (puntos por peso, límites diarios, tope de ajuste…) se cambian en la tabla `private.rules`. Los premios, en `public.rewards`.

## 2. Probar en tu computadora

Necesitas Node.js 20 o más nuevo.

```bash
cd amordidas-puntos
cp .env.example .env.local     # y llénalo con tus datos
npm install
npm run dev                    # abre http://localhost:3000/equipo/login
```

`.env.local`:

| Variable | De dónde sale |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase → Project Settings → API → Project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase → Project Settings → API → `anon` `public` key |
| `NEXT_PUBLIC_WHATSAPP_NEGOCIO` | WhatsApp del negocio: `52` + 10 dígitos, sin espacios ni `+` |
| `NEXT_PUBLIC_APP_URL` | `http://localhost:3000` en tu compu; en Vercel, tu dominio (`https://….vercel.app`) |

> **Nunca** pongas la llave `service_role` en estas variables ni en el código.

## 3. Publicar en Vercel

1. En [vercel.com](https://vercel.com) → **Add New → Project** → elige este repositorio.
2. **Root Directory**: `amordidas-puntos` (si la app vive en su propio repositorio, déjalo vacío).
3. Framework: Next.js (lo detecta solo).
4. **Environment Variables**: pega las 4 variables de arriba. En `NEXT_PUBLIC_APP_URL` pon la URL que te dará Vercel
   (si aún no la sabes, publica una vez, cópiala, cámbiala y vuelve a publicar con **Redeploy**).
5. **Deploy**.
6. En Supabase → **Authentication → URL Configuration**, pon tu URL de Vercel en **Site URL**.

Para instalarla como app: ábrela en el celular → menú del navegador → **Agregar a pantalla de inicio**.

## Flujo del día a día

1. **Alta**: Gerente → Clientes → *Nuevo cliente* → *Enviar link por WhatsApp*.
2. **Pedido**: Gerente → Pedidos → cliente, monto y repartidor → *Avisar por WhatsApp* (el mensaje lleva el link, **nunca** el código).
3. **Entrega**: el cliente ve su código de 4 dígitos en su link y se lo da al repartidor al recibir. El repartidor lo captura → el cliente gana 1 punto por cada $1.
4. **Canje**: Gerente o repartidor → *Canjear* → cliente → premio. El cliente abre su link, dicta el código de 6 caracteres (cambia cada 30 s) y se confirma.
5. **Fin de semana**: Gerente → *Recordatorios* → avisa a quienes les faltan 150 pts o menos.
6. Los puntos se reinician solos cada **lunes 00:00 (hora de CDMX)**. El historial completo se conserva.

## Notas

- Todas las reglas antifraude viven en la base de datos (funciones RPC); el navegador nunca lee ni escribe tablas directo.
- El proyecto gratuito de Supabase se pausa tras 1 semana sin uso; se reactiva con un clic desde su panel.
- Si un link de cliente se filtra: Gerente → Clientes → *Generar link nuevo* y reenvíalo.
- Si un pedido queda **bloqueado** (3 códigos incorrectos) o hay que anularlo: Gerente → Pedidos → *Cancelar*.

## Archivos

```
app/c/[token]/        Link del cliente (solo lectura)
app/equipo/login/     Inicio de sesión del equipo
app/equipo/gerente/   Panel del gerente
app/equipo/repartidor/ App del repartidor
components/           Piezas de la interfaz (gerente/, canje, buscador de clientes…)
lib/                  Supabase, WhatsApp, formatos y mensajes
public/assets/        Logo e íconos
supabase/             schema.sql, actualizar_desde_original.sql, seed.sql
CLAUDE.md             Especificación original
referencia/           Prototipo original (desactualizado, solo de referencia)
```
