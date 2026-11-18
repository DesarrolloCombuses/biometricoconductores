-- Mapa de marcas: ver por CUENTA (usuario que registra) y si la marca quedó DENTRO o FUERA de
-- los despachos autorizados.
--
-- 1) Tabla despachos_autorizados: las geocercas donde se puede marcar. Se cargan las mismas 4 del
--    portal de conductores (PUNTOS_OPERATIVOS en portal/modulos/asistencia/supabase-config.js, con
--    polígono desde el 19-oct-2026). Para autorizar otro sitio (p. ej. el Aeropuerto) basta insertar
--    una fila; el portal tiene su propia copia en el config.
-- 2) metros_a_poligono(lat, lon, poligono): 0 si el punto está dentro del polígono; si no, metros al
--    borde. Misma cuenta que metrosAlPunto() del portal (rayo + distancia al segmento).
-- 3) marcas_con_ubicacion: agrega cuenta (email de registrado_por), cargo, despacho más cercano y
--    "fuera" (= distancia > min(precisión GPS, 20 m), igual que el portal). Nuevos filtros opcionales
--    p_cuenta y p_ubicacion ('fuera' | 'dentro'); devuelve la lista de cuentas con sus conteos para la
--    lista desplegable y los polígonos para dibujarlos. Compatible con la llamada vieja (3 parámetros).

create table if not exists public.despachos_autorizados (
  id serial primary key,
  nombre text not null,
  zona text,
  poligono jsonb not null,          -- [[lat, lon], [lat, lon], ...]
  activo boolean not null default true,
  creado_en timestamptz not null default now()
);

alter table public.despachos_autorizados enable row level security;
drop policy if exists despachos_autorizados_lectura on public.despachos_autorizados;
create policy despachos_autorizados_lectura on public.despachos_autorizados
  for select to authenticated using (true);
grant select on public.despachos_autorizados to authenticated;

insert into public.despachos_autorizados (nombre, zona, poligono)
select v.nombre, v.zona, v.poligono::jsonb
  from (values
    ('Almacentro', 'Almacentro',
     '[[6.2355,-75.5719],[6.2373,-75.5719],[6.2373,-75.57],[6.2355,-75.57]]'),
    ('Almacentro', 'CC San Diego (bahía de despacho)',
     '[[6.2364,-75.5709],[6.2369,-75.5709],[6.2369,-75.5702],[6.23745,-75.5702],[6.23745,-75.5689],[6.2364,-75.5689]]'),
    ('Nutibara', 'Nutibara',
     '[[6.2535359,-75.5669743],[6.2531093,-75.5661964],[6.2522721,-75.5667749],[6.2526933,-75.5673874]]'),
    ('Terminal Norte', 'Terminal Norte',
     '[[6.280523,-75.5715718],[6.2803417,-75.5710459],[6.2791579,-75.5714294],[6.2792059,-75.5716682]]')
  ) as v(nombre, zona, poligono)
 where not exists (select 1 from public.despachos_autorizados);

create or replace function public.metros_a_poligono(p_lat double precision, p_lon double precision, p_pol jsonb)
returns double precision
language plpgsql
immutable
set search_path = public
as $function$
declare
  n int := coalesce(jsonb_array_length(p_pol), 0);
  i int; j int;
  yi double precision; xi double precision; yj double precision; xj double precision;
  dentro boolean := false;
  kx double precision := 111320 * cos(radians(p_lat));
  ky double precision := 110540;
  ax double precision; ay double precision; bx double precision; by2 double precision;
  dx double precision; dy double precision; u double precision; den double precision;
  mejor double precision := 'Infinity';
begin
  if p_lat is null or p_lon is null or n < 3 then
    return null;
  end if;
  j := n - 1;
  for i in 0 .. n - 1 loop
    yi := (p_pol -> i ->> 0)::double precision; xi := (p_pol -> i ->> 1)::double precision;
    yj := (p_pol -> j ->> 0)::double precision; xj := (p_pol -> j ->> 1)::double precision;
    if ((yi > p_lat) <> (yj > p_lat)) and p_lon < (xj - xi) * (p_lat - yi) / (yj - yi) + xi then
      dentro := not dentro;
    end if;
    ax := (xi - p_lon) * kx;  ay := (yi - p_lat) * ky;
    bx := (xj - p_lon) * kx;  by2 := (yj - p_lat) * ky;
    dx := bx - ax;  dy := by2 - ay;
    den := dx * dx + dy * dy;
    u := greatest(0, least(1, -(ax * dx + ay * dy) / (case when den = 0 then 1 else den end)));
    mejor := least(mejor, sqrt((ax + u * dx) ^ 2 + (ay + u * dy) ^ 2));
    j := i;
  end loop;
  if dentro then
    return 0;
  end if;
  return mejor;
end;
$function$;

grant execute on function public.metros_a_poligono(double precision, double precision, jsonb) to authenticated;

