-- =====================================================================
-- Amordidas Puntos — esquema de base de datos (Supabase / Postgres)
--
-- Versión corregida para Supabase:
--  * search_path incluye `extensions` (ahí vive pgcrypto en Supabase).
--  * El hash del historial usa epoch (no depende de la zona horaria).
--  * update_customer acepta números con 52 adelante.
--  * Alertas con nombres en lugar de IDs.
--  * Nuevas RPC: list_rewards, manager_orders, cancel_order.
--  * list_customers también devuelve notes (para poder editarlas).
-- Si ya corriste la versión original, usa actualizar_desde_original.sql.
-- Modelo: el NEGOCIO registra y controla todo; el CLIENTE solo consulta
-- con un link personal (token secreto), sin usuario ni contraseña.
--
-- PUNTOS SEMANALES: el contador se reinicia cada lunes 00:00 (hora CDMX).
-- No se borra nada: el historial completo se conserva y el saldo se
-- calcula solo con los movimientos de la semana en curso.
--
-- Principio de seguridad: ninguna tabla se lee ni se escribe directo
-- desde el navegador. Todo pasa por funciones (RPC) que validan rol,
-- reglas y límites dentro de la base de datos.
-- =====================================================================

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------
-- Esquema privado (no expuesto por la API de Supabase)
-- ---------------------------------------------------------------------
create schema if not exists private;
revoke all on schema private from public, anon, authenticated;

create table private.config (
  key text primary key,
  value text not null
);
-- Secreto para firmar códigos de canje. Se genera solo al instalar.
insert into private.config(key, value)
values ('hmac_secret', encode(gen_random_bytes(32), 'hex'))
on conflict do nothing;

create table private.rules (
  id boolean primary key default true check (id),
  pesos_por_punto           numeric not null default 1,   -- 1 punto por cada $1
  max_pedidos_dia           int     not null default 3,
  max_puntos_dia            int     not null default 1500,
  intentos_codigo_entrega   int     not null default 3,
  vigencia_codigo_canje_seg int     not null default 30,
  duracion_canje_min        int     not null default 5,
  ajuste_maximo             int     not null default 300,
  zona_horaria              text    not null default 'America/Mexico_City'
);
insert into private.rules default values on conflict do nothing;

-- ---------------------------------------------------------------------
-- Tablas
-- ---------------------------------------------------------------------

-- Equipo del negocio (inician sesión con Supabase Auth: correo + contraseña)
create table public.staff (
  id         uuid primary key references auth.users(id) on delete cascade,
  name       text not null,
  role       text not null check (role in ('gerente','repartidor')),
  active     boolean not null default true,
  created_at timestamptz not null default now()
);

-- Clientes: NO tienen cuenta. Solo un token secreto para su link.
create table public.customers (
  id           uuid primary key default gen_random_uuid(),
  name         text not null check (length(trim(name)) between 2 and 80),
  phone        text not null unique check (phone ~ '^[0-9]{10}$'),
  public_token text not null unique default encode(gen_random_bytes(18), 'base64'),
  notes        text,
  active       boolean not null default true,
  created_by   uuid references public.staff(id),
  created_at   timestamptz not null default now()
);
-- token apto para URL
alter table public.customers alter column public_token
  set default translate(encode(gen_random_bytes(18), 'base64'), '+/=', '-_');

create table public.rewards (
  id     text primary key,
  name   text not null,
  cost   int  not null check (cost > 0),
  active boolean not null default true
);
insert into public.rewards(id, name, cost) values
  ('frappe',  'Frappé',                       300),
  ('dedos',   '4 dedos de queso',             500),
  ('crepa',   'Crepa',                        800),
  ('fresas13','Fresas con crema de 13 oz',   1200)
on conflict do nothing;

create table public.orders (
  id            uuid primary key default gen_random_uuid(),
  folio         text not null unique default upper(substr(encode(gen_random_bytes(4),'hex'),1,6)),
  customer_id   uuid not null references public.customers(id),
  driver_id     uuid not null references public.staff(id),
  amount        numeric(10,2) not null check (amount > 0 and amount < 20000),
  delivery_code text not null default lpad((floor(random()*10000))::int::text, 4, '0'),
  status        text not null default 'en_camino'
                check (status in ('en_camino','entregado','bloqueado','cancelado')),
  attempts      int  not null default 0,
  created_by    uuid not null references public.staff(id),
  created_at    timestamptz not null default now(),
  delivered_at  timestamptz
);

