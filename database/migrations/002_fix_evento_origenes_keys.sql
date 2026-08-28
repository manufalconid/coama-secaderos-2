alter table if exists evento_origenes
  add column if not exists evento_origen_id bigserial;

do $$
begin
  if exists (
    select 1
    from information_schema.table_constraints
    where table_name = 'evento_origenes'
      and constraint_name = 'evento_origenes_pkey'
  ) then
    alter table evento_origenes drop constraint evento_origenes_pkey;
  end if;

  update evento_origenes
  set evento_origen_id = nextval(pg_get_serial_sequence('evento_origenes', 'evento_origen_id'))
  where evento_origen_id is null;

  alter table evento_origenes
    alter column evento_origen_id set not null;

  if not exists (
    select 1
    from information_schema.table_constraints
    where table_name = 'evento_origenes'
      and constraint_name = 'evento_origenes_pkey'
  ) then
    alter table evento_origenes
      add constraint evento_origenes_pkey primary key (evento_origen_id);
  end if;
end $$;

create unique index if not exists uq_evento_origen_maestro
  on evento_origenes(evento_id, origen_id)
  where origen_id is not null;

create unique index if not exists uq_evento_origen_manual
  on evento_origenes(evento_id, origen_manual)
  where origen_manual is not null;

create unique index if not exists uq_propuesta_evento_tipo_texto
  on propuestas_maestro(evento_id, tipo, texto);
