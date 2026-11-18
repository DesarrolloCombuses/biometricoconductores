-- Aviso por WhatsApp de cada inicio de labores de una base a un celular de supervisión (18-nov-2026).
--
-- Pedido del usuario: "una función que solo envíe los inicios de labores de conductores de base 3" a un número
-- de supervisión. Se usa la plantilla aprobada de WATI "comprobar" (la misma del comprobante del conductor),
-- porque no hay una propia para avisos y el usuario la quiso ya:
--   Hola {{1}}, tu marca de {{2}} quedó registrada correctamente.
--   Fecha: {{3}}  Hora: {{4}}  Documento: {{5}}
-- con {{1}} = nombre del conductor, {{2}} = "ENTRADA · BASE 3", {{4}} = "03:52 (turno 04:00)" y {{5}} = cédula.
--
-- A quién se avisa NO va en este archivo (el repositorio es público): vive en la tabla avisos_inicio_labores,
-- una fila por base y celular. Para agregar otra base u otro número basta un insert; para apagarlo,
-- activo = false.
--
-- Reglas del envío:
--   - Solo marcas de ENTRADA.
--   - La base es la que la app guarda en la marca (base_operativa, sale de la programación); si viene vacía, la
--     de programacion_turnos de ese día.
--   - Solo marcas del momento (a menos de 60 min de la hora actual de Colombia): una marca agregada o corregida
--     después en el panel no dispara aviso.
--   - Mismas credenciales de WATI que el comprobante (Vault: wati_api_token, wati_api_base_url).
--   - Nunca tumba la marca: cualquier error queda en la bitácora y la marca se guarda igual.

create table if not exists public.avisos_inicio_labores (
  id         bigint generated always as identity primary key,
  base       text not null,
  celular    text not null,               -- solo dígitos con indicativo, ej. 57300...
  activo     boolean not null default true,
  creado_en  timestamptz not null default now(),
  unique (base, celular)
);
alter table public.avisos_inicio_labores enable row level security;

create table if not exists public.avisos_inicio_labores_envios (
  id            bigint generated always as identity primary key,
  creado_en     timestamptz not null default now(),
  asistencia_id uuid,
  base          text,
  celular       text,
  request_id    bigint,                   -- net._http_response.id (la respuesta de WATI se guarda unas horas)
  estado        text
);
alter table public.avisos_inicio_labores_envios enable row level security;
create index if not exists avisos_inicio_labores_envios_creado_idx on public.avisos_inicio_labores_envios (creado_en);

create or replace function public.notificar_inicio_labores_base()
returns trigger
language plpgsql
security definer
set search_path = public, vault, extensions
as $function$
declare
  v_base      text;
  v_nombre    text;
  v_dni       text;
  v_token     text;
  v_base_url  text;
  v_hora      text;
  v_dest      record;
  v_req       bigint;
begin
  begin
    -- Solo marcas del momento, no las agregadas o corregidas después.
    if abs(extract(epoch from ((now() at time zone 'America/Bogota') - (new.fecha + new.hora)))) > 3600 then
      return new;
    end if;

    select c.nombre, c.dni into v_nombre, v_dni
      from public.colaboradores c where c.id = new.colaborador_id;

    v_base := nullif(upper(trim(coalesce(new.base_operativa, ''))), '');
    if v_base is null and v_dni is not null then
      select upper(trim(pt.base)) into v_base
        from public.programacion_turnos pt
       where pt.dni = v_dni and pt.fecha = new.fecha
       order by pt.turno limit 1;
    end if;
    if v_base is null then
      return new;
    end if;

    if not exists (select 1 from public.avisos_inicio_labores a
                    where a.activo and upper(trim(a.base)) = v_base) then
      return new;
    end if;

    select decrypted_secret into v_token
      from vault.decrypted_secrets where name = 'wati_api_token' limit 1;
    select decrypted_secret into v_base_url
      from vault.decrypted_secrets where name = 'wati_api_base_url' limit 1;
    if v_token is null or v_base_url is null then
      insert into public.avisos_inicio_labores_envios (asistencia_id, base, estado)
      values (new.id, v_base, 'sin credenciales WATI');
      return new;
    end if;

    v_hora := to_char(new.hora, 'HH24:MI')
              || case when new.hora_programada is not null
                      then ' (turno ' || to_char(new.hora_programada, 'HH24:MI') || ')' else '' end;

    for v_dest in
      select a.celular from public.avisos_inicio_labores a
       where a.activo and upper(trim(a.base)) = v_base
    loop
      begin
        select net.http_post(
          url     := v_base_url || '/api/v2/sendTemplateMessage?whatsappNumber='
                     || regexp_replace(v_dest.celular, '[^0-9]', '', 'g'),
          headers := jsonb_build_object('Content-Type', 'application/json', 'Authorization', v_token),
          body    := jsonb_build_object(
            'template_name', 'comprobar',
            'broadcast_name', 'inicio_labores_base',
            'channel_number', '573160235197',
            'parameters', jsonb_build_array(
              jsonb_build_object('name', '1', 'value', coalesce(v_nombre, 'Conductor')),
              jsonb_build_object('name', '2', 'value', 'ENTRADA · ' || v_base),
              jsonb_build_object('name', '3', 'value', to_char(new.fecha, 'DD/MM/YYYY')),
              jsonb_build_object('name', '4', 'value', v_hora),
              jsonb_build_object('name', '5', 'value', coalesce(v_dni, ''))
            ))
        ) into v_req;

        insert into public.avisos_inicio_labores_envios (asistencia_id, base, celular, request_id, estado)
        values (new.id, v_base, v_dest.celular, v_req, 'encolado');
      exception when others then
        begin
          insert into public.avisos_inicio_labores_envios (asistencia_id, base, celular, estado)
          values (new.id, v_base, v_dest.celular, 'error: ' || left(sqlerrm, 200));
        exception when others then null;
        end;
      end;
    end loop;
  exception when others then
    -- El aviso nunca tumba la marca; el error queda en la bitácora.
    begin
      insert into public.avisos_inicio_labores_envios (asistencia_id, base, estado)
      values (new.id, v_base, 'error: ' || left(sqlerrm, 200));
    exception when others then null;
    end;
  end;

  return new;
end;
$function$;

drop trigger if exists trg_notificar_inicio_labores_base on public.asistencias;
create trigger trg_notificar_inicio_labores_base
after insert on public.asistencias
for each row
when (new.sentido = 'entrada')
execute function public.notificar_inicio_labores_base();
