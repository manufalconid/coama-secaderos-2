import { Capacitor } from "@capacitor/core";
import { CapacitorSQLite, SQLiteConnection, SQLiteDBConnection } from "@capacitor-community/sqlite";

export interface StoppageEvent {
  evento_id: string;
  tablet_id?: string;
  secadero_id: string;
  fecha_hora_inicio: string;
  fecha_hora_fin: string | null;
  duracion_segundos: number | null;
  estado_evento: "abierto" | "cerrado";
  tipo_registro: "automatica" | "manual";
  origen_id: string | null;
  razon_id: string | null;
  observacion: string;
  version: number;
  sincronizado?: boolean; // mapped to 0 or 1 in SQLite
  timestamp_registro?: string | null;
  fecha_registro?: string | null;
  hora_registro?: string | null;
  hora_inicio_turno?: string | null;
  hora_fin_turno?: string | null;
  tipo_turno?: string | null;
  hora_inicio_descanso?: string | null;
  hora_fin_descanso?: string | null;
  linea?: string | null;
  hora_desde?: string | null;
  hora_hasta?: string | null;
  categoria_tm?: string | null;
  tiempo_muerto?: string | null;
  observaciones?: string | null;
  ubicacion?: string | null;
  tiempo_disponible_turno?: number | null;
  tiempo_parada?: number | null;
  turno_id?: string | null;
  inicio_evento_id?: string | null;
}

class HybridDatabase {
  private isNative: boolean;
  private sqliteConn: SQLiteConnection | null = null;
  private db: SQLiteDBConnection | null = null;
  private indexedDb: IDBDatabase | null = null;

  constructor() {
    this.isNative = Capacitor.isNativePlatform();
  }

  async init() {
    if (this.isNative) {
      try {
        this.sqliteConn = new SQLiteConnection(CapacitorSQLite);
        this.db = await this.sqliteConn.createConnection(
          "coama_secaderos",
          false,
          "no-encryption",
          1,
          false
        );
        await this.db.open();

        // Create events table
        await this.db.execute(`
          CREATE TABLE IF NOT EXISTS events (
            evento_id TEXT PRIMARY KEY,
            tablet_id TEXT,
            secadero_id TEXT,
            fecha_hora_inicio TEXT,
            fecha_hora_fin TEXT,
            duracion_segundos INTEGER,
            estado_evento TEXT,
            tipo_registro TEXT,
            origen_id TEXT,
            razon_id TEXT,
            observacion TEXT,
            version INTEGER,
            sincronizado INTEGER,
            timestamp_registro TEXT,
            fecha_registro TEXT,
            hora_registro TEXT,
            hora_inicio_turno TEXT,
            hora_fin_turno TEXT,
            tipo_turno TEXT,
            hora_inicio_descanso TEXT,
            hora_fin_descanso TEXT,
            linea TEXT,
            hora_desde TEXT,
            hora_hasta TEXT,
            categoria_tm TEXT,
            tiempo_muerto TEXT,
            observaciones TEXT,
            ubicacion TEXT,
            tiempo_disponible_turno INTEGER,
            tiempo_parada INTEGER,
            turno_id TEXT,
            inicio_evento_id TEXT
          );
        `);

        // Run Alter Table just in case database was already created
        try {
          await this.db.execute("ALTER TABLE events ADD COLUMN inicio_evento_id TEXT;");
        } catch (e) {
          // Ignore if column already exists
        }

        // Create settings table
        await this.db.execute(`
          CREATE TABLE IF NOT EXISTS settings (
            key TEXT PRIMARY KEY,
            value TEXT
          );
        `);
        console.log("SQLite inicializado correctamente.");
      } catch (err) {
        console.error("Error inicializando SQLite, cayendo en IndexedDB fallback:", err);
        this.isNative = false;
        await this.initIndexedDb();
      }
    } else {
      await this.initIndexedDb();
    }
  }

