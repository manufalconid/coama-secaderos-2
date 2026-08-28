create table if not exists secaderos (
  secadero_id text primary key,
  codigo text not null unique,
  nombre text not null,
  activo boolean not null default true,
  creado_en timestamptz not null default now(),
  modificado_en timestamptz not null default now()
);

create table if not exists tablets (
  tablet_id text primary key,
  secadero_id text not null references secaderos(secadero_id),
  nombre text not null,
  activa boolean not null default true,
  creado_en timestamptz not null default now(),
  modificado_en timestamptz not null default now()
);

create table if not exists categorias_parada (
  categoria_id text primary key,
  codigo text not null unique,
  nombre text not null,
  activa boolean not null default true,
  creado_en timestamptz not null default now(),
  modificado_en timestamptz not null default now()
);

create table if not exists razones_parada (
  razon_id text primary key,
  categoria_id text references categorias_parada(categoria_id),
  codigo text unique,
  nombre text not null,
  activa boolean not null default true,
  creada_por text not null default 'sistema',
  creado_en timestamptz not null default now(),
  modificado_en timestamptz not null default now()
);

create table if not exists origenes_parada (
  origen_id text primary key,
  codigo text unique,
  nombre text not null,
  activo boolean not null default true,
  creado_por text not null default 'sistema',
  creado_en timestamptz not null default now(),
  modificado_en timestamptz not null default now()
);

create table if not exists eventos_tiempo_muerto (
  evento_id uuid primary key,
  tablet_id text not null references tablets(tablet_id),
  secadero_id text not null references secaderos(secadero_id),
  razon_id text references razones_parada(razon_id),
  razon_manual text,
  fecha_hora_inicio timestamptz not null,
  fecha_hora_fin timestamptz,
  duracion_segundos integer,
  observacion text,
  estado_evento text not null check (estado_evento in ('abierto', 'cerrado', 'corregido', 'anulado')),
  version integer not null check (version >= 1),
  creado_en_tablet timestamptz,
  recibido_en_servidor timestamptz not null default now(),
  modificado_en timestamptz not null default now()
);

create table if not exists evento_origenes (
  evento_origen_id bigserial primary key,
  evento_id uuid not null references eventos_tiempo_muerto(evento_id) on delete restrict,
  origen_id text references origenes_parada(origen_id),
  origen_manual text,
  creado_en timestamptz not null default now(),
  check (origen_id is not null or origen_manual is not null)
);

create unique index if not exists uq_evento_origen_maestro
  on evento_origenes(evento_id, origen_id)
  where origen_id is not null;

create unique index if not exists uq_evento_origen_manual
  on evento_origenes(evento_id, origen_manual)
  where origen_manual is not null;

create table if not exists propuestas_maestro (
  propuesta_id uuid primary key,
  evento_id uuid not null references eventos_tiempo_muerto(evento_id) on delete restrict,
  tipo text not null check (tipo in ('razon', 'origen')),
  texto text not null,
  comentario_operario text,
  estado_revision text not null default 'pendiente' check (estado_revision in ('pendiente', 'aprobada', 'rechazada', 'fusionada')),
  revisada_por text,
  revisada_en timestamptz,
  maestro_destino_id text,
  creado_en timestamptz not null default now()
);

create unique index if not exists uq_propuesta_evento_tipo_texto
  on propuestas_maestro(evento_id, tipo, texto);

create table if not exists historial_modificaciones (
  historial_id bigserial primary key,
  entidad text not null,
  entidad_id text not null,
  accion text not null,
  usuario_id text,
  motivo text,
  antes jsonb,
  despues jsonb,
  creado_en timestamptz not null default now()
);

create index if not exists idx_eventos_fecha_inicio on eventos_tiempo_muerto(fecha_hora_inicio);
create index if not exists idx_eventos_secadero on eventos_tiempo_muerto(secadero_id);
create index if not exists idx_propuestas_estado on propuestas_maestro(estado_revision);
