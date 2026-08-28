-- Migration 011 to add link/reference to start of stoppage event
alter table eventos_tiempo_muerto
  add column if not exists inicio_evento_id uuid;
