-- Drop foreign key constraint on razones_parada for categoria_id
alter table razones_parada drop constraint if exists razones_parada_categoria_id_fkey;

-- Rename the column from categoria_id to origen_id
alter table razones_parada rename column categoria_id to origen_id;

-- Add foreign key constraint to origenes_parada
alter table razones_parada
  add constraint razones_parada_origen_id_fkey
  foreign key (origen_id)
  references origenes_parada(origen_id)
  on delete restrict;

-- Drop table categorias_parada cascade since it is no longer used
drop table if exists categorias_parada cascade;
