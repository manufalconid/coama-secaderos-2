-- Migration 007 to add the new unified downtime fields to eventos_tiempo_muerto
alter table eventos_tiempo_muerto
  add column if not exists fecha_registro date,
  add column if not exists hora_registro time,
  add column if not exists timestamp_registro timestamptz,
  add column if not exists hora_inicio_turno time,
  add column if not exists hora_fin_turno time,
  add column if not exists tipo_turno text,
  add column if not exists hora_inicio_descanso time,
  add column if not exists hora_fin_descanso time,
  add column if not exists linea text,
  add column if not exists hora_desde timestamptz,
  add column if not exists hora_hasta timestamptz,
  add column if not exists categoria_tm text,
  add column if not exists tiempo_muerto text,
  add column if not exists observaciones text,
  add column if not exists ubicacion text,
  add column if not exists tiempo_disponible_turno numeric(4, 2),
  add column if not exists tiempo_parada integer;

-- Migrate existing data if any
update eventos_tiempo_muerto
set
  timestamp_registro = coalesce(creado_en_tablet, recibido_en_servidor),
  fecha_registro = coalesce(creado_en_tablet, recibido_en_servidor)::date,
  hora_registro = coalesce(creado_en_tablet, recibido_en_servidor)::time,
  hora_desde = fecha_hora_inicio,
  hora_hasta = fecha_hora_fin,
  tiempo_parada = duracion_segundos,
  observaciones = observacion
where timestamp_registro is null;
