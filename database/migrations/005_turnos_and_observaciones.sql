-- Table for shift configuration
create table if not exists turnos (
  turno_id text primary key,
  nombre text not null,
  hora_inicio time not null,
  hora_fin time not null,
  horas_totales numeric(4, 2) not null default 12.00,
  horas_descanso numeric(4, 2) not null default 0.00,
  activo boolean not null default true,
  creado_en timestamptz not null default now(),
  modificado_en timestamptz not null default now()
);

-- Extra columns for razones_parada to support Level 3 Observations
alter table razones_parada
  add column if not exists observacion_obligatoria boolean not null default false,
  add column if not exists observaciones_predefinidas text;

-- Extra columns for eventos_tiempo_muerto to store operator, supervisor and shift details
alter table eventos_tiempo_muerto
  add column if not exists operador text,
  add column if not exists supervisor text,
  add column if not exists turno_id text references turnos(turno_id) on delete set null;
