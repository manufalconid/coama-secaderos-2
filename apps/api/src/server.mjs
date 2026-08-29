import http from "node:http";
import { InMemorySyncStore } from "./store.mjs";
import { PgSyncStore } from "./postgres-store.mjs";
import { exportParametros, importParametros } from "./parametros-handler.mjs";
import { syncRawEventToSheets, syncProcessedEventToSheets, exportAllToSheets } from "./sheets-sync.mjs";


const host = process.env.API_HOST ?? "0.0.0.0";
const port = Number(process.env.API_PORT ?? 8080);
let storeMode = process.env.API_STORE ?? "memory";
let store;

if (storeMode === "postgres") {
  try {
    const pgStore = new PgSyncStore();
    // Probamos la conexión
    await pgStore.pool.query("SELECT 1");
    store = pgStore;
    console.log("[ OK ] Conectado a la base de datos PostgreSQL.");
  } catch (err) {
    console.warn(`[ ADVERTENCIA ] No se pudo conectar a PostgreSQL (${err.message}). Cayendo en modo en memoria (storeMode = memory)...`);
    storeMode = "memory";
    store = new InMemorySyncStore(undefined, { seedProposals: true, persist: true });
  }
} else {
  store = new InMemorySyncStore(undefined, { seedProposals: true, persist: true });
}
const tabletConnections = new Map(); // tablet_id -> { lastSeen: ISOString, ip: string }

const telegramBotToken = process.env.TELEGRAM_BOT_TOKEN;
const telegramChatId = process.env.TELEGRAM_CHAT_ID;
const portalUrl = process.env.SUPERVISOR_PORTAL_URL ?? "http://127.0.0.1:5173";

async function notifyTelegram(text) {
  if (!telegramBotToken || !telegramChatId) {
    console.log("Notificación de Telegram omitida (no configurado).");
    return;
  }
  try {
    const url = `https://api.telegram.org/bot${telegramBotToken}/sendMessage`;
    const res = await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        chat_id: telegramChatId,
        text,
        parse_mode: "HTML"
      })
    });
    if (!res.ok) {
      const errText = await res.text();
      console.error("Error al enviar notificación a Telegram:", errText);
    }
  } catch (err) {
    console.error("Error en notifyTelegram:", err);
  }
}