-- La versión anterior tenía 3 parámetros; se reemplaza por una con 2 opcionales más.
drop function if exists public.marcas_con_ubicacion(date, date, text);

create or replace function public.marcas_con_ubicacion(
  p_desde date,
  p_hasta date,
  p_buscar text default null,
  p_cuenta text default null,
  p_ubicacion text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $function$
declare
  v_filas jsonb;
  v_total int;
  v_fuera int;
  v_cuentas jsonb;
  v_despachos jsonb;
  v_buscar text;
  v_cuenta text;
  v_ubic text;
begin
  if auth.uid() is null then
    raise exception 'No autorizado: debes iniciar sesion.';
  end if;

  if p_desde > p_hasta then
    return jsonb_build_object('ok', false, 'error', 'La fecha inicial no puede ser mayor que la final.');
  end if;
  if p_hasta - p_desde > 60 then
    return jsonb_build_object('ok', false, 'error', 'El rango no puede superar 60 dias.');
  end if;

  v_buscar := nullif(trim(coalesce(p_buscar, '')), '');
  v_cuenta := nullif(trim(coalesce(p_cuenta, '')), '');
  v_ubic   := nullif(lower(trim(coalesce(p_ubicacion, ''))), '');

  with base as (
    select a.id, a.fecha, a.hora, a.sentido, a.latitud, a.longitud,
           a.ubicacion_precision_m as precision_m, a.vehiculo_reporte as vehiculo, a.origen,
           c.dni, c.nombre, c.especialidad as cargo,
           coalesce(u.email, 'sin cuenta') as cuenta, d.punto, d.metros,
           case when d.metros is null then null
                else d.metros > least(coalesce(a.ubicacion_precision_m, 0), 20) end as fuera
      from public.asistencias a
      join public.colaboradores c on c.id = a.colaborador_id
      left join auth.users u on u.id = a.registrado_por
      left join lateral (
        select case when da.zona is null or da.zona = da.nombre then da.nombre
                    else da.nombre || ' - ' || da.zona end as punto,
               public.metros_a_poligono(a.latitud, a.longitud, da.poligono) as metros
          from public.despachos_autorizados da
         where da.activo
         order by 2 asc nulls last
         limit 1
      ) d on true
     where a.fecha between p_desde and p_hasta
       and a.latitud is not null and a.longitud is not null
       and (
         v_buscar is null
         or c.nombre ilike '%' || v_buscar || '%'
         or coalesce(c.dni, '') ilike '%' || v_buscar || '%'
         or coalesce(a.vehiculo_reporte, '') ilike '%' || v_buscar || '%'
       )
  ),
  -- Lista desplegable: todas las cuentas del rango (sin el filtro de cuenta ni de ubicación).
  cuentas as (
    select coalesce(jsonb_agg(jsonb_build_object('cuenta', cuenta, 'total', n, 'fuera', f) order by n desc), '[]'::jsonb) as j
      from (select cuenta, count(*) as n, count(*) filter (where fuera) as f from base group by cuenta) s
  ),
  filtrado as (
    select * from base
     where (v_cuenta is null or cuenta = v_cuenta)
       and (v_ubic is null
            or (v_ubic = 'fuera' and fuera is true)
            or (v_ubic = 'dentro' and fuera is false))
  ),
  limitado as (
    select * from filtrado order by fecha desc, hora desc limit 5000
  )
  select (select jsonb_agg(jsonb_build_object(
            'id', id, 'dni', dni, 'nombre', nombre, 'cargo', cargo, 'cuenta', cuenta,
            'fecha', fecha, 'hora', to_char(hora, 'HH24:MI'),
            'sentido', sentido,
            'lat', round(latitud::numeric, 6), 'lon', round(longitud::numeric, 6),
            'precision', round(coalesce(precision_m, 0)::numeric, 0),
            'vehiculo', vehiculo, 'origen', origen,
            'punto', punto, 'metros', round(metros::numeric, 0), 'fuera', fuera
          )) from limitado),
         (select count(*) from filtrado),
         (select count(*) from filtrado where fuera is true),
         (select j from cuentas)
    into v_filas, v_total, v_fuera, v_cuentas;

  select coalesce(jsonb_agg(jsonb_build_object('nombre', nombre, 'zona', zona, 'poligono', poligono) order by id), '[]'::jsonb)
    into v_despachos
    from public.despachos_autorizados where activo;

  return jsonb_build_object(
    'ok', true, 'desde', p_desde, 'hasta', p_hasta,
    'total', coalesce(v_total, 0),
    'fuera', coalesce(v_fuera, 0),
    'mostrados', coalesce(jsonb_array_length(v_filas), 0),
    'marcas', coalesce(v_filas, '[]'::jsonb),
    'cuentas', v_cuentas,
    'despachos', v_despachos
  );
end;
$function$;

grant execute on function public.marcas_con_ubicacion(date, date, text, text, text) to authenticated;
