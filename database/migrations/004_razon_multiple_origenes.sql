-- Drop the foreign key constraint and column origen_id from razones_parada
alter table razones_parada drop constraint if exists razones_parada_origen_id_fkey;
alter table razones_parada drop column if exists origen_id;

-- Create junction table razon_origenes
create table if not exists razon_origenes (
  razon_id text not null references razones_parada(razon_id) on delete cascade,
  origen_id text not null references origenes_parada(origen_id) on delete cascade,
  primary key (razon_id, origen_id)
);