const server = http.createServer(async (req, res) => {
  // Log request
  console.log(`[REQ] ${req.method} ${req.url} from ${req.socket.remoteAddress}`);

  // CORS Headers
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, PATCH, DELETE, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    res.writeHead(204);
    res.end();
    return;
  }

  try {
    const url = new URL(req.url ?? "/", `http://${req.headers.host}`);

    if (req.method === "GET" && url.pathname === "/health") {
      const clientIp = (req.headers["x-forwarded-for"] || req.headers["x-real-ip"] || req.socket.remoteAddress || "")
        .split(",")
        .shift()
        .trim()
        .replace(/^::ffff:/, "")
        .replace(/^::1$/, "127.0.0.1");

      const tabletIdParam = url.searchParams.get("tablet_id");
      let matchedTabletId = tabletIdParam;

      if (!matchedTabletId) {
        const data = await store.getMasterData();
        const matchedTablet = data.tablets?.find(t => t.ip_tablet === clientIp)
          || (clientIp === "127.0.0.1" ? data.tablets?.find(t => t.tablet_id === "tab-sec-omeco") : null);
        if (matchedTablet) {
          matchedTabletId = matchedTablet.tablet_id;
        }
      }

      if (matchedTabletId) {
        tabletConnections.set(matchedTabletId, {
          lastSeen: new Date().toISOString(),
          ip: clientIp
        });
      }

      return sendJson(res, 200, {
        ok: true,
        service: "coama-api",
        mode: storeMode,
        time: new Date().toISOString()
      });
    }

    if (req.method === "GET" && url.pathname === "/master-data") {
      const clientIp = (req.headers["x-forwarded-for"] || req.headers["x-real-ip"] || req.socket.remoteAddress || "")
        .split(",")
        .shift()
        .trim()
        .replace(/^::ffff:/, "")
        .replace(/^::1$/, "127.0.0.1");

      const secaderoParam = url.searchParams.get("secadero_id");
      const data = await store.getMasterData();
      const matchedTablet = data.tablets?.find(t => t.ip_tablet === clientIp)
        || (clientIp === "127.0.0.1" ? data.tablets?.find(t => t.tablet_id === "tab-sec-omeco") : null);
      
      const fallbackTablet = secaderoParam ? data.tablets?.find(t => t.secadero_id === secaderoParam) : null;
      const activeTablet = matchedTablet || fallbackTablet;

      if (activeTablet) {
        tabletConnections.set(activeTablet.tablet_id, {
          lastSeen: new Date().toISOString(),
          ip: clientIp
        });
      }

      return sendJson(res, 200, {
        ...data,
        detectedIp: clientIp,
        assignedSecaderoId: matchedTablet ? matchedTablet.secadero_id : (secaderoParam || null),
        assignedTabletId: activeTablet ? activeTablet.tablet_id : null
      });
    }

    if (req.method === "POST" && url.pathname === "/admin/test-telegram") {
      const message = `🔴 <b>Notificación de Prueba de Telegram</b>\n` +
        `El Bot de COAMA Secaderos ha sido configurado correctamente.\n\n` +
        `🔗 <a href="${portalUrl}">Ir al Portal del Supervisor</a>`;
      await notifyTelegram(message);
      return sendJson(res, 200, { success: true });
    }

    if (url.pathname.startsWith("/admin/")) {
      return handleAdminRoute(req, res, url);
    }

    if (req.method === "POST" && url.pathname === "/sync/events") {
      const clientIp = (req.headers["x-forwarded-for"] || req.headers["x-real-ip"] || req.socket.remoteAddress || "")
        .split(",")
        .shift()
        .trim()
        .replace(/^::ffff:/, "")
        .replace(/^::1$/, "127.0.0.1");

      const masterData = await store.getMasterData();
      const matchedTablet = masterData.tablets?.find(t => t.ip_tablet === clientIp)
        || (clientIp === "127.0.0.1" ? masterData.tablets?.find(t => t.tablet_id === "tab-sec-omeco") : null);

      const body = await readJson(req);

      const connTabletId = matchedTablet ? matchedTablet.tablet_id : (body.events?.[0]?.tablet_id || null);
      if (connTabletId) {
        tabletConnections.set(connTabletId, {
          lastSeen: new Date().toISOString(),
          ip: clientIp
        });
      }

      if (Array.isArray(body.events)) {
        for (const ev of body.events) {
          if (matchedTablet) {
            ev.tablet_id = matchedTablet.tablet_id;
            ev.secadero_id = matchedTablet.secadero_id;
          } else {
            if (!ev.secadero_id) {
              ev.secadero_id = "sec-omeco";
            }
            if (!ev.tablet_id) {
              const matchedBySecadero = masterData.tablets?.find(t => t.secadero_id === ev.secadero_id);
              ev.tablet_id = matchedBySecadero ? matchedBySecadero.tablet_id : `TAB-${ev.secadero_id.toUpperCase()}`;
            }
          }
        }
      }

      const syncResult = await store.syncBatch(body.events);

      if (syncResult.rejected && syncResult.rejected.length > 0) {
        console.warn(`[ SYNC REJECTED ] ${syncResult.rejected.length} eventos fueron rechazados:`, JSON.stringify(syncResult.rejected));
      }

      if (syncResult.accepted && syncResult.accepted.length > 0) {
        for (const item of syncResult.accepted) {
          const fullEvent = await store.getEvento(item.evento_id);
            if (fullEvent) {
              if (fullEvent.inicio_evento_id) {
                console.log(`[ SYNC ] Ignorando evento de fin redundante (${fullEvent.evento_id}) para alertas y Google Sheets.`);
                continue;
              }
              const masterData = await store.getMasterData();
              const secadero = masterData.secaderos.find(s => s.secadero_id === fullEvent.secadero_id);
              const secaderoName = secadero ? secadero.nombre : fullEvent.secadero_id;
              const cleanLinea = (fullEvent.linea || secaderoName || "").toUpperCase().replace(/^SECADERO\s+/i, "");

            if (item.status === "inserted") {
              // Si es nuevo, siempre tiene al menos el inicio ("abierto")
              syncRawEventToSheets(fullEvent, "abierto").catch(err => console.error("Error sincronizando evento crudo (abierto) a Google Sheets:", err));

              if (fullEvent.estado_evento === "abierto") {
                const message = `🚨Detención ${cleanLinea}`;
                notifyTelegram(message).catch(err => console.error("Error enviando notificacion a Telegram en segundo plano:", err));
              } else if (fullEvent.estado_evento === "cerrado") {
                // Si ya llega directamente cerrado, enviamos fin a crudos y a procesados
                syncRawEventToSheets(fullEvent, "cerrado").catch(err => console.error("Error sincronizando evento crudo (cerrado) a Google Sheets:", err));
                syncProcessedEventToSheets(fullEvent).catch(err => console.error("Error sincronizando evento procesado a Google Sheets:", err));

                const minutes = Math.round((fullEvent.duracion_segundos || 0) / 60);
                const tMuerto = fullEvent.tiempo_muerto || "Sin motivo";
                const cat = fullEvent.categoria_tm || "Sin categoría";
                const obs = fullEvent.observacion || "Sin observaciones";
                const ubi = fullEvent.ubicacion || "Sin ubicación";

                const message = `✅Fin de detención ${cleanLinea}. ${minutes} minutos perdidos por ${tMuerto}, ${cat}, ${obs}, ${ubi}`;
                notifyTelegram(message).catch(err => console.error("Error enviando notificacion a Telegram en segundo plano:", err));
              }
            } else if (item.status === "updated") {
              // Sincronizar siempre los cambios a Google Sheets (crudos y procesados)
              if (fullEvent.estado_evento === "abierto") {
                syncRawEventToSheets(fullEvent, "abierto").catch(err => console.error("Error sincronizando evento crudo (abierto) a Google Sheets:", err));
              } else if (fullEvent.estado_evento === "cerrado") {
                syncRawEventToSheets(fullEvent, "cerrado").catch(err => console.error("Error sincronizando evento crudo (cerrado) a Google Sheets:", err));
                syncProcessedEventToSheets(fullEvent).catch(err => console.error("Error sincronizando evento procesado a Google Sheets:", err));

                // Solo enviar Telegram si no estaba cerrado previamente
                if (!item.wasClosed) {
                  const minutes = Math.round((fullEvent.duracion_segundos || 0) / 60);
                  const tMuerto = fullEvent.tiempo_muerto || "Sin motivo";
                  const cat = fullEvent.categoria_tm || "Sin categoría";
                  const obs = fullEvent.observacion || "Sin observaciones";
                  const ubi = fullEvent.ubicacion || "Sin ubicación";

                  const message = `✅Fin de detención ${cleanLinea}. ${minutes} minutos perdidos por ${tMuerto}, ${cat}, ${obs}, ${ubi}`;
                  notifyTelegram(message).catch(err => console.error("Error enviando notificacion a Telegram en segundo plano:", err));
                }
              }
            }
          }
        }
      }

      return sendJson(res, 200, syncResult);
    }

    if (req.method === "GET" && url.pathname === "/debug/snapshot") {
      return sendJson(res, 200, await store.snapshot());
    }

    return sendJson(res, 404, { error: "Ruta no encontrada." });
  } catch (error) {
    return sendJson(res, 400, { error: error.message });
  }
});

