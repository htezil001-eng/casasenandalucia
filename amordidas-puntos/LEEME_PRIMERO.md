# Amordidas Puntos — Cómo usar este paquete 🍓🐊

> **Actualización:** la app ya está construida. Sigue los pasos de **README.md** (base de datos, prueba local y publicación en Vercel). Usa el `supabase/schema.sql` de esta carpeta: es la versión corregida para Supabase.

## Qué trae
- `CLAUDE.md`: especificación completa. Claude Code la lee solo.
- `supabase/schema.sql`: base de datos con todas las reglas antifraude, ya probada.
- `assets/`: logo e íconos de la app.
- `referencia/prototipo.html`: el demo que ya viste, como guía.
- `.env.example`: las claves que vas a llenar.

## Paso 1 — Crea tus cuentas gratis (10 min)
1. **GitHub** (github.com): crea un repositorio nuevo llamado `amordidas-puntos` y sube **todo el contenido de esta carpeta** (puedes arrastrar los archivos desde la web: "Add file → Upload files").
2. **Supabase** (supabase.com): crea un proyecto nuevo (plan Free, región *East US*).
   - Ve a **SQL Editor**, pega todo el contenido de `supabase/schema.sql` y presiona **Run**.
   - Ve a **Authentication → Users → Add user** y crea tu usuario de gerente (tu correo y una contraseña).
   - Copia el ID del usuario y, de nuevo en el SQL Editor, corre:
     ```sql
     insert into public.staff(id, name, role) values ('PEGA-EL-ID', 'Tu nombre', 'gerente');
     ```
   - Repite lo mismo para cada repartidor, pero con `'repartidor'`.
   - En **Authentication → Providers**, deja activo solo **Email** y apaga "Allow new users to sign up". Así nadie de fuera puede crearse una cuenta.
3. **Vercel** (vercel.com): crea una cuenta con tu GitHub. La usarás al final para publicar.

## Paso 2 — Abre el proyecto en Claude Code
Conecta el repositorio `amordidas-puntos` en Claude Code y escribe:

> Lee CLAUDE.md y construye la app completa según la especificación. Usa supabase/schema.sql tal cual (ya está aplicado en mi proyecto de Supabase). Cuando termines, dime qué variables de entorno poner en Vercel y cómo publicarla.

## Paso 3 — Publica
En Vercel: **Add New → Project →** elige el repositorio, pega las variables de `.env.example` con tus datos reales (Supabase → Project Settings → API) y presiona **Deploy**.

## Costo
$0 con los planes gratuitos de Supabase y Vercel. WhatsApp funciona con enlaces normales (`wa.me`), así que tampoco cuesta.

> Nota: un proyecto gratuito de Supabase se pausa si pasa 1 semana sin uso. Se reactiva con un clic desde su panel.
