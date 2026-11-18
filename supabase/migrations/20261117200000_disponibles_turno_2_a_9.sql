-- Disponibles = turno de 02:00 a 09:00 (17-nov-2026).
--
-- Pedido del usuario: "en la programación el que está disponible tiene turno de 2:00 am a 9 am", para todos los
-- disponibles, y que cuente "en todo". La novedad DISPONIBLE (tabla novedades) dice que ese día el conductor no
-- tiene bus en la programación; hasta hoy quedaba "sin programación" y no le aplicaban la regla de 30 min, la
-- puntualidad, el Verificador ni la sugerencia de cierre. Del 1 al 17 de noviembre fueron 42 disponibles; 7 de
-- los que marcaron entraron entre 01:17 y 01:56.
--
-- Cómo queda:
--   1. refrescar_programacion_turnos() agrega a programacion_turnos un turno 1 de 02:00 a 09:00, sin vehículo
--      y con puesto 'DISPONIBLE', por cada novedad DISPONIBLE cuya persona se pueda cruzar por nombre
--      (normalizar_nombre_tokens contra colaboradores y contra el puente programacion_conductor_dni, el mismo
--      cruce de novedad_conductor_dia). Si ese día ya tiene un turno real en la programación, gana el real.
--      Así lo ven solos obtener_programacion_dia (la app), estado_turno_actual, programacion_de_marca
--      (puntualidad), sugerencia_cierre_turno, cerrar_turno_automatico, verificacion_dia y horario_programado.
--   2. Triggers en novedades: si se crea, cambia o borra una novedad DISPONIBLE, se rehace la programación de
--      esas fechas (igual que ya pasa cuando cambia programacion_filas).
--   3. calcular_puntualidad_asistencia(): la salida del turno 1 es "no evaluable" porque la programación no dice
--      a qué hora es el relevo; la del disponible SÍ tiene hora fija (09:00), así que se evalúa.
--   4. Se rehace la programación de las fechas con disponibles y se recalcula la puntualidad de sus marcas desde
--      el 1-ago-2026 (fecha_corte_verificacion).
--
-- El portal del conductor (combuconductores v1.26.2) no ofrece este turno para elegir bus: sin vehículo dejaría
-- de pedirle el bus que va a manejar. Por eso el portal se publica ANTES de aplicar esto.

create or replace function public.refrescar_programacion_turnos(p_fechas date[] default null::date[])
returns integer
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_filas int;
  v_disp int;
begin
  if p_fechas is null then
    delete from public.programacion_turnos;
  else
    delete from public.programacion_turnos where fecha = any(p_fechas);
  end if;

  insert into public.programacion_turnos
    (fecha, dni, turno, hora_entrada, hora_salida, vehiculo, base, puesto,
     nombre_programacion, entrada_ts, salida_ts)
  select v.fecha, v.dni, v.turno, v.hora_entrada, v.hora_salida,
         v.vehiculo, v.base, v.puesto, v.nombre_programacion,
         (v.fecha + v.hora_entrada)::timestamp,
         -- Si la hora fin es menor que la de inicio, la jornada termina al dia siguiente.
         case when v.hora_salida is null then null
              when v.hora_entrada is not null and v.hora_salida < v.hora_entrada
                then (v.fecha + 1 + v.hora_salida)::timestamp
              else (v.fecha + v.hora_salida)::timestamp end
    from public.v_programacion_conductor v
   where p_fechas is null or v.fecha = any(p_fechas);

  get diagnostics v_filas = row_count;

  -- Disponibles: turno 1 de 02:00 a 09:00, sin bus. Solo si ese dia no tiene un turno real.
  with col as (
    select c.dni, public.normalizar_nombre_tokens(c.nombre) as tok,
           (upper(coalesce(c.especialidad, '')) like '%CONDUCTOR%') as conductor
      from public.colaboradores c
     where c.dni is not null and c.nombre is not null
  ),
  puente as (
    select distinct m.dni, public.normalizar_nombre_tokens(m.nombre_programacion) as tok
      from public.programacion_conductor_dni m
     where m.dni is not null and m.nombre_programacion is not null
  ),
  disp as (
    select n.fecha, n.base, n.nombre, n.updated_at, public.normalizar_nombre_tokens(n.nombre) as tok
      from public.novedades n
     where upper(trim(n.estado)) = 'DISPONIBLE'
       and n.fecha is not null
       and (p_fechas is null or n.fecha = any(p_fechas))
  ),
  cruzado as (
    select d.fecha, d.base, d.nombre, d.updated_at,
           coalesce(
             (select col.dni from col where col.tok = d.tok order by col.conductor desc limit 1),
             (select puente.dni from puente where puente.tok = d.tok limit 1)
           ) as dni
      from disp d
  )
  insert into public.programacion_turnos
    (fecha, dni, turno, hora_entrada, hora_salida, vehiculo, base, puesto,
     nombre_programacion, entrada_ts, salida_ts)
  select distinct on (x.fecha, x.dni)
         x.fecha, x.dni, 1, time '02:00', time '09:00', null, x.base, 'DISPONIBLE', x.nombre,
         (x.fecha + time '02:00')::timestamp, (x.fecha + time '09:00')::timestamp
    from cruzado x
   where x.dni is not null
     and not exists (select 1 from public.programacion_turnos pt
                      where pt.dni = x.dni and pt.fecha = x.fecha)
   order by x.fecha, x.dni, x.updated_at desc;

  get diagnostics v_disp = row_count;
  return v_filas + v_disp;