process.on("uncaughtException", (err) => {
  console.error("[ CRITICAL API ERROR ] Exception capturada para evitar caída del servidor:", err);
});

process.on("unhandledRejection", (reason) => {
  console.error("[ CRITICAL API ERROR ] Rejection no manejada capturada:", reason);
});

server.on("error", (err) => {
  console.error("[ SERVER ERROR ]", err);
});

server.on("clientError", (err, socket) => {
  if (err.code === "ECONNRESET" || !socket.writable) {
    return;
  }
  try {
    socket.end("HTTP/1.1 400 Bad Request\r\n\r\n");
  } catch {
    // Ignore socket write errors on dead connection
  }
});

server.listen(port, host, () => {
  console.log(`COAMA API escuchando en http://${host}:${port}`);
});

function createStore(mode) {
  if (mode === "postgres") {
    return new PgSyncStore();
  }

  if (mode === "memory") {
    return new InMemorySyncStore(undefined, { seedProposals: true, persist: true });
  }

  throw new Error(`API_STORE invalido: ${mode}`);
}

async function handleAdminRoute(req, res, url) {
  const parts = url.pathname.split("/").filter(Boolean);
  const resource = parts[1];
  const id = parts[2];
  const action = parts[3];



  if (resource === "razones") {
    if (req.method === "GET" && !id) {
      return sendJson(res, 200, await store.listRazones());
    }
    if (req.method === "POST" && !id) {
      return sendJson(res, 201, await store.saveRazon(await readJson(req)));
    }
    if (req.method === "PATCH" && id) {
      return sendJson(res, 200, await store.saveRazon(await readJson(req), id));
    }
    if (req.method === "DELETE" && id) {
      return sendJson(res, 200, await store.deleteRazon(id));
    }
  }

  if (resource === "origenes") {
    if (req.method === "GET" && !id) {
      return sendJson(res, 200, await store.listOrigenes());
    }
    if (req.method === "POST" && !id) {
      return sendJson(res, 201, await store.saveOrigen(await readJson(req)));
    }
    if (req.method === "PATCH" && id) {
      return sendJson(res, 200, await store.saveOrigen(await readJson(req), id));
    }
    if (req.method === "DELETE" && id) {
      return sendJson(res, 200, await store.deleteOrigen(id));
    }
  }

  if (resource === "turnos") {
    if (req.method === "GET" && !id) {
      return sendJson(res, 200, await store.listTurnos());
    }
    if (req.method === "POST" && !id) {
      return sendJson(res, 201, await store.saveTurno(await readJson(req)));
    }
    if (req.method === "PATCH" && id) {
      return sendJson(res, 200, await store.saveTurno(await readJson(req), id));
    }
    if (req.method === "DELETE" && id) {
      return sendJson(res, 200, await store.deleteTurno(id));
    }
  }
 
  if (resource === "propuestas") {
    if (req.method === "GET" && !id) {
      return sendJson(res, 200, await store.listPropuestas({ estado: url.searchParams.get("estado") }));
    }
    if (req.method === "PATCH" && id && action === "revision") {
      const decodedId = decodeURIComponent(id);
      return sendJson(res, 200, await store.reviewPropuesta(decodedId, await readJson(req)));
    }
  }

  if (resource === "tablets" && id === "status") {
    if (req.method === "GET") {
      const data = await store.getMasterData();
      const statusList = (data.tablets || []).map(t => {
        const conn = tabletConnections.get(t.tablet_id);
        return {
          ...t,
          lastSeen: conn ? conn.lastSeen : null,
          lastIp: conn ? conn.ip : null,
          conectada: conn ? (Date.now() - Date.parse(conn.lastSeen) < 60000) : false
        };
      });
      return sendJson(res, 200, statusList);
    }
  }

  if (resource === "eventos") {
    if (req.method === "GET" && !id) {
      return sendJson(res, 200, await store.listEventos());
    }
    if (req.method === "PATCH" && id) {
      const updatedEvent = await store.saveEvento(id, await readJson(req));
      if (updatedEvent) {
        if (updatedEvent.estado_evento === "abierto") {
          syncRawEventToSheets(updatedEvent, "abierto").catch(err => console.error("Error al sincronizar evento editado (abierto) a Google Sheets:", err));
        } else if (updatedEvent.estado_evento === "cerrado") {
          syncRawEventToSheets(updatedEvent, "cerrado").catch(err => console.error("Error al sincronizar evento editado (cerrado) a Google Sheets:", err));
          syncProcessedEventToSheets(updatedEvent).catch(err => console.error("Error al sincronizar evento editado (procesado) a Google Sheets:", err));
        }
      }
      return sendJson(res, 200, updatedEvent);
    }
  }

  if (resource === "parametros") {
    if (req.method === "GET" && id === "export") {
      try {
        const xlsxBuffer = await exportParametros(store);
        res.writeHead(200, {
          "content-type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          "content-disposition": "attachment; filename=parametrizacion.xlsx",
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type"
        });
        return res.end(xlsxBuffer);
      } catch (err) {
        return sendJson(res, 500, { error: err.message });
      }
    }
    if (req.method === "POST" && id === "import") {
      try {
        const bodyBuffer = await readBinaryBody(req);
        const importResult = await importParametros(store, bodyBuffer);
        return sendJson(res, 200, importResult);
      } catch (err) {
        return sendJson(res, 400, { error: err.message });
      }
    }
  }

  if (resource === "sheets" && id === "sync") {
    if (req.method === "POST") {
      try {
        const events = await store.listEventos();
        const masterData = await store.getMasterData();
        await exportAllToSheets(events, masterData);
        return sendJson(res, 200, { success: true, message: "Sincronización completa con Google Sheets realizada con éxito." });
      } catch (err) {
        return sendJson(res, 500, { error: err.message });
      }
    }
  }

  return sendJson(res, 404, { error: "Ruta admin no encontrada." });
}

function sendJson(res, status, payload) {
  const body = JSON.stringify(payload, null, 2);
  res.writeHead(status, {
    "content-type": "application/json; charset=utf-8",
    "content-length": Buffer.byteLength(body),
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, PATCH, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type"
  });
  res.end(body);
}

function readJson(req) {
  return new Promise((resolve, reject) => {
    let raw = "";
    req.setEncoding("utf8");
    req.on("data", chunk => {
      raw += chunk;
      if (raw.length > 1_000_000) {
        reject(new Error("Payload demasiado grande."));
        req.destroy();
      }
    });
    req.on("end", () => {
      try {
        resolve(raw ? JSON.parse(raw) : {});
      } catch {
        reject(new Error("JSON invalido."));
      }
    });
    req.on("error", reject);
  });
}

function readBinaryBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on("data", chunk => {
      chunks.push(chunk);
    });
    req.on("end", () => {
      resolve(Buffer.concat(chunks));
    });
    req.on("error", reject);
  });
}
