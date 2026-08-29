import { InMemorySyncStore } from "../apps/api/src/store.mjs";
import { exportParametros, importParametros } from "../apps/api/src/parametros-handler.mjs";

async function run() {
  try {
    const store = new InMemorySyncStore();
    console.log("Store initialized. Exporting parameters...");
    const buffer = await exportParametros(store);
    console.log("Parameters exported successfully, buffer length:", buffer.length);

    console.log("Importing parameters back...");
    const result = await importParametros(store, buffer);
    console.log("Import result:", result);

    const masterData = await store.getMasterData();
    console.log("Imported secaderos count:", masterData.secaderos.length);
    console.log("Imported tablets count:", masterData.tablets.length);
    console.log("Imported origenes count:", masterData.origenes.length);
    console.log("Imported razones count:", masterData.razones.length);
    console.log("Imported turnos count:", masterData.turnos.length);
  } catch (err) {
    console.error("Error during parameters roundtrip:", err);
  }
}

run();
