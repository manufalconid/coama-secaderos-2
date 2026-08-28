-- Migration to add shift versioning based on effective date
alter table eventos_tiempo_muerto drop constraint if exists eventos_tiempo_muerto_turno_id_fkey;

alter table turnos drop constraint if exists turnos_pkey;

alter table turnos add column if not exists fecha_inicio_vigencia date not null default '2026-08-26';

alter table turnos add primary key (turno_id, fecha_inicio_vigencia);