-- Historial de puntos: SOLO se agregan filas. Nunca se editan ni borran.
create table public.ledger (
  id          bigserial primary key,
  customer_id uuid not null references public.customers(id),
  type        text not null check (type in ('compra','canje','ajuste','caducidad')),
  points      int  not null,
  ref         text,
  actor_id    uuid references public.staff(id),
  detail      text not null,
  created_at  timestamptz not null default now(),
  prev_hash   text not null,
  hash        text not null
);
create index on public.ledger(customer_id, created_at);

-- Canje en curso: el negocio lo inicia, el cliente ve un código que
-- cambia cada 30 s y el repartidor lo captura para confirmar.
create table public.redeem_sessions (
  customer_id uuid primary key references public.customers(id),
  reward_id   text not null references public.rewards(id),
  nonce       text not null default encode(gen_random_bytes(8),'hex'),
  started_by  uuid not null references public.staff(id),
  expires_at  timestamptz not null
);

create table public.alerts (
  id         bigserial primary key,
  level      text not null check (level in ('warn','bad')),
  text       text not null,
  created_at timestamptz not null default now()
);

-- Bitácora de acciones del equipo
create table public.audit_log (
  id         bigserial primary key,
  actor_id   uuid references public.staff(id),
  action     text not null,
  detail     jsonb,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- Bloqueo total de acceso directo: todo va por RPC
-- ---------------------------------------------------------------------
alter table public.staff           enable row level security;
alter table public.customers       enable row level security;
alter table public.rewards         enable row level security;
alter table public.orders          enable row level security;
alter table public.ledger          enable row level security;
alter table public.redeem_sessions enable row level security;
alter table public.alerts          enable row level security;
alter table public.audit_log       enable row level security;
-- Sin políticas = nadie lee ni escribe directo (salvo service_role).
revoke all on all tables in schema public from anon, authenticated;

-- Historial inmutable + cadena de hashes (detecta manipulación)
create or replace function private.ledger_chain() returns trigger
language plpgsql set search_path = public, extensions as $$
declare v_prev text;
begin
  perform pg_advisory_xact_lock(424242);
  select hash into v_prev from public.ledger order by id desc limit 1;
  new.prev_hash := coalesce(v_prev, 'inicio');
  new.created_at := now();
  new.hash := encode(digest(
    new.prev_hash || '|' || new.customer_id || '|' || new.type || '|' ||
    new.points || '|' || coalesce(new.ref,'') || '|' || coalesce(new.actor_id::text,'') ||
    '|' || new.detail || '|' || extract(epoch from new.created_at)::text, 'sha256'), 'hex');
  return new;
end $$;
create trigger ledger_chain before insert on public.ledger
  for each row execute function private.ledger_chain();

create or replace function private.no_changes() returns trigger
language plpgsql set search_path = public, extensions as $$
begin
  raise exception 'El historial de puntos no se puede modificar ni borrar';
end $$;
create trigger ledger_no_update before update or delete on public.ledger
  for each row execute function private.no_changes();
create trigger audit_no_update before update or delete on public.audit_log
  for each row execute function private.no_changes();

-- ---------------------------------------------------------------------
-- Utilidades internas
-- ---------------------------------------------------------------------
create or replace function private.my_role() returns text
language sql stable security definer set search_path = public, extensions as $$
  select role from public.staff where id = auth.uid() and active
$$;

create or replace function private.require_role(roles text[]) returns uuid
language plpgsql stable security definer set search_path = public, extensions as $$
declare r text := private.my_role();
begin
  if r is null or not (r = any(roles)) then
    raise exception 'No autorizado';
  end if;
  return auth.uid();
end $$;

-- Inicio de la semana actual: lunes 00:00 en la zona horaria del negocio
create or replace function private.week_start() returns timestamptz
language sql stable security definer set search_path = public, extensions as $$
  select (date_trunc('week', now() at time zone (select zona_horaria from private.rules)))
         at time zone (select zona_horaria from private.rules)
$$;

-- Saldo disponible = lo ganado esta semana − lo canjeado esta semana
create or replace function private.balance(p_customer uuid) returns int
language sql stable security definer set search_path = public, extensions as $$
  select coalesce(sum(points),0)::int from public.ledger
   where customer_id = p_customer and created_at >= private.week_start()
$$;

-- Puntos ganados esta semana (compras + ajustes positivos), sin restar canjes
create or replace function private.week_earned(p_customer uuid) returns int
language sql stable security definer set search_path = public, extensions as $$
  select coalesce(sum(points),0)::int from public.ledger
   where customer_id = p_customer and created_at >= private.week_start() and type <> 'canje'
$$;

create or replace function private.today_start() returns timestamptz
language sql stable as $$
  select (date_trunc('day', now() at time zone (select zona_horaria from private.rules)))
         at time zone (select zona_horaria from private.rules)
$$;

create or replace function private.alert(p_level text, p_text text) returns void
language sql security definer set search_path = public, extensions as $$
  insert into public.alerts(level, text) values (p_level, p_text)
$$;

create or replace function private.audit(p_action text, p_detail jsonb) returns void
language sql security definer set search_path = public, extensions as $$
  insert into public.audit_log(actor_id, action, detail) values (auth.uid(), p_action, p_detail)
$$;

-- Código de canje rotativo: HMAC(secreto, cliente|premio|nonce|ventana)
create or replace function private.redeem_code(p_customer uuid, p_window bigint) returns text
language plpgsql stable security definer set search_path = public, extensions as $$
declare
  s public.redeem_sessions;
  secret text;
  h bytea;
  alphabet text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  out text := '';
  i int;
begin
  select * into s from public.redeem_sessions where customer_id = p_customer and expires_at > now();
  if not found then return null; end if;
  select value into secret from private.config where key = 'hmac_secret';
  h := hmac(p_customer::text || '|' || s.reward_id || '|' || s.nonce || '|' || p_window, secret, 'sha256');
  for i in 0..5 loop
    out := out || substr(alphabet, (get_byte(h, i) % 32) + 1, 1);
  end loop;
  return out;
end $$;

create or replace function private.current_window() returns bigint
language sql stable as $$
  select floor(extract(epoch from now()) / (select vigencia_codigo_canje_seg from private.rules))::bigint
$$;

-- =====================================================================
-- RPC PÚBLICA (cliente, sin sesión): solo lectura con su token
-- =====================================================================
create or replace function public.customer_view(p_token text) returns jsonb
language plpgsql stable security definer set search_path = public, extensions as $$
declare
  c public.customers;
  r private.rules;
  rs public.redeem_sessions;
  v_code text;
begin
  if p_token is null or length(p_token) < 20 then return null; end if;
  select * into c from public.customers where public_token = p_token and active;
  if not found then return null; end if;
  select * into r from private.rules;
  select * into rs from public.redeem_sessions where customer_id = c.id and expires_at > now();
  if found then v_code := private.redeem_code(c.id, private.current_window()); end if;

  return jsonb_build_object(
    'name', c.name,
    'balance', private.balance(c.id),            -- disponibles para canjear
    'week_earned', private.week_earned(c.id),    -- lo que lleva esta semana
    'week_start', private.week_start(),
    'week_resets_at', private.week_start() + interval '7 days',
    'pesos_por_punto', r.pesos_por_punto,
    'ledger', coalesce((select jsonb_agg(jsonb_build_object(
        'at', l.created_at, 'type', l.type, 'points', l.points, 'detail', l.detail)
        order by l.id desc)
      from (select * from public.ledger where customer_id = c.id
             and created_at >= private.week_start() order by id desc limit 100) l), '[]'),
    'rewards', coalesce((select jsonb_agg(jsonb_build_object(
        'id', id, 'name', name, 'cost', cost,
        'faltan', greatest(0, cost - private.balance(c.id))) order by cost)
      from public.rewards where active), '[]'),
    'orders_en_camino', coalesce((select jsonb_agg(jsonb_build_object(
        'folio', o.folio, 'amount', o.amount, 'delivery_code', o.delivery_code,
        'points', floor(o.amount / r.pesos_por_punto)))
      from public.orders o where o.customer_id = c.id and o.status = 'en_camino'), '[]'),
    'redeem', case when v_code is null then null else jsonb_build_object(
        'reward', (select name from public.rewards where id = rs.reward_id),
        'code', v_code,
        'seconds_left', r.vigencia_codigo_canje_seg - (floor(extract(epoch from now()))::bigint % r.vigencia_codigo_canje_seg)
      ) end
  );
end $$;

-- =====================================================================
-- RPC DEL EQUIPO
-- =====================================================================

-- Alta de cliente (gerente o repartidor). Devuelve su token para el link.
create or replace function public.create_customer(p_name text, p_phone text, p_notes text default null)
returns jsonb language plpgsql security definer set search_path = public, extensions as $$
declare me uuid := private.require_role(array['gerente','repartidor']); c public.customers;
begin
  p_phone := regexp_replace(p_phone, '\D', '', 'g');
  if length(p_phone) = 12 and left(p_phone,2) = '52' then p_phone := substr(p_phone,3); end if;
  insert into public.customers(name, phone, notes, created_by)
  values (trim(p_name), p_phone, p_notes, me) returning * into c;
  perform private.audit('alta_cliente', jsonb_build_object('customer', c.id, 'phone', c.phone));
  return jsonb_build_object('id', c.id, 'token', c.public_token);
exception when unique_violation then
  raise exception 'Ya existe un cliente con ese número';
end $$;

-- Editar datos del cliente (solo gerente)
create or replace function public.update_customer(p_id uuid, p_name text, p_phone text, p_notes text, p_active boolean)
returns void language plpgsql security definer set search_path = public, extensions as $$
declare me uuid := private.require_role(array['gerente']);
begin
  p_phone := regexp_replace(p_phone, '\D', '', 'g');
  if length(p_phone) = 12 and left(p_phone,2) = '52' then p_phone := substr(p_phone,3); end if;
  update public.customers set name = trim(p_name), phone = p_phone, notes = p_notes, active = p_active
  where id = p_id;
  perform private.audit('editar_cliente', jsonb_build_object('customer', p_id, 'phone', p_phone, 'active', p_active));
end $$;

-- Regenerar link si se filtró (solo gerente)
create or replace function public.rotate_customer_token(p_id uuid) returns text
language plpgsql security definer set search_path = public, extensions as $$
declare me uuid := private.require_role(array['gerente']); t text;
begin
  update public.customers
     set public_token = translate(encode(gen_random_bytes(18),'base64'), '+/=', '-_')
   where id = p_id returning public_token into t;
  perform private.audit('nuevo_link_cliente', jsonb_build_object('customer', p_id));
  return t;
end $$;

-- Lista/búsqueda de clientes (equipo)
drop function if exists public.list_customers(text);
create or replace function public.list_customers(p_search text default '')
returns table(id uuid, name text, phone text, balance int, week_earned int, active boolean, public_token text, notes text, created_at timestamptz)
language plpgsql stable security definer set search_path = public, extensions as $$
declare me uuid := private.require_role(array['gerente','repartidor']);
begin
  return query
    select c.id, c.name, c.phone, private.balance(c.id), private.week_earned(c.id), c.active,
           case when private.my_role() = 'gerente' then c.public_token else null end,
           c.notes, c.created_at
      from public.customers c
     where p_search = '' or c.name ilike '%'||p_search||'%' or c.phone like '%'||p_search||'%'
     order by c.created_at desc
     limit 200;
end $$;

-- Crear pedido (gerente). El código de entrega solo lo ve el cliente.
create or replace function public.create_order(p_customer uuid, p_amount numeric, p_driver uuid)
returns jsonb language plpgsql security definer set search_path = public, extensions as $$
declare me uuid := private.require_role(array['gerente']); o public.orders;
begin
  if not exists (select 1 from public.staff where id = p_driver and role = 'repartidor' and active) then
    raise exception 'Repartidor inválido';
  end if;
  if not exists (select 1 from public.customers where id = p_customer and active) then
    raise exception 'Cliente inválido';
  end if;
  insert into public.orders(customer_id, driver_id, amount, created_by)
  values (p_customer, p_driver, round(p_amount, 2), me) returning * into o;
  perform private.audit('crear_pedido', jsonb_build_object('order', o.id, 'amount', o.amount));
  return jsonb_build_object('id', o.id, 'folio', o.folio);
end $$;

-- Entregas pendientes del repartidor (SIN el código de entrega)
create or replace function public.my_deliveries()
returns table(id uuid, folio text, customer_name text, phone text, amount numeric, created_at timestamptz)
language plpgsql stable security definer set search_path = public, extensions as $$
declare me uuid := private.require_role(array['repartidor']);
begin
  return query
    select o.id, o.folio, c.name, c.phone, o.amount, o.created_at
      from public.orders o join public.customers c on c.id = o.customer_id
     where o.driver_id = me and o.status = 'en_camino'
     order by o.created_at;
end $$;

-- Confirmar entrega con el código que muestra el link del cliente
create or replace function public.confirm_delivery(p_order uuid, p_code text)
returns jsonb language plpgsql security definer set search_path = public, extensions as $$
declare
  me uuid := private.require_role(array['repartidor']);
  o public.orders; r private.rules;
  pts int; n_today int; pts_today int; same_driver int; note text := '';
begin
  select * into r from private.rules;
  select * into o from public.orders where id = p_order for update;
  if not found or o.driver_id <> me then raise exception 'Pedido no asignado a ti'; end if;
  if o.status <> 'en_camino' then raise exception 'Este pedido ya se cerró'; end if;

  if p_code is distinct from o.delivery_code then
    update public.orders set attempts = attempts + 1,
      status = case when attempts + 1 >= r.intentos_codigo_entrega then 'bloqueado' else status end
    where id = o.id returning * into o;
    if o.status = 'bloqueado' then
      perform private.alert('bad', format('Pedido %s bloqueado: %s códigos incorrectos.', o.folio, o.attempts));
    end if;
    return jsonb_build_object('ok', false, 'attempts', o.attempts, 'max', r.intentos_codigo_entrega);
  end if;

  update public.orders set status = 'entregado', delivered_at = now() where id = o.id;

  pts := floor(o.amount / r.pesos_por_punto);
  select count(*), coalesce(sum(points),0) into n_today, pts_today
    from public.ledger
   where customer_id = o.customer_id and type = 'compra' and created_at >= private.today_start();

  if n_today >= r.max_pedidos_dia then
    pts := 0; note := ' · límite de pedidos diarios';
    perform private.alert('warn', format('Cliente %s superó %s pedidos con puntos hoy.', (select name from public.customers where id = o.customer_id), r.max_pedidos_dia));
  elsif pts_today + pts > r.max_puntos_dia then
    pts := greatest(0, r.max_puntos_dia - pts_today); note := ' · tope diario de puntos';
    perform private.alert('warn', format('Cliente %s llegó al tope diario de puntos.', (select name from public.customers where id = o.customer_id)));
  end if;

  select count(*) into same_driver from public.orders
   where customer_id = o.customer_id and driver_id = me and status = 'entregado'
     and delivered_at >= private.today_start();
  if same_driver >= 3 then
    perform private.alert('warn', format('%s lleva %s entregas hoy a %s (pedido %s).', (select name from public.staff where id = me), same_driver, (select name from public.customers where id = o.customer_id), o.folio));
  end if;

  insert into public.ledger(customer_id, type, points, ref, actor_id, detail)
  values (o.customer_id, 'compra', pts, o.folio, me, format('Pedido %s · $%s%s', o.folio, o.amount, note));

  return jsonb_build_object('ok', true, 'points', pts, 'note', nullif(trim(leading ' · ' from note), ''));
end $$;

-- Iniciar canje (equipo). El cliente verá un código rotativo en su link.
create or replace function public.start_redeem(p_customer uuid, p_reward text)
returns void language plpgsql security definer set search_path = public, extensions as $$
declare me uuid := private.require_role(array['gerente','repartidor']); rw public.rewards; r private.rules;
begin
  select * into r from private.rules;
  select * into rw from public.rewards where id = p_reward and active;
  if not found then raise exception 'Premio no válido'; end if;
  if private.balance(p_customer) < rw.cost then raise exception 'Puntos insuficientes'; end if;
  insert into public.redeem_sessions(customer_id, reward_id, started_by, expires_at)
  values (p_customer, p_reward, me, now() + make_interval(mins => r.duracion_canje_min))
  on conflict (customer_id) do update
    set reward_id = excluded.reward_id, nonce = encode(gen_random_bytes(8),'hex'),
        started_by = excluded.started_by, expires_at = excluded.expires_at;
end $$;

-- Confirmar canje con el código que el cliente muestra en su link
create or replace function public.confirm_redeem(p_customer uuid, p_code text)
returns jsonb language plpgsql security definer set search_path = public, extensions as $$
declare me uuid := private.require_role(array['gerente','repartidor']);
  s public.redeem_sessions; rw public.rewards; w bigint := private.current_window();
begin
  perform pg_advisory_xact_lock(hashtext(p_customer::text));
  select * into s from public.redeem_sessions where customer_id = p_customer and expires_at > now() for update;
  if not found then raise exception 'No hay canje activo para este cliente'; end if;
  -- acepta la ventana actual y la anterior (por si cambió justo al dictarlo)
  if upper(trim(p_code)) not in (private.redeem_code(p_customer, w), private.redeem_code(p_customer, w - 1)) then
    perform private.alert('warn', format('Código de canje inválido para %s.', (select name from public.customers where id = p_customer)));
    return jsonb_build_object('ok', false, 'error', 'Código inválido o caducado');
  end if;
  select * into rw from public.rewards where id = s.reward_id;
  if private.balance(p_customer) < rw.cost then raise exception 'Puntos insuficientes'; end if;
  insert into public.ledger(customer_id, type, points, ref, actor_id, detail)
  values (p_customer, 'canje', -rw.cost, rw.id, me, rw.name);
  delete from public.redeem_sessions where customer_id = p_customer; -- un solo uso
  return jsonb_build_object('ok', true, 'reward', rw.name);
end $$;

-- Ajuste manual (solo gerente, con motivo y tope)
create or replace function public.manual_adjust(p_customer uuid, p_points int, p_reason text)
returns void language plpgsql security definer set search_path = public, extensions as $$
declare me uuid := private.require_role(array['gerente']); r private.rules;
begin
  select * into r from private.rules;
  if p_points = 0 or abs(p_points) > r.ajuste_maximo then
    raise exception 'El ajuste debe estar entre -% y +%', r.ajuste_maximo, r.ajuste_maximo;
  end if;
  if length(trim(coalesce(p_reason,''))) < 8 then raise exception 'Escribe un motivo claro'; end if;
  perform pg_advisory_xact_lock(hashtext(p_customer::text));
  if private.balance(p_customer) + p_points < 0 then raise exception 'El saldo no puede quedar negativo'; end if;
  insert into public.ledger(customer_id, type, points, ref, actor_id, detail)
  values (p_customer, 'ajuste', p_points, 'manual', me, trim(p_reason));
  perform private.alert('warn', format('Ajuste manual de %s pts: %s', p_points, trim(p_reason)));
end $$;

-- Vistas del gerente
create or replace function public.manager_ledger(p_customer uuid default null)
returns table(id bigint, created_at timestamptz, customer_name text, phone text, type text, points int, detail text, actor text)
language plpgsql stable security definer set search_path = public, extensions as $$
declare me uuid := private.require_role(array['gerente']);
begin
  return query
    select l.id, l.created_at, c.name, c.phone, l.type, l.points, l.detail, s.name
      from public.ledger l join public.customers c on c.id = l.customer_id
      left join public.staff s on s.id = l.actor_id
     where p_customer is null or l.customer_id = p_customer
     order by l.id desc limit 500;
end $$;

create or replace function public.manager_alerts()
returns setof public.alerts language plpgsql stable security definer set search_path = public, extensions as $$
declare me uuid := private.require_role(array['gerente']);
begin
  return query select * from public.alerts order by id desc limit 100;
end $$;

create or replace function public.list_drivers()
returns table(id uuid, name text) language plpgsql stable security definer set search_path = public, extensions as $$
declare me uuid := private.require_role(array['gerente']);
begin
  return query select s.id, s.name from public.staff s where s.role = 'repartidor' and s.active order by s.name;
end $$;

create or replace function public.my_staff_profile()
returns table(id uuid, name text, role text) language sql stable security definer set search_path = public, extensions as $$
  select id, name, role from public.staff where id = auth.uid() and active
$$;

-- Verificar que nadie alteró el historial (gerente)
create or replace function public.verify_ledger() returns jsonb
language plpgsql stable security definer set search_path = public, extensions as $$
declare me uuid := private.require_role(array['gerente']); l record; prev text := 'inicio'; calc text;
begin
  for l in select * from public.ledger order by id loop
    calc := encode(digest(prev || '|' || l.customer_id || '|' || l.type || '|' || l.points || '|' ||
      coalesce(l.ref,'') || '|' || coalesce(l.actor_id::text,'') || '|' || l.detail || '|' ||
      extract(epoch from l.created_at)::text, 'sha256'), 'hex');
    if l.prev_hash <> prev or l.hash <> calc then
      return jsonb_build_object('ok', false, 'broken_at', l.id);
    end if;
    prev := l.hash;
  end loop;
  return jsonb_build_object('ok', true);
end $$;

-- ---------------------------------------------------------------------
-- RPC adicionales (no estaban en la versión original)
-- ---------------------------------------------------------------------

-- Premios activos, para que el equipo elija qué canjear
create or replace function public.list_rewards()
returns table(id text, name text, cost int)
language plpgsql stable security definer set search_path = public, extensions as $$
declare me uuid := private.require_role(array['gerente','repartidor']);
begin
  return query select rw.id, rw.name, rw.cost from public.rewards rw where rw.active order by rw.cost;
end $$;

-- Pedidos para el gerente (sin el código de entrega)
create or replace function public.manager_orders(p_status text default null)
returns table(id uuid, folio text, customer_id uuid, customer_name text, phone text, driver_name text,
              amount numeric, status text, attempts int, created_at timestamptz, delivered_at timestamptz)
language plpgsql stable security definer set search_path = public, extensions as $$
declare me uuid := private.require_role(array['gerente']);
begin
  return query
    select o.id, o.folio, c.id, c.name, c.phone, s.name, o.amount, o.status, o.attempts, o.created_at, o.delivered_at
      from public.orders o
      join public.customers c on c.id = o.customer_id
      join public.staff s on s.id = o.driver_id
     where p_status is null or o.status = p_status
     order by o.created_at desc
     limit 200;
end $$;

-- Cancelar un pedido en camino o bloqueado (gerente). No da puntos.
create or replace function public.cancel_order(p_order uuid)
returns void language plpgsql security definer set search_path = public, extensions as $$
declare me uuid := private.require_role(array['gerente']); o public.orders;
begin
  update public.orders set status = 'cancelado'
   where id = p_order and status in ('en_camino','bloqueado')
  returning * into o;
  if not found then raise exception 'Solo se pueden cancelar pedidos en camino o bloqueados'; end if;
  perform private.audit('cancelar_pedido', jsonb_build_object('order', o.id, 'folio', o.folio));
end $$;

-- ---------------------------------------------------------------------
-- Permisos de ejecución
-- ---------------------------------------------------------------------
revoke execute on all functions in schema public from public, anon, authenticated;
revoke execute on all functions in schema private from public, anon, authenticated;

grant execute on function public.customer_view(text) to anon, authenticated;

grant execute on function
  public.create_customer(text,text,text),
  public.update_customer(uuid,text,text,text,boolean),
  public.rotate_customer_token(uuid),
  public.list_customers(text),
  public.create_order(uuid,numeric,uuid),
  public.my_deliveries(),
  public.confirm_delivery(uuid,text),
  public.start_redeem(uuid,text),
  public.confirm_redeem(uuid,text),
  public.manual_adjust(uuid,int,text),
  public.manager_ledger(uuid),
  public.manager_alerts(),
  public.list_drivers(),
  public.my_staff_profile(),
  public.verify_ledger(),
  public.list_rewards(),
  public.manager_orders(text),
  public.cancel_order(uuid)
to authenticated;

-- ---------------------------------------------------------------------
-- Alta del equipo (correr a mano en el SQL Editor después de crear
-- cada usuario en Authentication → Users):
--   insert into public.staff(id, name, role)
--   values ('<uuid-del-usuario>', 'Nombre', 'gerente');   -- o 'repartidor'
-- ---------------------------------------------------------------------
