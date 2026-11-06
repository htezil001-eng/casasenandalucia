-- =====================================================================
-- Amordidas Puntos — datos de prueba (OPCIONAL)
-- Córrelo en Supabase → SQL Editor después de schema.sql.
-- Crea 3 clientes de prueba con puntos de esta semana para que puedas
-- ver la escalera de premios y los recordatorios de fin de semana.
-- Para borrarlos no hay forma "limpia" (el historial es inmutable):
-- desactívalos desde el panel del gerente.
-- =====================================================================

-- Premios (ya vienen en schema.sql; esto solo asegura que existan)
insert into public.rewards(id, name, cost) values
  ('frappe',  'Frappé',                       300),
  ('dedos',   '4 dedos de queso',             500),
  ('crepa',   'Crepa',                        800),
  ('fresas13','Fresas con crema de 13 oz',   1200)
on conflict (id) do update set name = excluded.name, cost = excluded.cost, active = true;

-- Clientes de prueba (teléfonos ficticios)
insert into public.customers(name, phone, notes) values
  ('Cliente Prueba Uno',  '5500000001', 'Dato de prueba'),
  ('Cliente Prueba Dos',  '5500000002', 'Dato de prueba'),
  ('Cliente Prueba Tres', '5500000003', 'Dato de prueba')
on conflict (phone) do nothing;

-- Puntos de esta semana (solo si todavía no tienen movimientos)
insert into public.ledger(customer_id, type, points, ref, detail)
select c.id, 'ajuste', v.pts, 'seed', 'Puntos de prueba'
  from (values ('5500000001', 180), ('5500000002', 420), ('5500000003', 90)) v(phone, pts)
  join public.customers c on c.phone = v.phone
 where not exists (select 1 from public.ledger l where l.customer_id = c.id);

-- Links para abrir en el navegador (cambia el dominio por el tuyo)
select name, 'http://localhost:3000/c/' || public_token as link
  from public.customers where phone like '55000000%' order by phone;
