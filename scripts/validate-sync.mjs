import { InMemorySyncStore } from "../apps/api/src/store.mjs";

const store = new InMemorySyncStore();

const event = {
  evento_id: "11111111-1111-4111-8111-111111111111",
  tablet_id: "tab-sec-1",
  secadero_id: "sec-1",
  razon_id: "raz-mantenimiento",
  fecha_hora_inicio: "2026-08-03T10:00:00.000Z",
  fecha_hora_fin: "2026-08-03T10:25:00.000Z",
  duracion_segundos: 1500,
  observacion: "Prueba de sincronizacion con multiples origenes.",
  estado_evento: "cerrado",
  version: 1,
  origenes: [
    { origen_id: "ori-secadero" },
    { origen_id: "ori-caldera" }
  ],
  propuesta_manual: {
    tipo: "razon",
    texto: "Falla de vapor caldera",
    comentario: "No estaba en la lista de razones."
  }
};

const firstSync = store.syncBatch([event]);
const secondSync = store.syncBatch([event]);
const invalidSync = store.syncBatch([
  {
    ...event,
    evento_id: "22222222-2222-4222-8222-222222222222",
    origenes: []
  }
]);

const snapshot = store.snapshot();
const result = {
  firstSync,
  secondSync,
  invalidSync,
  eventCount: snapshot.events.length,
  manualProposalCount: snapshot.manualProposals.length,
  expected: {
    firstSync: "inserted",
    secondSync: "updated sin duplicar",
    invalidSync: "rechazado por no tener origen",
    eventCount: 1,
    manualProposalCount: 1
  }
};

console.log(JSON.stringify(result, null, 2));

if (
  firstSync.accepted[0]?.status !== "inserted" ||
  secondSync.accepted[0]?.status !== "updated" ||
  invalidSync.rejected.length !== 1 ||
  snapshot.events.length !== 1 ||
  snapshot.manualProposals.length !== 1
) {
  process.exitCode = 1;
}