  private initIndexedDb(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open("coama_secaderos_idb", 1);
      
      request.onupgradeneeded = (event: any) => {
        const db = event.target.result;
        if (!db.objectStoreNames.contains("events")) {
          db.createObjectStore("events", { keyPath: "evento_id" });
        }
        if (!db.objectStoreNames.contains("settings")) {
          db.createObjectStore("settings", { keyPath: "key" });
        }
      };

      request.onsuccess = (event: any) => {
        this.indexedDb = event.target.result;
        console.log("IndexedDB inicializado correctamente.");
        resolve();
      };

      request.onerror = (event: any) => {
        console.error("Error abriendo IndexedDB:", event);
        reject(event);
      };
    });
  }

  // --- EVENTS OPERATIONS ---

  async getEvents(): Promise<StoppageEvent[]> {
    if (this.isNative && this.db) {
      const res = await this.db.query("SELECT * FROM events");
      return (res.values || []).map((row: any) => ({
        ...row,
        sincronizado: row.sincronizado === 1
      })) as StoppageEvent[];
    } else {
      return new Promise((resolve, reject) => {
        if (!this.indexedDb) return resolve([]);
        const tx = this.indexedDb.transaction("events", "readonly");
        const store = tx.objectStore("events");
        const request = store.getAll();

        request.onsuccess = () => resolve(request.result || []);
        request.onerror = () => reject(request.error);
      });
    }
  }

  async saveEvent(event: StoppageEvent): Promise<void> {
    if (this.isNative && this.db) {
      const fields = [
        "evento_id", "tablet_id", "secadero_id", "fecha_hora_inicio", "fecha_hora_fin",
        "duracion_segundos", "estado_evento", "tipo_registro", "origen_id", "razon_id",
        "observacion", "version", "sincronizado", "timestamp_registro", "fecha_registro",
        "hora_registro", "hora_inicio_turno", "hora_fin_turno", "tipo_turno",
        "hora_inicio_descanso", "hora_fin_descanso", "linea", "hora_desde", "hora_hasta",
        "categoria_tm", "tiempo_muerto", "observaciones", "ubicacion",
        "tiempo_disponible_turno", "tiempo_parada", "turno_id", "inicio_evento_id"
      ];
      const placeholders = fields.map(() => "?").join(",");
      const values = [
        event.evento_id, event.tablet_id || null, event.secadero_id, event.fecha_hora_inicio, event.fecha_hora_fin || null,
        event.duracion_segundos ?? null, event.estado_evento, event.tipo_registro, event.origen_id || null, event.razon_id || null,
        event.observacion, event.version, event.sincronizado ? 1 : 0, event.timestamp_registro || null, event.fecha_registro || null,
        event.hora_registro || null, event.hora_inicio_turno || null, event.hora_fin_turno || null, event.tipo_turno || null,
        event.hora_inicio_descanso || null, event.hora_fin_descanso || null, event.linea || null, event.hora_desde || null, event.hora_hasta || null,
        event.categoria_tm || null, event.tiempo_muerto || null, event.observaciones || null, event.ubicacion || null,
        event.tiempo_disponible_turno ?? null, event.tiempo_parada ?? null, event.turno_id || null, event.inicio_evento_id || null
      ];

      await this.db.run(
        `INSERT OR REPLACE INTO events (${fields.join(",")}) VALUES (${placeholders})`,
        values
      );
    } else {
      return new Promise((resolve, reject) => {
        if (!this.indexedDb) return reject(new Error("Database not initialized"));
        const tx = this.indexedDb.transaction("events", "readwrite");
        const store = tx.objectStore("events");
        const request = store.put(event);

        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      });
    }
  }

  async deleteEvent(eventoId: string): Promise<void> {
    if (this.isNative && this.db) {
      await this.db.run("DELETE FROM events WHERE evento_id = ?", [eventoId]);
    } else {
      return new Promise((resolve, reject) => {
        if (!this.indexedDb) return reject(new Error("Database not initialized"));
        const tx = this.indexedDb.transaction("events", "readwrite");
        const store = tx.objectStore("events");
        const request = store.delete(eventoId);

        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      });
    }
  }

  // --- SETTINGS OPERATIONS ---

  async getSetting(key: string): Promise<string | null> {
    if (this.isNative && this.db) {
      const res = await this.db.query("SELECT value FROM settings WHERE key = ?", [key]);
      if (res.values && res.values.length > 0) {
        return res.values[0].value;
      }
      return null;
    } else {
      return new Promise((resolve, reject) => {
        if (!this.indexedDb) return resolve(null);
        const tx = this.indexedDb.transaction("settings", "readonly");
        const store = tx.objectStore("settings");
        const request = store.get(key);

        request.onsuccess = () => {
          resolve(request.result ? request.result.value : null);
        };
        request.onerror = () => reject(request.error);
      });
    }
  }

  async saveSetting(key: string, value: string): Promise<void> {
    if (this.isNative && this.db) {
      await this.db.run(
        "INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)",
        [key, value]
      );
    } else {
      return new Promise((resolve, reject) => {
        if (!this.indexedDb) return reject(new Error("Database not initialized"));
        const tx = this.indexedDb.transaction("settings", "readwrite");
        const store = tx.objectStore("settings");
        const request = store.put({ key, value });

        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      });
    }
  }
}

export const dbService = new HybridDatabase();
