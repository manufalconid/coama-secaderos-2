import React, { useEffect, useState, useMemo } from "react";
import {
  Wifi,
  WifiOff,
  Settings,
  X,
  Save
} from "lucide-react";
import { dbService, type StoppageEvent } from "./db";

// Import modular components
import MachineConfirmStage from "./components/Stages/MachineConfirmStage";
import MainStage from "./components/Stages/MainStage";
import OrigenStage from "./components/Stages/OrigenStage";
import RazonStage from "./components/Stages/RazonStage";
import SuggestRazonStage from "./components/Stages/SuggestRazonStage";
import ObservacionStage from "./components/Stages/ObservacionStage";
import UbicacionSecaderoStage from "./components/Stages/UbicacionSecaderoStage";
import ConfirmationStage from "./components/Stages/ConfirmationStage";
import HistoryTab from "./components/HistoryTab";
import TouchButton from "./components/TouchButton";

// Standard UUID helper
function generateUUID() {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function (c) {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

// Fallback Master Data
const FALLBACK_MASTER_DATA = {
  secaderos: [
    { secadero_id: "sec-omeco", nombre: "OMECO" },
    { secadero_id: "sec-benecke", nombre: "BENECKE" },
    { secadero_id: "sec-raute", nombre: "RAUTE" }
  ],
  origenes: [
    { origen_id: "ori-electrico", nombre: "ELECTRICO" },
    { origen_id: "ori-externo", nombre: "EXTERNO" },
    { origen_id: "ori-logistica", nombre: "LOGISTICA" },
    { origen_id: "ori-mecanico", nombre: "MECANICO" },
    { origen_id: "ori-neumatico", nombre: "NEUMATICO" },
    { origen_id: "ori-operativo", nombre: "OPERATIVO" },
    { origen_id: "ori-proceso", nombre: "PROCESO" }
  ],
  razones: [
    { razon_id: "raz-atascamiento", origen_ids: ["ori-operativo", "ori-mecanico"], codigo: "P032", nombre: "ATASCAMIENTO", activa: true, observacion_obligatoria: true, ubicacion_obligatoria: true, observaciones_predefinidas: "Tranque en entrada, Tranque en salida, Rotura de tirante, Acumulación de viruta, Falla mecánica", mostrar_perfil: true, mostrar_perfil_completo: true, mostrar_perfil_niveles: false }
  ],
  productos: ["Deck / 1 x 4 x 10", "Deck / 1 x 6 x 10", "Cepillado / 1.5 x 3.5 x 10", "Viga / 2 x 4 x 12"],
  operarios: ["Gonzalez Nelson", "Mallorquin Fabian", "Mieres Hugo", "Villalba Andres"]
};

type Stage =
  | "MACHINE_CONFIRM"
  | "MAIN"
  | "STAGE_ORIGEN"
  | "STAGE_RAZON"
  | "STAGE_SUGGEST_RAZON"
  | "STAGE_OBSERVACION"
  | "STAGE_UBICACION"
  | "STAGE_CONFIRMATION";

function getTimeoutSignal(ms: number) {
  if (typeof AbortSignal.timeout === "function") {
    return AbortSignal.timeout(ms);
  }
  const controller = new AbortController();
  setTimeout(() => controller.abort(), ms);
  return controller.signal;
}

export default function App() {
  const [dbReady, setDbReady] = useState(false);
  const [settings, setSettings] = useState(() => {
    const saved = localStorage.getItem("tablet_settings");
    return saved
      ? JSON.parse(saved)
      : { supervisorUrl: "http://192.168.10.15:8080", secaderoId: "", tabletId: "" };
  });

  const [masterData, setMasterData] = useState<any>(FALLBACK_MASTER_DATA);
  const [machineState, setMachineState] = useState<"produciendo" | "parado">("produciendo");
  const [activeEvent, setActiveEvent] = useState<StoppageEvent | null>(null);
  const [eventHistory, setEventHistory] = useState<StoppageEvent[]>([]);
  const [pendingEvents, setPendingEvents] = useState<StoppageEvent[]>([]);
  const [currentStage, setCurrentStage] = useState<Stage>("MAIN");
  const [activeTab, setActiveTab] = useState<"operar" | "historial">("operar");

  // UI States
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<StoppageEvent | null>(null);
  const [syncStatus, setSyncStatus] = useState<"online" | "offline">("offline");
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState<string>(() => {
    return localStorage.getItem("last_sync_time") || "Nunca";
  });

  const updateLastSync = () => {
    const timeStr = new Date().toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
    setLastSyncTime(timeStr);
    localStorage.setItem("last_sync_time", timeStr);
  };
  
  const [elapsedTime, setElapsedTime] = useState(0);

  // Form states during declaration
  const [formOrigenId, setFormOrigenId] = useState("");
  const [formRazonId, setFormRazonId] = useState("");
  const [suggestedReasonName, setSuggestedReasonName] = useState("");
  const [formObservacion, setFormObservacion] = useState("");
  const [formUbicacion, setFormUbicacion] = useState("");

  // Edit Event state fields
  const [editDateInicio, setEditDateInicio] = useState("");
  const [editTimeInicio, setEditTimeInicio] = useState("");
  const [editDateFin, setEditDateFin] = useState("");
  const [editTimeFin, setEditTimeFin] = useState("");
  const [editOrigenId, setEditOrigenId] = useState("");
  const [editRazonId, setEditRazonId] = useState("");
  const [editObservacion, setEditObservacion] = useState("");
  const [editUbicacion, setEditUbicacion] = useState("");

  // Settings temporary state
  const [inputUrl, setInputUrl] = useState(settings.supervisorUrl);
  const [inputSecadero, setInputSecadero] = useState(settings.secaderoId);

  // Scanner states
  const [isScanning, setIsScanning] = useState(false);
  const [scanMessage, setScanMessage] = useState("");

  // Sync refs to local storage
  useEffect(() => {
    localStorage.setItem("tablet_settings", JSON.stringify(settings));
  }, [settings]);

  useEffect(() => {
    localStorage.setItem("machine_state", machineState);
  }, [machineState]);

  // Load from hybrid DB on mount
  useEffect(() => {
    async function initAndLoad() {
      await dbService.init();

      const cachedMaster = localStorage.getItem("cached_master_data");
      if (cachedMaster) {
        try {
          const parsed = JSON.parse(cachedMaster);
          const normalized = {
            secaderos: Array.isArray(parsed?.secaderos) ? parsed.secaderos : FALLBACK_MASTER_DATA.secaderos,
            origenes: Array.isArray(parsed?.origenes) ? parsed.origenes : FALLBACK_MASTER_DATA.origenes,
            razones: Array.isArray(parsed?.razones) ? parsed.razones : FALLBACK_MASTER_DATA.razones,
            productos: Array.isArray(parsed?.productos) ? parsed.productos : (FALLBACK_MASTER_DATA.productos || []),
            operarios: Array.isArray(parsed?.operarios) ? parsed.operarios : (FALLBACK_MASTER_DATA.operarios || []),
            turnos: Array.isArray(parsed?.turnos) ? parsed.turnos : [],
            detectedIp: parsed?.detectedIp || null
          };
          setMasterData(normalized);
        } catch (e) {
          console.error("Error parsing cached master data", e);
        }
      }

      const allEvents = await dbService.getEvents();
      setEventHistory(allEvents.sort((a, b) => Date.parse(b.fecha_hora_inicio) - Date.parse(a.fecha_hora_inicio)));

      const pending = allEvents.filter(e => !e.sincronizado);
      setPendingEvents(pending);

      const openEvent = allEvents.find(e => e.estado_evento === "abierto");
      if (openEvent) {
        setActiveEvent(openEvent);
        setMachineState("parado");
      } else {
        setActiveEvent(null);
        setMachineState("produciendo");
      }

      const savedSettings = localStorage.getItem("tablet_settings");
      if (savedSettings) {
        const parsed = JSON.parse(savedSettings);
        if (!parsed.secaderoId) {
          setCurrentStage("MACHINE_CONFIRM");
        } else {
          setCurrentStage("MAIN");
        }
      } else {
        setCurrentStage("MACHINE_CONFIRM");
      }

      setDbReady(true);
    }
    initAndLoad();
  }, []);

  // Live stopwatch counter
  useEffect(() => {
    let interval: any = null;
    if (machineState === "parado" && activeEvent) {
      const start = new Date(activeEvent.fecha_hora_inicio).getTime();
      const update = () => {
        const now = Date.now();
        setElapsedTime(Math.max(0, Math.round((now - start) / 1000)));
      };
      update();
      interval = setInterval(update, 1000);
    } else {
      setElapsedTime(0);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [machineState, activeEvent]);

  async function fetchMasterData(urlToUse = settings.supervisorUrl, secaderoIdToUse = settings.secaderoId) {
    try {
      let res: Response | undefined;
      const queryParams = secaderoIdToUse ? `?secadero_id=${encodeURIComponent(secaderoIdToUse)}` : "";
      const candidateUrls = [
        urlToUse ? `${urlToUse.replace(/\/+$/, "")}/master-data${queryParams}` : null,
        `/api/master-data${queryParams}`,
        `http://127.0.0.1:8080/master-data${queryParams}`
      ].filter(Boolean) as string[];

      for (const targetUrl of candidateUrls) {
        try {
          const attempt = await fetch(targetUrl, { signal: getTimeoutSignal(2000) });
          if (attempt.ok) {
            res = attempt;
            break;
          }
        } catch {
          // Try next target URL
        }
      }

      if (res && res.ok) {
        const payload = await res.json();
        const normalized = {
          secaderos: Array.isArray(payload?.secaderos) ? payload.secaderos : FALLBACK_MASTER_DATA.secaderos,
          origenes: Array.isArray(payload?.origenes) ? payload.origenes : FALLBACK_MASTER_DATA.origenes,
          razones: Array.isArray(payload?.razones) ? payload.razones : FALLBACK_MASTER_DATA.razones,
          productos: Array.isArray(payload?.productos) ? payload.productos : (FALLBACK_MASTER_DATA.productos || []),
          operarios: Array.isArray(payload?.operarios) ? payload.operarios : (FALLBACK_MASTER_DATA.operarios || []),
          turnos: Array.isArray(payload?.turnos) ? payload.turnos : [],
          detectedIp: payload?.detectedIp || null
        };
        setMasterData(normalized);
        localStorage.setItem("cached_master_data", JSON.stringify(normalized));

        if (payload.assignedSecaderoId || payload.assignedTabletId) {
          setSettings((prev: any) => {
            const next = {
              ...prev,
              secaderoId: payload.assignedSecaderoId || prev.secaderoId,
              tabletId: payload.assignedTabletId || prev.tabletId
            };
            localStorage.setItem("tablet_settings", JSON.stringify(next));
            return next;
          });
        }

        setSyncStatus("online");
        updateLastSync();
        return true;
      } else {
        setSyncStatus("offline");
        return false;
      }
    } catch {
      setSyncStatus("offline");
      return false;
    }
  }

  async function handleAutoDiscover() {
    setIsScanning(true);
    setScanMessage("Escaneando subredes locales...");

    const subnets = ["192.168.10", "192.168.1", "192.168.0"];
    try {
      const parts = window.location.hostname.split(".");
      if (parts.length === 4) {
        const currentSubnet = parts.slice(0, 3).join(".");
        if (!subnets.includes(currentSubnet)) {
          subnets.push(currentSubnet);
        }
      }
    } catch {}

    const port = "8080";
    let foundUrl = "";

    for (const subnet of subnets) {
      if (foundUrl) break;
      setScanMessage(`Escaneando subred ${subnet}.x...`);

      const batchSize = 50;
      for (let i = 1; i <= 255; i += batchSize) {
        if (foundUrl) break;

        const promises = [];
        const abortController = new AbortController();

        for (let j = i; j < i + batchSize && j <= 255; j++) {
          const ip = `${subnet}.${j}`;
          const url = `http://${ip}:${port}`;
          
          const p = fetch(`${url}/health`, {
            signal: abortController.signal,
            headers: { Accept: "application/json" }
          })
            .then(async (res) => {
              if (res.ok) {
                const data = await res.json();
                if (data && data.service === "coama-api") {
                  foundUrl = url;
                  abortController.abort();
                }
              }
            })
            .catch(() => {});
          
          promises.push(p);
        }

        await Promise.race([
          Promise.all(promises),
          new Promise(resolve => setTimeout(resolve, 1200))
        ]);
        
        abortController.abort();
      }
    }

    if (foundUrl) {
      setScanMessage(`¡Servidor encontrado en ${foundUrl}!`);
      setInputUrl(foundUrl);
      fetchMasterData(foundUrl);
    } else {
      setScanMessage("No se detectó el servidor. Por favor, ingrésalo manualmente.");
    }
    setIsScanning(false);
  }

  async function syncPendingEvents(eventsToSync = pendingEvents, urlToUse = settings.supervisorUrl) {
    if (isSyncing) return;
    if (eventsToSync.length === 0) {
      try {
        let res: Response | undefined;
        const queryParams = settings.tabletId ? `?tablet_id=${encodeURIComponent(settings.tabletId)}` : "";
        const candidateHealthUrls = [
          urlToUse ? `${urlToUse.replace(/\/+$/, "")}/health${queryParams}` : null,
          `/api/health${queryParams}`,
          `http://127.0.0.1:8080/health${queryParams}`
        ].filter(Boolean) as string[];

        for (const targetUrl of candidateHealthUrls) {
          try {
            const attempt = await fetch(targetUrl, { signal: getTimeoutSignal(2000) });
            if (attempt.ok) {
              res = attempt;
              break;
            }
          } catch {
            // Try next target URL
          }
        }
        if (res && res.ok) {
          setSyncStatus("online");
          updateLastSync();
        } else {
          setSyncStatus("offline");
        }
      } catch {
        setSyncStatus("offline");
      }
      return;
    }

    const eventsPayload = eventsToSync.map(e => {
      const origenes = [];
      if (e.origen_id) {
        origenes.push({ origen_id: e.origen_id });
      }
      
      let propuesta_manual = null;
      if (e.observacion && e.observacion.startsWith("[Sugerido] ")) {
        const match = e.observacion.match(/^\[Sugerido\] (.*?)\.(?:\s*(.*))?$/);
        if (match) {
          propuesta_manual = {
            tipo: "razon",
            texto: match[1].trim(),
            comentario: match[2] ? match[2].trim() : ""
          };
        }
      }

      return {
        ...e,
        origenes,
        propuesta_manual
      };
    });

    setIsSyncing(true);
    try {
      let res: Response | undefined;
      const candidateSyncUrls = [
        urlToUse ? `${urlToUse.replace(/\/+$/, "")}/sync/events` : null,
        `/api/sync/events`,
        `http://127.0.0.1:8080/sync/events`
      ].filter(Boolean) as string[];

      for (const targetUrl of candidateSyncUrls) {
        try {
          const attempt = await fetch(targetUrl, {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ events: eventsPayload }),
            signal: getTimeoutSignal(3000)
          });
          if (attempt.ok) {
            res = attempt;
            break;
          }
        } catch {
          // Try next target URL
        }
      }

      if (res && res.ok) {
        const syncResult = await res.json();
        const acceptedIds = new Set(syncResult.accepted.map((item: any) => item.evento_id));

        for (const e of eventsToSync) {
          if (acceptedIds.has(e.evento_id)) {
            await dbService.saveEvent({ ...e, sincronizado: true });
          }
        }

        setPendingEvents(prev => prev.filter(e => !acceptedIds.has(e.evento_id)));
        setEventHistory(prev =>
          prev.map(e => (acceptedIds.has(e.evento_id) ? { ...e, sincronizado: true } : e))
        );
        setSyncStatus("online");
        updateLastSync();
      } else {
        setSyncStatus("offline");
      }
    } catch {
      setSyncStatus("offline");
    } finally {
      setIsSyncing(false);
    }
  }

  async function forceSync() {
    await fetchMasterData();
    await syncPendingEvents();
  }

  useEffect(() => {
    fetchMasterData();
    syncPendingEvents();

    const interval = setInterval(() => {
      fetchMasterData();
      syncPendingEvents();
    }, 10000);

    return () => clearInterval(interval);
  }, [settings.supervisorUrl, settings.secaderoId, pendingEvents.length]);

  const assignedSecaderoName = useMemo(() => {
    const sec = (masterData?.secaderos || []).find((s: any) => s.secadero_id === settings.secaderoId);
    return sec ? sec.nombre : settings.secaderoId || "No Asignado";
  }, [masterData?.secaderos, settings.secaderoId]);

  const filteredReasons = useMemo(() => {
    return (masterData?.razones || []).filter((r: any) =>
      r.activa && (Array.isArray(r.origen_ids) && r.origen_ids.includes(formOrigenId))
    );
  }, [masterData?.razones, formOrigenId]);

  const selectedReasonObj = useMemo(() => {
    if (!formRazonId) return null;
    return (masterData?.razones || []).find((r: any) => r.razon_id === formRazonId) || null;
  }, [masterData?.razones, formRazonId]);

  const parsedPredefinedObservations = useMemo(() => {
    if (!selectedReasonObj || !selectedReasonObj.observaciones_predefinidas) return [];
    return selectedReasonObj.observaciones_predefinidas
      .split(",")
      .map((s: string) => s.trim())
      .filter((s: string) => s.length > 0);
  }, [selectedReasonObj]);

  function handleSelectMachine(id: string) {
    setSettings((prev: any) => ({ ...prev, secaderoId: id }));
    setInputSecadero(id);
    setCurrentStage("MAIN");
  }

  async function handleStartStoppage() {
    const timestamp = new Date().toISOString();
    const localD = new Date(timestamp);
    const dateStr = localD.toLocaleDateString("es-AR", { timeZone: "America/Argentina/Buenos_Aires" });
    const timeStr = localD.toLocaleTimeString("es-AR", { timeZone: "America/Argentina/Buenos_Aires", hour12: false });
    const [d, m, y] = dateStr.split("/");
    const fecha = `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
    const hora = timeStr;

    let activeTurno: any = null;
    if (Array.isArray(masterData.turnos) && masterData.turnos.length > 0) {
      for (const t of masterData.turnos) {
        const start = t.hora_inicio;
        const end = t.hora_fin;
        if (start < end) {
          if (timeStr >= start && timeStr < end) {
            activeTurno = t;
            break;
          }
        } else {
          if (timeStr >= start || timeStr < end) {
            activeTurno = t;
            break;
          }
        }
      }
    }

    const secObj = masterData.secaderos?.find((s: any) => s.secadero_id === settings.secaderoId);
    let rawLinea = secObj ? secObj.nombre : (settings.secaderoId || "OMECO");
    const normalizedLinea = rawLinea.replace(/^sec-/i, "").replace(/^Secadero\s+/i, "").toUpperCase().trim();
    const effectiveSecaderoId = settings.secaderoId || "sec-omeco";
    const effectiveTabletId = settings.tabletId || `tab-${effectiveSecaderoId}`;

    const newEvent: StoppageEvent = {
      evento_id: generateUUID(),
      tablet_id: effectiveTabletId,
      secadero_id: effectiveSecaderoId,
      fecha_hora_inicio: timestamp,
      fecha_hora_fin: null,
      duracion_segundos: null,
      estado_evento: "abierto",
      tipo_registro: "manual",
      origen_id: null,
      razon_id: null,
      observacion: "",
      version: 1,
      sincronizado: false,
      timestamp_registro: timestamp,
      fecha_registro: fecha,
      hora_registro: hora,
      hora_desde: timestamp,
      linea: normalizedLinea,
      hora_inicio_turno: activeTurno ? activeTurno.hora_inicio : null,
      hora_fin_turno: activeTurno ? activeTurno.hora_fin : null,
      tipo_turno: activeTurno ? activeTurno.nombre : null,
      hora_inicio_descanso: activeTurno && activeTurno.turno_id === "tur-dia" ? "12:00:00" : (activeTurno && activeTurno.turno_id === "tur-noche" ? "00:00:00" : null),
      hora_fin_descanso: activeTurno && activeTurno.turno_id === "tur-dia" ? "13:00:00" : (activeTurno && activeTurno.turno_id === "tur-noche" ? "01:00:00" : null),
      tiempo_disponible_turno: activeTurno ? Number(activeTurno.horas_totales) - Number(activeTurno.horas_descanso) : 11.00,
      turno_id: activeTurno ? activeTurno.turno_id : null
    };

    setActiveEvent(newEvent);
    setMachineState("parado");
    
    await dbService.saveEvent(newEvent);
    setEventHistory(prev => [newEvent, ...prev]);
    setPendingEvents(prev => [...prev, newEvent]);

    setTimeout(() => syncPendingEvents([...pendingEvents, newEvent]), 200);
  }

  function handleStartEndStoppage() {
    if (activeEvent) {
      const elapsed = Date.now() - new Date(activeEvent.fecha_hora_inicio).getTime();
      if (elapsed < 1000) return;
    }
    setFormOrigenId("");
    setFormRazonId("");
    setSuggestedReasonName("");
    setFormObservacion("");
    setFormUbicacion("");
    
    setCurrentStage("STAGE_ORIGEN");
  }

  function handleSelectOrigen(id: string) {
    setFormOrigenId(id);
    setCurrentStage("STAGE_RAZON");
  }

  function handleSelectReason(id: string) {
    setFormRazonId(id);
    setSuggestedReasonName("");
    setCurrentStage("STAGE_OBSERVACION");
  }

  function handleSaveSuggestedReason() {
    if (!suggestedReasonName.trim()) return;
    setFormRazonId("");
    setCurrentStage("STAGE_OBSERVACION");
  }

  function handleNextFromObservacion() {
    const hasLocation = !!(
      selectedReasonObj?.mostrar_perfil_completo ||
      selectedReasonObj?.mostrar_perfil_niveles ||
      selectedReasonObj?.mostrar_perfil ||
      selectedReasonObj?.ubicacion_obligatoria
    );

    if (hasLocation) {
      setCurrentStage("STAGE_UBICACION");
    } else {
      setCurrentStage("STAGE_CONFIRMATION");
    }
  }

  function handleNextFromUbicacion() {
    setCurrentStage("STAGE_CONFIRMATION");
  }

  async function handleConfirmSaveStoppage() {
    if (!activeEvent) return;

    const fin = new Date().toISOString();
    const start = new Date(activeEvent.fecha_hora_inicio).getTime();
    let duration = Math.round((new Date(fin).getTime() - start) / 1000);
    if (duration < 1) duration = 1;

    const obsText = suggestedReasonName
      ? `[Sugerido] ${suggestedReasonName}. ${formObservacion}`.trim()
      : formObservacion;

    const chosenOrigen = masterData.origenes?.find((o: any) => o.origen_id === formOrigenId);
    const chosenRazon = masterData.razones?.find((r: any) => r.razon_id === formRazonId);

    const updatedLocalInicio: StoppageEvent = {
      ...activeEvent,
      fecha_hora_fin: fin,
      duracion_segundos: duration,
      estado_evento: "cerrado",
      origen_id: formOrigenId,
      razon_id: formRazonId || null,
      observacion: obsText,
      version: activeEvent.version + 1,
      hora_hasta: fin,
      tiempo_parada: duration,
      categoria_tm: chosenOrigen ? chosenOrigen.nombre : formOrigenId,
      tiempo_muerto: chosenRazon ? chosenRazon.nombre : (suggestedReasonName || null),
      observaciones: obsText,
      ubicacion: formUbicacion || null
    };

    const finEventId = generateUUID();
    const finEvent: StoppageEvent = {
      evento_id: finEventId,
      inicio_evento_id: activeEvent.evento_id,
      tablet_id: activeEvent.tablet_id,
      secadero_id: activeEvent.secadero_id,
      fecha_hora_inicio: activeEvent.fecha_hora_inicio,
      fecha_hora_fin: fin,
      duracion_segundos: duration,
      estado_evento: "cerrado",
      tipo_registro: activeEvent.tipo_registro,
      origen_id: formOrigenId,
      razon_id: formRazonId || null,
      observacion: obsText,
      version: 1,
      sincronizado: false,
      hora_inicio_turno: activeEvent.hora_inicio_turno,
      hora_fin_turno: activeEvent.hora_fin_turno,
      tipo_turno: activeEvent.tipo_turno,
      hora_inicio_descanso: activeEvent.hora_inicio_descanso,
      hora_fin_descanso: activeEvent.hora_fin_descanso,
      linea: activeEvent.linea,
      hora_desde: activeEvent.hora_desde,
      hora_hasta: fin,
      categoria_tm: chosenOrigen ? chosenOrigen.nombre : formOrigenId,
      tiempo_muerto: chosenRazon ? chosenRazon.nombre : (suggestedReasonName || null),
      observaciones: obsText,
      ubicacion: formUbicacion || null,
      tiempo_disponible_turno: activeEvent.tiempo_disponible_turno,
      tiempo_parada: duration,
      turno_id: activeEvent.turno_id
    };

    await dbService.saveEvent(updatedLocalInicio);
    await dbService.saveEvent(finEvent);

    setEventHistory(prev =>
      prev.map(item => (item.evento_id === activeEvent.evento_id ? updatedLocalInicio : item))
    );

    const toSync: StoppageEvent[] = [];
    if (!activeEvent.sincronizado) toSync.push(updatedLocalInicio);
    toSync.push(finEvent);

    setPendingEvents(prev => [
      ...prev.filter(item => item.evento_id !== activeEvent.evento_id),
      ...toSync
    ]);

    setActiveEvent(null);
    setMachineState("produciendo");
    setCurrentStage("MAIN");

    setTimeout(() => {
      syncPendingEvents([
        ...pendingEvents.filter(item => item.evento_id !== activeEvent.evento_id),
        ...toSync
      ]);
    }, 200);
  }

  function handleResetDeclarationFlow() {
    setCurrentStage("MAIN");
  }

  function handleStartEdit(event: StoppageEvent) {
    setEditingEvent(event);
    const dateInicio = new Date(event.fecha_hora_inicio);
    setEditDateInicio(dateInicio.toLocaleDateString("sv-SE"));
    setEditTimeInicio(dateInicio.toTimeString().slice(0, 5));

    if (event.fecha_hora_fin) {
      const dateFin = new Date(event.fecha_hora_fin);
      setEditDateFin(dateFin.toLocaleDateString("sv-SE"));
      setEditTimeFin(dateFin.toTimeString().slice(0, 5));
    } else {
      setEditDateFin("");
      setEditTimeFin("");
    }

    setEditOrigenId(event.origen_id || "");
    setEditRazonId(event.razon_id || "");
    setEditObservacion(event.observacion || "");
    setEditUbicacion(event.ubicacion || "");
  }

  async function handleSaveEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!editingEvent) return;

    const startIso = new Date(`${editDateInicio}T${editTimeInicio}:00`).toISOString();
    let finIso: string | null = null;
    let duration: number | null = null;

    if (editingEvent.estado_evento === "cerrado") {
      finIso = new Date(`${editDateFin}T${editTimeFin}:00`).toISOString();
      duration = Math.round((new Date(finIso).getTime() - new Date(startIso).getTime()) / 1000);
    }

    const chosenOrigen = masterData.origenes?.find((o: any) => o.origen_id === editOrigenId);
    const chosenRazon = masterData.razones?.find((r: any) => r.razon_id === editRazonId);

    const updatedEvent: StoppageEvent = {
      ...editingEvent,
      fecha_hora_inicio: startIso,
      fecha_hora_fin: finIso,
      duracion_segundos: duration,
      origen_id: editingEvent.estado_evento === "cerrado" ? editOrigenId : null,
      razon_id: editingEvent.estado_evento === "cerrado" ? editRazonId : null,
      observacion: editObservacion,
      version: editingEvent.version + 1,
      sincronizado: false,
      hora_desde: startIso,
      hora_hasta: finIso,
      tiempo_parada: duration,
      categoria_tm: editingEvent.estado_evento === "cerrado" && chosenOrigen ? chosenOrigen.nombre : null,
      tiempo_muerto: editingEvent.estado_evento === "cerrado" && chosenRazon ? chosenRazon.nombre : null,
      observaciones: editObservacion,
      ubicacion: editUbicacion || null
    };

    await dbService.saveEvent(updatedEvent);

    setEventHistory(prev =>
      prev.map(item => (item.evento_id === editingEvent.evento_id ? updatedEvent : item))
    );
    setPendingEvents(prev => [
      ...prev.filter(item => item.evento_id !== editingEvent.evento_id),
      updatedEvent
    ]);

    if (activeEvent && activeEvent.evento_id === editingEvent.evento_id) {
      setActiveEvent(updatedEvent);
    }

    setEditingEvent(null);
    
    setTimeout(() => {
      syncPendingEvents([
        ...pendingEvents.filter(item => item.evento_id !== editingEvent.evento_id),
        updatedEvent
      ]);
    }, 200);
  }

  async function handleSaveSettings(e: React.FormEvent) {
    e.preventDefault();
    const trimmedUrl = inputUrl.trim().replace(/\/$/, "");
    
    setIsSyncing(true);
    await fetchMasterData(trimmedUrl, inputSecadero);
    setIsSyncing(false);

    setSettings((prev: any) => {
      const next = {
        ...prev,
        supervisorUrl: trimmedUrl,
        secaderoId: inputSecadero
      };
      localStorage.setItem("tablet_settings", JSON.stringify(next));
      return next;
    });

    setIsSettingsOpen(false);

    if (inputSecadero && currentStage === "MACHINE_CONFIRM") {
      setCurrentStage("MAIN");
    }

    syncPendingEvents(pendingEvents, trimmedUrl);
  }

  function formatSeconds(totalSecs: number) {
    const hrs = Math.floor(totalSecs / 3600);
    const mins = Math.floor((totalSecs % 3600) / 60);
    const secs = totalSecs % 60;
    return [
      hrs.toString().padStart(2, "0"),
      mins.toString().padStart(2, "0"),
      secs.toString().padStart(2, "0")
    ].join(":");
  }

  if (!dbReady) {
    return (
      <div style={{ display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", height: "100vh", background: "var(--bg-app)", color: "var(--text-main)" }}>
        <div style={{ border: "4px solid rgba(255,255,255,0.1)", borderTop: "4px solid var(--brand-lumo)", borderRadius: "50%", width: "40px", height: "40px", animation: "spin 1s linear infinite" }}></div>
        <p style={{ marginTop: "16px", fontSize: "14px", color: "var(--text-muted)" }}>Iniciando base de datos local...</p>
        <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  const chosenOrigenObj = masterData.origenes?.find((o: any) => o.origen_id === formOrigenId);
  const chosenRazonObj = masterData.razones?.find((r: any) => r.razon_id === formRazonId);

  return (
    <div className="app-container">
      {/* APP HEADER */}
      <header className="app-header">
        <div className="brand-info">
          <img src="./lumo-transparent-logo.png" alt="LUMO" className="lumo-logo-header" />
          <span className="machine-header-title">
            {assignedSecaderoName}
          </span>
        </div>

        <div className="header-right">
          {currentStage === "MAIN" && (
            <div className="segmented-control">
              <button
                className={`control-tab ${activeTab === "operar" ? "active" : ""}`}
                onClick={() => setActiveTab("operar")}
              >
                Operar
              </button>
              <button
                className={`control-tab ${activeTab === "historial" ? "active" : ""}`}
                onClick={() => setActiveTab("historial")}
              >
                Historial
              </button>
            </div>
          )}

          <div className={`sync-status-indicator ${syncStatus}`} onClick={() => forceSync()}>
            {syncStatus === "online" ? <Wifi size={14} /> : <WifiOff size={14} />}
            <span>
              {isSyncing ? "..." : syncStatus === "online" ? "Sincro" : "Red offline"}
            </span>
          </div>

          <button className="btn-circle" style={{ width: "auto", padding: "0 12px", gap: "6px", display: "flex", alignItems: "center", border: "1px solid var(--border-active)" }} onClick={() => {
            setInputUrl(settings.supervisorUrl);
            setInputSecadero(settings.secaderoId);
            setIsSettingsOpen(true);
          }}>
            <Settings size={16} />
            <span style={{ fontSize: "12px", fontWeight: "600" }}>Ajustes</span>
          </button>
        </div>
      </header>

      {/* CORE WORKSPACE */}
      <div className="content-zone">
        {currentStage === "MACHINE_CONFIRM" && (
          <MachineConfirmStage
            secaderos={masterData.secaderos}
            secaderoId={settings.secaderoId}
            onSelectMachine={handleSelectMachine}
            inputUrl={inputUrl}
            setInputUrl={setInputUrl}
            onConnect={async (url) => {
              const ok = await fetchMasterData(url, settings.secaderoId);
              if (ok) {
                setSettings((prev: any) => {
                  const next = { ...prev, supervisorUrl: url };
                  localStorage.setItem("tablet_settings", JSON.stringify(next));
                  return next;
                });
                alert("Conexión exitosa.");
              } else {
                alert("Fallo de conexión.");
              }
            }}
          />
        )}

        {currentStage === "MAIN" && activeTab === "operar" && (
          <MainStage
            machineState={machineState}
            elapsedTime={elapsedTime}
            handleStartStoppage={handleStartStoppage}
            handleStartEndStoppage={handleStartEndStoppage}
            formatSeconds={formatSeconds}
          />
        )}

        {currentStage === "MAIN" && activeTab === "historial" && (
          <HistoryTab
            eventHistory={eventHistory}
            masterData={masterData}
            syncStatus={syncStatus}
            settings={settings}
            isSyncing={isSyncing}
            forceSync={forceSync}
            handleStartEdit={handleStartEdit}
            formatSeconds={formatSeconds}
          />
        )}

        {currentStage === "STAGE_ORIGEN" && (
          <OrigenStage
            origenes={masterData.origenes}
            selectedOrigenId={formOrigenId}
            handleSelectOrigen={handleSelectOrigen}
            handleResetDeclarationFlow={handleResetDeclarationFlow}
          />
        )}

        {currentStage === "STAGE_RAZON" && (
          <RazonStage
            filteredReasons={filteredReasons}
            selectedReasonId={formRazonId}
            handleSelectReason={handleSelectReason}
            onSuggestCustom={() => setCurrentStage("STAGE_SUGGEST_RAZON")}
            onGoBack={() => setCurrentStage("STAGE_ORIGEN")}
          />
        )}

        {currentStage === "STAGE_SUGGEST_RAZON" && (
          <SuggestRazonStage
            suggestedReasonName={suggestedReasonName}
            setSuggestedReasonName={setSuggestedReasonName}
            onSubmit={handleSaveSuggestedReason}
            onGoBack={() => setCurrentStage("STAGE_RAZON")}
          />
        )}

        {currentStage === "STAGE_OBSERVACION" && (
          <ObservacionStage
            origenName={chosenOrigenObj ? chosenOrigenObj.nombre : formOrigenId}
            razonName={chosenRazonObj ? chosenRazonObj.nombre : ""}
            suggestedReasonName={suggestedReasonName}
            selectedReasonObj={selectedReasonObj}
            formObservacion={formObservacion}
            setFormObservacion={setFormObservacion}
            parsedPredefinedObservations={parsedPredefinedObservations}
            onBack={() => setCurrentStage(suggestedReasonName ? "STAGE_SUGGEST_RAZON" : "STAGE_RAZON")}
            onNext={handleNextFromObservacion}
          />
        )}

        {currentStage === "STAGE_UBICACION" && (
          <UbicacionSecaderoStage
            isPerfilCompleto={!!(selectedReasonObj?.mostrar_perfil_completo ?? selectedReasonObj?.mostrar_perfil)}
            isPerfilNiveles={!!selectedReasonObj?.mostrar_perfil_niveles}
            isUbicacionObligatoria={!!(selectedReasonObj?.ubicacion_obligatoria ?? selectedReasonObj?.mostrar_perfil)}
            formUbicacion={formUbicacion}
            setFormUbicacion={setFormUbicacion}
            onBack={() => setCurrentStage("STAGE_OBSERVACION")}
            onNext={handleNextFromUbicacion}
          />
        )}

        {currentStage === "STAGE_CONFIRMATION" && (
          <ConfirmationStage
            origenName={chosenOrigenObj ? chosenOrigenObj.nombre : formOrigenId}
            razonName={chosenRazonObj ? chosenRazonObj.nombre : ""}
            suggestedReasonName={suggestedReasonName}
            elapsedTime={elapsedTime}
            formObservacion={formObservacion}
            formUbicacion={formUbicacion}
            formatSeconds={formatSeconds}
            onBackToEdit={() => {
              const hasLocation = !!(
                selectedReasonObj?.mostrar_perfil_completo ||
                selectedReasonObj?.mostrar_perfil_niveles ||
                selectedReasonObj?.mostrar_perfil ||
                selectedReasonObj?.ubicacion_obligatoria
              );
              setCurrentStage(hasLocation ? "STAGE_UBICACION" : "STAGE_OBSERVACION");
            }}
            handleConfirmSaveStoppage={handleConfirmSaveStoppage}
          />
        )}
      </div>

      {/* MODAL CONFIGURACION */}
      {isSettingsOpen && (
        <div className="settings-overlay">
          <div className="settings-card">
            <div className="settings-header">
              <span className="settings-title">Configuración de Terminal</span>
              <button className="btn-circle" style={{ width: "32px", height: "32px" }} onClick={() => setIsSettingsOpen(false)}>
                <X size={16} />
              </button>
            </div>
            <form onSubmit={handleSaveSettings}>
              <div className="settings-body">
                <div className="form-field">
                  <label className="form-label" style={{ display: "flex", justifyContent: "space-between" }}>
                    <span>Servidor Supervisor (IP)</span>
                    <button
                      type="button"
                      onClick={handleAutoDiscover}
                      disabled={isScanning}
                      style={{
                        background: "transparent",
                        border: "none",
                        color: "var(--brand-lumo)",
                        cursor: "pointer",
                        fontSize: "12px",
                        fontWeight: "700",
                        padding: 0,
                        textTransform: "uppercase",
                        letterSpacing: "0.5px"
                      }}
                    >
                      {isScanning ? "Buscando..." : "🔍 Autodetectar"}
                    </button>
                  </label>
                  <input
                    type="url"
                    required
                    placeholder="http://192.168.10.15:8080"
                    value={inputUrl}
                    onChange={e => setInputUrl(e.target.value)}
                    className="input-text"
                  />
                  {scanMessage && (
                    <span style={{ fontSize: "11.5px", color: "var(--brand-lumo-gold)", marginTop: "4px", display: "block" }}>
                      {scanMessage}
                    </span>
                  )}
                </div>

                <div className="form-field">
                  <label className="form-label">Secadero Asignado</label>
                  <select
                    value={inputSecadero}
                    onChange={e => setInputSecadero(e.target.value)}
                    className="input-text"
                    style={{ background: "var(--bg-input)", color: "#fff", border: "1px solid var(--border-subtle)" }}
                  >
                    <option value="">Seleccionar máquina...</option>
                    {masterData.secaderos.map((s: any) => (
                      <option key={s.secadero_id} value={s.secadero_id}>{s.nombre}</option>
                    ))}
                  </select>
                </div>

                <div style={{ marginTop: "16px", borderTop: "1px solid var(--border-subtle)", paddingTop: "16px" }}>
                  <span style={{ fontSize: "11px", fontWeight: "700", color: "var(--text-muted)", letterSpacing: "1px", textTransform: "uppercase", display: "block", marginBottom: "10px" }}>
                    Diagnóstico de Enlace
                  </span>
                  <div style={{ display: "grid", gap: "8px", fontSize: "12.5px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between" }}>
                      <span style={{ color: "var(--text-muted)" }}>Estado de Red:</span>
                      <strong style={{ color: syncStatus === "online" ? "var(--state-ok)" : "var(--state-alert)" }}>
                        {syncStatus === "online" ? "CONECTADO" : "DESCONECTADO"}
                      </strong>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between" }}>
                      <span style={{ color: "var(--text-muted)" }}>Último Reporte Exitoso:</span>
                      <strong>{lastSyncTime}</strong>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between" }}>
                      <span style={{ color: "var(--text-muted)" }}>Eventos Sincronizados:</span>
                      <strong style={{ color: "var(--state-ok)" }}>
                        {eventHistory.filter(e => e.sincronizado).length} registros
                      </strong>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between" }}>
                      <span style={{ color: "var(--text-muted)" }}>Cola Pendiente de Envío:</span>
                      <strong style={{ color: pendingEvents.length > 0 ? "var(--state-warning)" : "var(--text-muted)" }}>
                        {pendingEvents.length} registros
                      </strong>
                    </div>
                  </div>
                </div>
              </div>
              <div className="settings-footer" style={{ display: "flex", gap: "10px", marginTop: "16px", width: "100%", justifyContent: "space-between" }}>
                <button
                  type="button"
                  className="btn-control secondary"
                  onClick={async () => {
                    if (confirm("¿Estás seguro de que deseas restablecer la terminal? Esto borrará el historial local de paradas.")) {
                      const allEvts = await dbService.getEvents();
                      for (const ev of allEvts) {
                        await dbService.deleteEvent(ev.evento_id);
                      }
                      localStorage.clear();
                      window.location.reload();
                    }
                  }}
                  style={{ background: "rgba(239, 68, 68, 0.08)", borderColor: "rgba(239, 68, 68, 0.2)", color: "var(--accent-rose)", padding: "0 12px", width: "auto", fontSize: "12px" }}
                >
                  ❌ Restablecer
                </button>
                <div style={{ display: "flex", gap: "10px" }}>
                  <button type="button" className="btn-control secondary" onClick={() => setIsSettingsOpen(false)}>
                    Cerrar
                  </button>
                  <button type="submit" className="btn-control primary" style={{ flex: "none", padding: "0 20px" }}>
                    {isSyncing ? "Guardar Ajustes" : "Guardar Ajustes"}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL EDITAR PARADA LOCAL */}
      {editingEvent && (
        <div className="settings-overlay">
          <div className="settings-card">
            <div className="settings-header">
              <span className="settings-title">Editar Parada Historial</span>
              <button className="btn-circle" style={{ width: "32px", height: "32px" }} onClick={() => setEditingEvent(null)}>
                <X size={16} />
              </button>
            </div>
            <form onSubmit={handleSaveEdit}>
              <div className="settings-body">
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                  <div className="form-field">
                    <label className="form-label">Fecha Inicio</label>
                    <input
                      type="date"
                      required
                      value={editDateInicio}
                      onChange={e => setEditDateInicio(e.target.value)}
                      className="input-text"
                    />
                  </div>
                  <div className="form-field">
                    <label className="form-label">Hora Inicio</label>
                    <input
                      type="time"
                      required
                      value={editTimeInicio}
                      onChange={e => setEditTimeInicio(e.target.value)}
                      className="input-text"
                    />
                  </div>
                </div>

                {editingEvent.estado_evento === "cerrado" && (
                  <>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                      <div className="form-field">
                        <label className="form-label">Fecha Fin</label>
                        <input
                          type="date"
                          required
                          value={editDateFin}
                          onChange={e => setEditDateFin(e.target.value)}
                          className="input-text"
                        />
                      </div>
                      <div className="form-field">
                        <label className="form-label">Hora Fin</label>
                        <input
                          type="time"
                          required
                          value={editTimeFin}
                          onChange={e => setEditTimeFin(e.target.value)}
                          className="input-text"
                        />
                      </div>
                    </div>

                    <div className="form-field">
                      <label className="form-label">Origen</label>
                      <select
                        required
                        value={editOrigenId}
                        onChange={e => {
                          setEditOrigenId(e.target.value);
                          setEditRazonId("");
                        }}
                        className="input-text"
                        style={{ background: "var(--bg-input)", color: "#fff", border: "1px solid var(--border-subtle)" }}
                      >
                        <option value="">Seleccionar origen...</option>
                        {masterData.origenes.map((o: any) => (
                          <option key={o.origen_id} value={o.origen_id}>{o.nombre}</option>
                        ))}
                      </select>
                    </div>

                    <div className="form-field">
                      <label className="form-label">Razón</label>
                      <select
                        required
                        disabled={!editOrigenId}
                        value={editRazonId}
                        onChange={e => setEditRazonId(e.target.value)}
                        className="input-text"
                        style={{ background: "var(--bg-input)", color: "#fff", border: "1px solid var(--border-subtle)" }}
                      >
                        <option value="">Seleccionar razón...</option>
                        {masterData.razones.filter((r: any) =>
                          r.activa && r.origen_ids && r.origen_ids.includes(editOrigenId)
                        ).map((r: any) => (
                          <option key={r.razon_id} value={r.razon_id}>
                            {r.codigo ? `[${r.codigo}] ` : ""}{r.nombre}
                          </option>
                        ))}
                      </select>
                    </div>
                  </>
                )}

                <div className="form-field">
                  <label className="form-label">Comentarios</label>
                  <input
                    type="text"
                    value={editObservacion}
                    onChange={e => setEditObservacion(e.target.value)}
                    className="input-text"
                  />
                </div>

                <div className="form-field">
                  <label className="form-label">Ubicación Layout (ej: N1P4, Entrada, Salida)</label>
                  <input
                    type="text"
                    value={editUbicacion}
                    onChange={e => setEditUbicacion(e.target.value)}
                    className="input-text"
                  />
                </div>
              </div>
              
              <div className="settings-footer" style={{ display: "flex", gap: "10px", marginTop: "16px" }}>
                <button type="button" className="btn-control secondary" onClick={() => setEditingEvent(null)}>
                  Cerrar
                </button>
                <button type="submit" className="btn-control primary" style={{ flex: "none", padding: "0 20px" }}>
                  <Save size={16} /> Guardar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
