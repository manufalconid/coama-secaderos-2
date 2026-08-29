import { exportAllToSheets } from "../apps/api/src/sheets-sync.mjs";

console.log("Iniciando prueba de exportAllToSheets INCREMENTAL a Google Sheets...");
console.log("GOOGLE_SHEET_ID:", process.env.GOOGLE_SHEET_ID);

const dummyEvents1 = [
  {
    evento_id: "test-event-uuid-1111",
    tablet_id: "tab-sec-omeco",
    secadero_id: "sec-omeco",
    linea: "OMECO",
    fecha_hora_inicio: "2026-08-29T06:00:00.000Z",
    fecha_hora_fin: "2026-08-29T06:30:00.000Z",
    duracion_segundos: 1800,
    estado_evento: "cerrado",
    tipo_registro: "detencion",
    origen_id: "ori-mecanico",
    razon_id: "raz-atascamiento",
    observacion: "Atascamiento mecánico de lámina en secadero OMECO",
    version: 2,
    fecha_registro: "2026-08-29",
    hora_registro: "06:30:00",
    tipo_turno: "Día",
    turno_id: "tur-dia",
    hora_inicio_turno: "06:00:00",
    hora_fin_turno: "18:00:00",
    tiempo_de_descanso: 1.5,
    tiempo_disponible_turno: 10.5,
    tiempo_parada: 1800,
    categoria_tm: "MECÁNICO",
    tiempo_muerto: "ATASCAMIENTO",
    ubicacion: "Entrada"
  },
  {
    evento_id: "test-event-uuid-2222",
    tablet_id: "tab-sec-omeco",
    secadero_id: "sec-omeco",
    linea: "OMECO",
    fecha_hora_inicio: "2026-08-29T09:15:00.000Z",
    fecha_hora_fin: null,
    duracion_segundos: null,
    estado_evento: "abierto",
    tipo_registro: "detencion",
    origen_id: "ori-electrico",
    razon_id: "raz-corte",
    observacion: "Corte de energía eléctrica",
    version: 1,
    fecha_registro: "2026-08-29",
    hora_registro: "09:15:00",
    tipo_turno: "Día",
    turno_id: "tur-dia",
    hora_inicio_turno: "06:00:00",
    hora_fin_turno: "18:00:00",
    tiempo_de_descanso: 1.5,
    tiempo_disponible_turno: 10.5,
    tiempo_parada: null,
    categoria_tm: "ELÉCTRICO",
    tiempo_muerto: "CORTE DE ENERGIA",
    ubicacion: "General"
  }
];

const dummyMasterData = {
  secaderos: [
    { secadero_id: "sec-omeco", nombre: "OMECO" }
  ],
  turnos: [
    {
      turno_id: "tur-dia",
      nombre: "Día",
      hora_inicio: "06:00:00",
      hora_fin: "18:00:00",
      horas_totales: 12.0,
      horas_descanso: 1.5,
      activo: true
    }
  ]
};

try {
  console.log("\n--- FASE 1: Enviando eventos iniciales ---");
  await exportAllToSheets(dummyEvents1, dummyMasterData);
  console.log("Fase 1 completada con éxito.");

  // Modificar observación del evento 1, cerrar el evento 2 y añadir un nuevo evento 3
  const dummyEvents2 = [
    {
      ...dummyEvents1[0],
      observacion: "Atascamiento mecánico de lámina - MODIFICADO",
      version: 3
    },
    {
      ...dummyEvents1[1],
      fecha_hora_fin: "2026-08-29T10:15:00.000Z",
      duracion_segundos: 3600,
      estado_evento: "cerrado",
      tiempo_parada: 3600,
      version: 2
    },
    {
      evento_id: "test-event-uuid-3333",
      tablet_id: "tab-sec-omeco",
      secadero_id: "sec-omeco",
      linea: "OMECO",
      fecha_hora_inicio: "2026-08-29T11:00:00.000Z",
      fecha_hora_fin: "2026-08-29T12:00:00.000Z",
      duracion_segundos: 3600,
      estado_evento: "cerrado",
      tipo_registro: "detencion",
      origen_id: "ori-mecanico",
      razon_id: "raz-atascamiento",
      observacion: "Evento adicional nuevo",
      version: 1,
      fecha_registro: "2026-08-29",
      hora_registro: "12:00:00",
      tipo_turno: "Día",
      turno_id: "tur-dia",
      hora_inicio_turno: "06:00:00",
      hora_fin_turno: "18:00:00",
      tiempo_de_descanso: 1.5,
      tiempo_disponible_turno: 10.5,
      tiempo_parada: 3600,
      categoria_tm: "MECÁNICO",
      tiempo_muerto: "ATASCAMIENTO",
      ubicacion: "Salida"
    }
  ];

  console.log("\n--- FASE 2: Enviando datos modificados + nuevo evento (Debería hacer Upsert) ---");
  await exportAllToSheets(dummyEvents2, dummyMasterData);
  console.log("Fase 2 completada con éxito. Verifique los resultados en la planilla.");
} catch (err) {
  console.error("Fallo en la prueba:", err);
  process.exitCode = 1;
}
