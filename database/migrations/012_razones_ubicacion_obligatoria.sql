-- Migration 012 to add ubicacion_obligatoria column to razones_parada table
alter table razones_parada
  add column if not exists ubicacion_obligatoria boolean not null default false;

-- Permitir codigos duplicados o no unicos entre razones/origenes para evitar colisiones
alter table razones_parada drop constraint if exists razones_parada_codigo_key;
alter table origenes_parada drop constraint if exists origenes_parada_codigo_key;
