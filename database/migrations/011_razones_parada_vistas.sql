-- Migration 011 to add location view configuration columns to razones_parada table
alter table razones_parada add column if not exists ubicacion_fija text;
alter table razones_parada add column if not exists ubicacion_lista text;
alter table razones_parada add column if not exists vista_electricos boolean default false;
alter table razones_parada add column if not exists vista_mecanicos boolean default false;
alter table razones_parada add column if not exists vista_mecanicos_rodillos boolean default false;
alter table razones_parada add column if not exists matriz boolean default false;
alter table razones_parada add column if not exists matriz_extendida boolean default false;