end;
$function$;

-- Cambios en novedades DISPONIBLE rehacen la programación de esas fechas.
create or replace function public.trg_refrescar_turnos_novedades_ins()
returns trigger language plpgsql security definer set search_path to 'public' as $function$
declare v_f date[];
begin
  select array_agg(distinct fecha) into v_f from nuevas
   where fecha is not null and upper(trim(estado)) = 'DISPONIBLE';
  if v_f is not null then perform public.refrescar_programacion_turnos(v_f); end if;
  return null;
end; $function$;

create or replace function public.trg_refrescar_turnos_novedades_upd()
returns trigger language plpgsql security definer set search_path to 'public' as $function$
declare v_f date[];
begin
  select array_agg(distinct f) into v_f from (
    select fecha as f from nuevas where upper(trim(estado)) = 'DISPONIBLE'
    union
    select fecha from viejas where upper(trim(estado)) = 'DISPONIBLE'
  ) t where f is not null;
  if v_f is not null then perform public.refrescar_programacion_turnos(v_f); end if;
  return null;
end; $function$;

create or replace function public.trg_refrescar_turnos_novedades_del()
returns trigger language plpgsql security definer set search_path to 'public' as $function$
declare v_f date[];
begin
  select array_agg(distinct fecha) into v_f from viejas
   where fecha is not null and upper(trim(estado)) = 'DISPONIBLE';
  if v_f is not null then perform public.refrescar_programacion_turnos(v_f); end if;
  return null;
end; $function$;

drop trigger if exists trg_novedades_turnos_ins on public.novedades;
create trigger trg_novedades_turnos_ins after insert on public.novedades
  referencing new table as nuevas for each statement execute function public.trg_refrescar_turnos_novedades_ins();

drop trigger if exists trg_novedades_turnos_upd on public.novedades;
create trigger trg_novedades_turnos_upd after update on public.novedades
  referencing old table as viejas new table as nuevas for each statement execute function public.trg_refrescar_turnos_novedades_upd();

drop trigger if exists trg_novedades_turnos_del on public.novedades;
create trigger trg_novedades_turnos_del after delete on public.novedades
  referencing old table as viejas for each statement execute function public.trg_refrescar_turnos_novedades_del();

-- La salida del disponible sí se evalúa (tiene hora fija). El resto queda igual.
create or replace function public.calcular_puntualidad_asistencia()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_dni text;
  v_prog record;
begin
  new.hora_programada := null;
  new.vehiculo_programado := null;
  new.turno_programado := null;
  new.minutos_diferencia := null;
  new.fecha_programada := null;
  new.puntualidad := 'sin_programacion';

  select c.dni into v_dni from public.colaboradores c where c.id = new.colaborador_id;
  if v_dni is null then
    return new;
  end if;

  select * into v_prog
    from public.programacion_de_marca(v_dni, new.fecha, new.hora, new.sentido);

  if v_prog.hora_programada is null then
    return new;
  end if;

  new.hora_programada := v_prog.hora_programada;
  new.vehiculo_programado := v_prog.vehiculo;
  new.turno_programado := v_prog.turno;
  new.fecha_programada := v_prog.fecha_programada;
  new.minutos_diferencia := v_prog.minutos;

  new.puntualidad := case
    -- Salida del turno 1: la programacion no dice la hora de relevo. No se juzga.
    -- Excepto el disponible (02:00 a 09:00): su salida tiene hora fija.
    when new.sentido = 'salida' and v_prog.turno = 1
         and upper(coalesce(v_prog.puesto, '')) <> 'DISPONIBLE' then 'no_evaluable'
    -- Salida del turno 2 (y del disponible): la falta es irse antes de HORA FIN.
    when new.sentido = 'salida' then
      case when v_prog.minutos < -15 then 'temprano' else 'a_tiempo' end
    -- Entrada: la falta es llegar tarde. Llegar antes es normal.
    else
      case when v_prog.minutos > 15 then 'tarde'
           when v_prog.minutos < -15 then 'temprano'
           else 'a_tiempo' end
  end;

  return new;
exception when others then
  return new;
end;
$function$;

-- Se rehace la programación de las fechas con disponibles.
select public.refrescar_programacion_turnos(
  (select array_agg(distinct fecha) from public.novedades
    where upper(trim(estado)) = 'DISPONIBLE' and fecha is not null));

-- Y se recalcula la puntualidad de las marcas de disponibles desde la fecha de corte (el trigger
-- trg_puntualidad_asistencia corre con el UPDATE de hora).
update public.asistencias a
   set hora = a.hora
  from public.colaboradores c
 where c.id = a.colaborador_id
   and a.fecha >= public.fecha_corte_verificacion()
   and exists (select 1 from public.programacion_turnos pt
                where pt.dni = c.dni and pt.puesto = 'DISPONIBLE'
                  and pt.fecha between a.fecha - 1 and a.fecha);
