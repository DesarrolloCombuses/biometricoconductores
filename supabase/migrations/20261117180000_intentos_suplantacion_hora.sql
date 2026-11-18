-- Intentos de suplantación de hora (17-nov-2026).
--
-- Pedido del usuario: "tiene que ser increbantable: que si cambia la hora del celular no lo deje marcar,
-- que guarde un intento de suplantación".
--
-- La app ya marca con la hora del servidor (obtener_hora_servidor_colombia), pero:
--   * si esa consulta fallaba, usaba la hora del equipo;
--   * el "modo local" (localhost / archivo) deja editar la hora: en 30 días hubo 5 marcas admin_form
--     con horas redondas puestas a mano, guardadas hasta 21 h después;
--   * nada quedaba registrado cuando alguien lo intentaba.
--
-- Esta migración:
--   1. Crea la bitácora public.intentos_suplantacion.
--   2. registrar_intento_suplantacion(): la app la llama cuando detecta la hora del equipo cambiada
--      (más de 5 min contra el servidor) o una hora de marca editada, y NO deja marcar.
--   3. Trigger trg_01_bloquear_hora_falsa: segunda barrera en la base. Una marca en vivo
--      (origen movil o admin_form) cuya hora se aleje más de 15 min de la hora oficial NO se guarda
--      (el trigger devuelve NULL) y el intento queda en la bitácora. Se usa NULL y no RAISE porque
--      una excepción desharía también el registro del intento.
--      Los orígenes que sí llevan horas pasadas a propósito no se tocan: cierre_declarado,
--      cierre_automatico, manual (con código de autorización), app_personal (cola sin señal) y web
--      (a esa ya le pone la hora del servidor trg_00_normalizar_hora_asistencia_web).
--      15 min de margen: entre que la app toma la hora y guarda pasan Buk (con reintentos) y la foto;
--      en 30 días el máximo legítimo de las marcas movil fue 3 min.

create table if not exists public.intentos_suplantacion (
  id             bigserial primary key,
  creado_en      timestamptz not null default now(),
  tipo           text not null,        -- hora_equipo_cambiada | hora_marca_editada | hora_marca_no_coincide
  app            text,                 -- biometrico | portal | servidor
  dni            text,
  nombre         text,
  colaborador_id uuid,
  registrado_por uuid,
  cuenta         text,
  sentido        text,
  hora_equipo    timestamp,            -- hora Colombia que traía el equipo o la marca
  hora_oficial   timestamp,            -- hora Colombia del servidor en ese momento
  diferencia_min integer,              -- hora_equipo - hora_oficial, en minutos (+ adelantada / - atrasada)
  latitud        numeric,
  longitud       numeric,
  user_agent     text,
  detalle        jsonb not null default '{}'::jsonb
);

create index if not exists intentos_suplantacion_creado_idx on public.intentos_suplantacion (creado_en desc);
create index if not exists intentos_suplantacion_dni_idx on public.intentos_suplantacion (dni, creado_en desc);

alter table public.intentos_suplantacion enable row level security;

drop policy if exists intentos_suplantacion_select on public.intentos_suplantacion;
create policy intentos_suplantacion_select on public.intentos_suplantacion
  for select to authenticated using (true);
-- Sin políticas de insert/update/delete: solo se escribe por la función y el trigger (security definer).

comment on table public.intentos_suplantacion is
  'Intentos de marcar con la hora cambiada (equipo o marca). Los escribe registrar_intento_suplantacion() y el trigger trg_01_bloquear_hora_falsa.';

