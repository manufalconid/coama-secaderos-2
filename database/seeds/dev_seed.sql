truncate table razon_origenes cascade;
truncate table razones_parada cascade;
truncate table origenes_parada cascade;

insert into secaderos (secadero_id, codigo, nombre)
values
  ('sec-omeco', 'OMECO', 'OMECO'),
  ('sec-benecke', 'BENECKE', 'BENECKE'),
  ('sec-raute', 'RAUTE', 'RAUTE')
on conflict (secadero_id) do update set codigo = excluded.codigo, nombre = excluded.nombre;

insert into tablets (tablet_id, secadero_id, nombre, ip_tablet)
values
  ('tab-sec-omeco', 'sec-omeco', 'Tablet OMECO', '192.168.10.51'),
  ('tab-sec-benecke', 'sec-benecke', 'Tablet BENECKE', '192.168.10.52'),
  ('tab-sec-raute', 'sec-raute', 'Tablet RAUTE', '192.168.10.53')
on conflict (tablet_id) do update set secadero_id = excluded.secadero_id, nombre = excluded.nombre, ip_tablet = excluded.ip_tablet;

insert into turnos (turno_id, nombre, hora_inicio, hora_fin, horas_totales, horas_descanso, activo, fecha_inicio_vigencia)
values
  ('tur-dia', 'Turno Día (06:00 a 18:00)', '06:00:00', '18:00:00', 12.00, 1.00, true, '2026-08-26'),
  ('tur-noche', 'Turno Noche (18:00 a 06:00)', '18:00:00', '06:00:00', 12.00, 1.00, true, '2026-08-26')
on conflict (turno_id, fecha_inicio_vigencia) do update set
  nombre = excluded.nombre,
  hora_inicio = excluded.hora_inicio,
  hora_fin = excluded.hora_fin,
  horas_totales = excluded.horas_totales,
  horas_descanso = excluded.horas_descanso,
  activo = excluded.activo;

insert into origenes_parada (origen_id, codigo, nombre)
values
  ('ori-electrico', 'ELECTRICO', 'ELECTRICO'),
  ('ori-externo', 'EXTERNO', 'EXTERNO'),
  ('ori-logistica', 'LOGISTICA', 'LOGISTICA'),
  ('ori-mecanico', 'MECANICO', 'MECANICO'),
  ('ori-neumatico', 'NEUMATICO', 'NEUMATICO'),
  ('ori-operativo', 'OPERATIVO', 'OPERATIVO'),
  ('ori-proceso', 'PROCESO', 'PROCESO')
on conflict (origen_id) do update set codigo = excluded.codigo, nombre = excluded.nombre;

insert into razones_parada (razon_id, codigo, nombre, activa, observacion_obligatoria, mostrar_perfil)
values
  ('raz-cargador', 'P001', 'CARGADOR', true, false, false),
  ('raz-corte-energia', 'P002', 'CORTE DE ENERGIA', true, false, false),
  ('raz-evacuacion-paquetes', 'P003', 'EVACUACIÓN DE PAQUETES', true, false, false),
  ('raz-falta-abastecimiento', 'P004', 'FALTA ABASTECIMIENTO', true, false, false),
  ('raz-cadena', 'P005', 'CADENA', true, false, false),
  ('raz-compresor', 'P006', 'COMPRESOR', true, false, false),
  ('raz-mecanico', 'P007', 'MECANICO', true, false, false),
  ('raz-rodillo-entrada', 'P008', 'RODILLO DE ENTRADA', true, false, false),
  ('raz-varios', 'P009', 'Varios', true, false, false),
  ('raz-falta-aire', 'P010', 'FALTA AIRE', true, false, false),
  ('raz-caldera', 'P011', 'CALDERA', true, false, false),
  ('raz-cambio-medida', 'P012', 'CAMBIO DE MEDIDA', true, false, false),
  ('raz-capacitacion', 'P013', 'CAPACITACION', true, false, false),
  ('raz-parada-humedad', 'P014', 'PARADA POR HUMEDAD', true, false, false),
  ('raz-parada-programada', 'P015', 'PARADA PROGRAMADA', true, false, false),
  ('raz-recarga-secadero', 'P016', 'RECARGA DEL SECADERO', true, false, false),
  ('raz-secadero-trancado', 'P017', 'SECADERO TRANCADO', true, false, false),
  ('raz-motores-no-encienden', 'P018', 'MOTORES NO ENCIENDEN', true, false, false),
  ('raz-problema-electrico', 'P019', 'PROBLEMA ELECTRICO', true, false, false),
  ('raz-tablero-control', 'P020', 'TABLERO DE CONTROL', true, false, false),
  ('raz-cinta-mesa-salida', 'P021', 'CINTA DE MESA DE SALIDA', true, false, false),
  ('raz-mesa-entrada', 'P022', 'MESA DE ENTRADA', true, false, false),
  ('raz-mesa-salida', 'P023', 'MESA DE SALIDA', true, false, false),
  ('raz-polea', 'P024', 'POLEA', true, false, false),
  ('raz-limpieza', 'P025', 'LIMPIEZA', true, false, false),
  ('raz-motor-principal', 'P026', 'MOTOR PRINCIPAL', true, false, false),
  ('raz-recargar-aceite', 'P027', 'RECARGAR ACEITE', true, false, false),
  ('raz-banio', 'P028', 'BAÑO', true, false, false),
  ('raz-falta-personal', 'P029', 'FALTA PERSONAL', true, false, false),
  ('raz-falta-presion-vapor', 'P030', 'FALTA PRESION VAPOR', true, false, false),
  ('raz-sin-material', 'P031', 'SIN MATERIAL', true, false, false),
  ('raz-atascamiento', 'P032', 'ATASCAMIENTO', true, true, true)
