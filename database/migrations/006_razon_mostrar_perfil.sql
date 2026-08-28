-- Migration 006 to add mostrar_perfil column to razones_parada
alter table razones_parada
  add column if not exists mostrar_perfil boolean not null default false;
