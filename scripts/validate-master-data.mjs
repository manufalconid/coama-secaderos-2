import { InMemorySyncStore } from "../apps/api/src/store.mjs";

const store = new InMemorySyncStore();

const origen = store.saveOrigen({
  origen_id: "ori-tablero",
  codigo: "TABLERO",
  nombre: "Tablero electrico"
});

const razon = store.saveRazon({
  razon_id: "raz-sensor",
  origen_ids: [origen.origen_id],
  codigo: "SENSOR",
  nombre: "Falla de sensor"
});

store.saveOrigen(
  {
    codigo: "TABLERO",
    nombre: "Tablero electrico principal",
    activa: false
  },
  origen.origen_id
);

const event = {
  evento_id: "33333333-3333-4333-8333-333333333333",
  tablet_id: "tab-sec-1",
  secadero_id: "sec-1",
  razon_id: razon.razon_id,
  fecha_hora_inicio: "2026-08-03T11:00:00.000Z",
  fecha_hora_fin: "2026-08-03T11:10:00.000Z",
  duracion_segundos: 600,
  observacion: "Prueba de propuesta manual.",
  estado_evento: "cerrado",
  version: 1,
  origenes: [{ origen_id: origen.origen_id }],
  propuesta_manual: {
    tipo: "razon",
    texto: "Sensor camara norte",
    comentario: "No estaba en origenes."
  }
};

store.syncBatch([event]);

const pendingProposals = store.listPropuestas({ estado: "pendiente" });
const reviewedProposal = store.reviewPropuesta(pendingProposals[0].propuesta_id, {
  estado_revision: "rechazada",
  revisada_por: "supervisor-demo"
});

const result = {
  razon,
  origenActualizado: store.listOrigenes().find(item => item.origen_id === origen.origen_id),
  pendingProposalCount: pendingProposals.length,
  reviewedProposal
};

console.log(JSON.stringify(result, null, 2));

if (
  razon.nombre !== "Falla de sensor" ||
  result.origenActualizado.activa !== false ||
  pendingProposals.length !== 1 ||
  reviewedProposal.estado_revision !== "rechazada"
) {
  process.exitCode = 1;
}