on conflict (razon_id) do update set 
  codigo = excluded.codigo, 
  nombre = excluded.nombre, 
  activa = excluded.activa,
  observacion_obligatoria = excluded.observacion_obligatoria,
  mostrar_perfil = excluded.mostrar_perfil;

insert into razon_origenes (razon_id, origen_id)
values
  ('raz-cargador', 'ori-electrico'),
  ('raz-cargador', 'ori-mecanico'),
  ('raz-corte-energia', 'ori-externo'),
  ('raz-evacuacion-paquetes', 'ori-logistica'),
  ('raz-evacuacion-paquetes', 'ori-operativo'),
  ('raz-evacuacion-paquetes', 'ori-proceso'),
  ('raz-falta-abastecimiento', 'ori-logistica'),
  ('raz-falta-abastecimiento', 'ori-operativo'),
  ('raz-cadena', 'ori-mecanico'),
  ('raz-compresor', 'ori-mecanico'),
  ('raz-compresor', 'ori-neumatico'),
  ('raz-mecanico', 'ori-mecanico'),
  ('raz-rodillo-entrada', 'ori-mecanico'),
  ('raz-varios', 'ori-mecanico'),
  ('raz-falta-aire', 'ori-neumatico'),
  ('raz-caldera', 'ori-operativo'),
  ('raz-caldera', 'ori-proceso'),
  ('raz-cambio-medida', 'ori-operativo'),
  ('raz-cambio-medida', 'ori-proceso'),
  ('raz-capacitacion', 'ori-operativo'),
  ('raz-parada-humedad', 'ori-operativo'),
  ('raz-parada-humedad', 'ori-proceso'),
  ('raz-parada-programada', 'ori-operativo'),
  ('raz-parada-programada', 'ori-proceso'),
  ('raz-recarga-secadero', 'ori-logistica'),
  ('raz-recarga-secadero', 'ori-operativo'),
  ('raz-recarga-secadero', 'ori-proceso'),
  ('raz-secadero-trancado', 'ori-operativo'),
  ('raz-secadero-trancado', 'ori-proceso'),
  ('raz-motores-no-encienden', 'ori-electrico'),
  ('raz-problema-electrico', 'ori-electrico'),
  ('raz-tablero-control', 'ori-electrico'),
  ('raz-cinta-mesa-salida', 'ori-mecanico'),
  ('raz-mesa-entrada', 'ori-mecanico'),
  ('raz-mesa-salida', 'ori-mecanico'),
  ('raz-polea', 'ori-mecanico'),
  ('raz-limpieza', 'ori-operativo'),
  ('raz-motor-principal', 'ori-electrico'),
  ('raz-recargar-aceite', 'ori-mecanico'),
  ('raz-banio', 'ori-operativo'),
  ('raz-falta-personal', 'ori-operativo'),
  ('raz-falta-presion-vapor', 'ori-operativo'),
  ('raz-sin-material', 'ori-proceso'),
  ('raz-atascamiento', 'ori-operativo'),
  ('raz-atascamiento', 'ori-mecanico')
on conflict do nothing;
