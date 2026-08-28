-- Migration to clean up operators and supervisors tracking columns
alter table propuestas_maestro rename column comentario_operario to comentario;
alter table propuestas_maestro drop column if exists revisada_por;
alter table eventos_tiempo_muerto drop column if exists operador;
alter table eventos_tiempo_muerto drop column if exists supervisor;