create or replace function public.registrar_intento_suplantacion(
  p_tipo        text,
  p_dni         text default null,
  p_hora_equipo timestamptz default null,
  p_sentido     text default null,
  p_lat         numeric default null,
  p_lon         numeric default null,
  p_app         text default null,
  p_user_agent  text default null,
  p_detalle     jsonb default '{}'::jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $function$
declare
  v_uid     uuid := auth.uid();
  v_dni     text := nullif(trim(coalesce(p_dni, '')), '');
  v_oficial timestamp := timezone('America/Bogota', now());
  v_equipo  timestamp;
  v_dif     integer;
  v_col_id  uuid;
  v_nombre  text;
  v_previo  bigint;
  v_id      bigint;
begin
  if v_uid is null then
    raise exception 'No autorizado: debes iniciar sesion.';
  end if;
  if p_tipo not in ('hora_equipo_cambiada', 'hora_marca_editada') then
    raise exception 'Tipo de intento no valido: %', p_tipo;
  end if;

  if p_hora_equipo is not null then
    v_equipo := timezone('America/Bogota', p_hora_equipo);
    v_dif := round(extract(epoch from (v_equipo - v_oficial)) / 60)::integer;
  end if;

  select c.id, c.nombre into v_col_id, v_nombre
    from public.colaboradores c where c.dni = v_dni limit 1;

  -- Doble toque o reintento inmediato: no se repite el mismo intento en 2 minutos.
  select i.id into v_previo
    from public.intentos_suplantacion i
   where i.registrado_por = v_uid and i.tipo = p_tipo
     and coalesce(i.dni, '') = coalesce(v_dni, '')
     and i.creado_en > now() - interval '2 minutes'
   order by i.id desc limit 1;
  if v_previo is not null then
    return jsonb_build_object('ok', true, 'id', v_previo, 'repetido', true);
  end if;

  insert into public.intentos_suplantacion
    (tipo, app, dni, nombre, colaborador_id, registrado_por, cuenta, sentido,
     hora_equipo, hora_oficial, diferencia_min, latitud, longitud, user_agent, detalle)
  values
    (p_tipo, left(p_app, 30), v_dni, v_nombre, v_col_id, v_uid,
     (select u.email from auth.users u where u.id = v_uid), left(p_sentido, 10),
     v_equipo, v_oficial, v_dif, p_lat, p_lon, left(p_user_agent, 300), coalesce(p_detalle, '{}'::jsonb))
  returning id into v_id;

  return jsonb_build_object('ok', true, 'id', v_id, 'diferencia_min', v_dif);
end;
$function$;

grant execute on function public.registrar_intento_suplantacion(text, text, timestamptz, text, numeric, numeric, text, text, jsonb) to authenticated;

create or replace function public.bloquear_hora_marca_falsa()
returns trigger
language plpgsql
security definer
set search_path = public
as $function$
declare
  v_oficial timestamp := timezone('America/Bogota', now());
  v_dif     numeric;
begin
  if new.origen is null or new.origen not in ('movil', 'admin_form') then
    return new;
  end if;
  if new.fecha is null or new.hora is null then
    return new;
  end if;

  v_dif := extract(epoch from ((new.fecha + new.hora) - v_oficial)) / 60;
  if abs(v_dif) <= 15 then
    return new;
  end if;

  insert into public.intentos_suplantacion
    (tipo, app, dni, nombre, colaborador_id, registrado_por, cuenta, sentido,
     hora_equipo, hora_oficial, diferencia_min, latitud, longitud, detalle)
  select 'hora_marca_no_coincide', 'servidor', c.dni, c.nombre, new.colaborador_id, new.registrado_por,
         u.email, new.sentido, new.fecha + new.hora, v_oficial, round(v_dif)::integer,
         new.latitud, new.longitud,
         jsonb_build_object('origen', new.origen, 'vehiculo', new.vehiculo_reporte,
                            'enviado_buk', new.enviado_buk, 'buk_status', new.buk_status,
                            'observacion', left(coalesce(new.observacion, ''), 300))
    from (select 1) x
    left join public.colaboradores c on c.id = new.colaborador_id
    left join auth.users u on u.id = new.registrado_por;

  return null;   -- la marca NO se guarda; el intento sí
end;
$function$;

drop trigger if exists trg_01_bloquear_hora_falsa on public.asistencias;
create trigger trg_01_bloquear_hora_falsa
  before insert on public.asistencias
  for each row execute function public.bloquear_hora_marca_falsa();
