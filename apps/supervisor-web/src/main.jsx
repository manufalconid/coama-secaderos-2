import React, { useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  Archive,
  BarChart3,
  CheckCircle2,
  Clock3,
  FileClock,
  Gauge,
  LayoutDashboard,
  Play,
  RefreshCw,
  SlidersHorizontal,
  X,
  Send
} from "lucide-react";
import "./styles.css";

// Import modular components
import OperacionView from "./components/OperacionView";
import EventosView from "./components/EventosView";
import AnalisisView from "./components/AnalisisView";
import ParametrosView from "./components/ParametrosView";
import TurnosView from "./components/TurnosView";
import ValidacionesView from "./components/ValidacionesView";
import PresentacionView from "./components/PresentacionView";

const MASTER_CONFIG = {
  razones: {
    label: "Razones de parada",
    singular: "razón",
    idField: "razon_id",
    codePrefix: "RAZ",
    title: "Editar razón",
    createTitle: "Nueva razón"
  },
  origenes: {
    label: "Orígenes de parada",
    singular: "origen",
    idField: "origen_id",
    codePrefix: "ORI",
    title: "Editar origen",
    createTitle: "Nuevo origen"
  }
};

const PLANT_3_SECADEROS = [
  {
    id: "sec-omeco",
    nombre: "OMECO",
    imagen: "/secadero-omeco.png",
    estado: "PARADO",
    duracionEstado: "24 min",
    razon: "Atascamiento de lámina",
    origen: "Mecánico",
    tabletId: "TAB-OMECO-01",
    tabletConectada: true,
    ultimaComm: "Hace 15 seg",
    paradasTurno: 3,
    tiempoMuertoTurno: "1h 45m",
    productoErp: "1,6 × 2,6 — Eucalipto (Pendiente ERP)"
  },
  {
    id: "sec-benecke",
    nombre: "BENECKE",
    imagen: null,
    estado: "PENDIENTE",
    duracionEstado: "--",
    razon: "--",
    origen: "--",
    tabletId: "Sin Tablet",
    tabletConectada: false,
    ultimaComm: "Sin reporte",
    paradasTurno: 0,
    tiempoMuertoTurno: "0m",
    productoErp: "Pendiente de Tablet"
  },
  {
    id: "sec-raute",
    nombre: "RAUTE",
    imagen: null,
    estado: "PENDIENTE",
    duracionEstado: "--",
    razon: "--",
    origen: "--",
    tabletId: "Sin Tablet",
    tabletConectada: false,
    ultimaComm: "Sin reporte",
    paradasTurno: 0,
    tiempoMuertoTurno: "0m",
    productoErp: "Pendiente de Tablet"
  }
];

function IntroSplash({ onFinish }) {
  const [fading, setFading] = useState(false);

  const handleEnd = () => {
    setFading(true);
    setTimeout(onFinish, 400);
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      handleEnd();
    }, 1800);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div
      onClick={handleEnd}
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        width: "100vw",
        height: "100vh",
        backgroundColor: "#000000",
        zIndex: 999999,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        cursor: "pointer",
        opacity: fading ? 0 : 1,
        transition: "opacity 0.4s ease-out",
        overflow: "hidden"
      }}
    >
      <video
        src="/intro-lumo.mp4"
        autoPlay
        muted
        playsInline
        onEnded={handleEnd}
        onError={handleEnd}
        style={{
          width: "100%",
          height: "100%",
          objectFit: "cover",
          border: "none",
          margin: 0,
          padding: 0
        }}
      />
    </div>
  );
}

function App() {
  const [showSplash, setShowSplash] = useState(true);
  const [activeTab, setActiveTab] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get("presentacion") === "true" ? "presentacion" : "operacion";
  });
  const [secaderos] = useState(PLANT_3_SECADEROS);
  const [selectedSecaderoFilter, setSelectedSecaderoFilter] = useState("sec-omeco");
  const [masterData, setMasterData] = useState({ razones: [], origenes: [], turnos: [], secaderos: [] });
  const [propuestas, setPropuestas] = useState([]);
  const [eventos, setEventos] = useState([]);
  const [toasts, setToasts] = useState([]);
  const [tabletsStatus, setTabletsStatus] = useState([]);
  const [activeMaster, setActiveMaster] = useState("razones");
  const [query, setQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [stateFilter, setStateFilter] = useState("activas");
  const [selected, setSelected] = useState(null);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [cancelReason, setCancelReason] = useState("");
  const [form, setForm] = useState(null);
  const [isCreating, setIsCreating] = useState(false);

  // States for event editing
  const [editingRecord, setEditingRecord] = useState(null);
  const [editForm, setEditForm] = useState({ startDate: "", startTime: "", endDate: "", endTime: "", razon_id: "", origen_id: "", observacion: "", ubicacion: "", linea: "" });

  const [status, setStatus] = useState({
    loading: true,
    api: "ok",
    db: "memoria",
    updatedAt: new Date(),
    error: null
  });

  useEffect(() => {
    refreshData();
    const interval = setInterval(refreshData, 5000);

    const handleKeyDown = (e) => {
      if (e.key === "Escape") {
        if (document.fullscreenElement) {
          document.exitFullscreen().catch(() => {});
        }
      } else if (e.key === "F11") {
        e.preventDefault();
        if (!document.fullscreenElement) {
          document.documentElement.requestFullscreen().catch(() => {});
        } else {
          document.exitFullscreen().catch(() => {});
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      clearInterval(interval);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  const showToast = (message) => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, message }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 3500);
  };

  const config = MASTER_CONFIG[activeMaster];
  const rows = masterData[activeMaster] ?? [];
  const origenesById = useMemo(
    () => new Map(masterData.origenes.map(ori => [ori.origen_id, ori])),
    [masterData.origenes]
  );

  const filteredMasterRows = rows.filter(row => {
    const term = query.trim().toLowerCase();
    const parentNames = activeMaster === "razones"
      ? (row.origen_ids || []).map(id => masterData.origenes.find(o => o.origen_id === id)?.nombre).filter(Boolean)
      : [];
    const matchesQuery =
      term.length === 0 ||
      [row.nombre, ...parentNames]
        .filter(Boolean)
        .some(val => String(val).toLowerCase().includes(term));
    const activeValue = row.activa ?? row.activo ?? true;
    const matchesState =
      stateFilter === "todas" ||
      (stateFilter === "activas" && activeValue) ||
      (stateFilter === "inactivas" && !activeValue);
    const matchesCategory =
      activeMaster !== "razones" || !categoryFilter || (row.origen_ids || []).includes(categoryFilter);
    return matchesQuery && matchesState && matchesCategory;
  });

  const pendingPropuestas = propuestas.filter(p => p.estado_revision === "pendiente");

  async function refreshData() {
    try {
      const [masterPayload, proposalsPayload, eventsPayload, tabletsPayload] = await Promise.all([
        apiGet("/master-data"),
        apiGet("/admin/propuestas?estado=pendiente").catch(() => []),
        apiGet("/admin/eventos").catch(() => []),
        apiGet("/admin/tablets/status").catch(() => [])
      ]);

      setMasterData({
        razones: masterPayload.razones ?? [],
        origenes: masterPayload.origenes ?? [],
        turnos: masterPayload.turnos ?? [],
        secaderos: masterPayload.secaderos ?? []
      });
      setPropuestas(Array.isArray(proposalsPayload) ? proposalsPayload : []);
      setTabletsStatus(Array.isArray(tabletsPayload) ? tabletsPayload : []);
      if (Array.isArray(eventsPayload)) {
        setEventos(eventsPayload);
      } else {
        setEventos([]);
      }
      setStatus(prev => ({ ...prev, updatedAt: new Date() }));
      selectRow(masterPayload[activeMaster]?.[0] ?? null, activeMaster);
    } catch (err) {
      console.error(err);
      setEventos([]);
    }
  }

  function changeMaster(nextMaster) {
    setActiveMaster(nextMaster);
    setQuery("");
    setCategoryFilter("");
    setIsCreating(false);
    selectRow(masterData[nextMaster]?.[0] ?? null, nextMaster);
  }

  function selectRow(row, masterKey = activeMaster) {
    setSelected(row);
    setIsCreating(false);
    setForm(row ? toForm(row, masterKey) : createBlankForm(masterKey));
  }

  function startCreate() {
    setSelected(null);
    setIsCreating(true);
    setForm(createBlankForm(activeMaster));
  }

  async function saveForm(e) {
    e.preventDefault();
    if (!form?.nombre?.trim()) return;

    const id = selected?.[config.idField];
    const endpoint = id
      ? `/admin/${activeMaster}/${encodeURIComponent(id)}`
      : `/admin/${activeMaster}`;
    const method = id ? "PATCH" : "POST";
    const payload = {
      ...form,
      activa: Boolean(form.activa),
      observacion_obligatoria: Boolean(form.observacion_obligatoria),
      mostrar_perfil: Boolean(form.mostrar_perfil)
    };

    const saved = await apiJson(endpoint, { method, body: payload });
    setMasterData(prev => ({
      ...prev,
      [activeMaster]: upsertById(prev[activeMaster], config.idField, saved)
    }));
    setSelected(saved);
    setForm(toForm(saved, activeMaster));
    setIsCreating(false);
    showToast(`Parámetro de ${config.singular} guardado correctamente.`);
  }

  async function deleteSelectedMaster() {
    if (!selected) return;
    const id = selected[config.idField];
    if (!window.confirm(`¿Está seguro de que desea eliminar esta ${config.singular}?`)) return;

    try {
      const res = await fetch(`/api/admin/${activeMaster}/${encodeURIComponent(id)}`, {
        method: "DELETE"
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Error al eliminar");
      }

      setMasterData(prev => ({
        ...prev,
        [activeMaster]: prev[activeMaster].filter(item => item[config.idField] !== id)
      }));
      setSelected(null);
      setForm(createBlankForm(activeMaster));
      showToast(`Parámetro de ${config.singular} eliminado correctamente.`);
    } catch (err) {
      console.error(err);
      showToast(err.message || "Error al eliminar el parámetro.");
    }
  }

  async function handleDownloadXlsx() {
    showToast("Generando y descargando planilla Excel...");
    try {
      const res = await fetch("/api/admin/parametros/export");
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || `Error HTTP ${res.status} al generar planilla.`);
      }
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "parametrizacion_secaderos.xlsx";
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      showToast("✅ Planilla descargada correctamente.");
    } catch (err) {
      console.error(err);
      showToast(`❌ ${err.message || "No se pudo descargar la planilla."}`);
    }
  }

  async function handleUploadXlsx(e) {
    const file = e.target.files?.[0];
    if (!file) return;

    const confirmUpload = window.confirm("¿Está seguro de que desea sobreescribir la parametrización actual (secaderos, tablets, turnos y catálogo)? Esto no borrará los datos históricos de paradas.");
    if (!confirmUpload) return;

    showToast("Subiendo y procesando planilla Excel...");
    try {
      const arrayBuffer = await file.arrayBuffer();
      const res = await fetch("/api/admin/parametros/import", {
        method: "POST",
        headers: {
          "content-type": "application/octet-stream"
        },
        body: arrayBuffer
      });

      if (res.ok) {
        showToast("✅ Parametrización importada correctamente.");
        const mdRes = await fetch("/api/master-data");
        if (mdRes.ok) {
          const freshMd = await mdRes.json();
          setMasterData(freshMd);
        }
      } else {
        const err = await res.json();
        showToast(`❌ Error: ${err.error || "Fallo al procesar el archivo"}`);
      }
    } catch (err) {
      console.error(err);
      showToast("❌ Error de comunicación con el servidor.");
    } finally {
      if (e.target) {
        e.target.value = "";
      }
    }
  }

  async function reviewProposal(propuesta, estadoRevision) {
    try {
      const normText = (propuesta.texto || "").trim().toLowerCase();
      const normTipo = (propuesta.tipo || "razon").toLowerCase();

      const matchingProposals = propuestas.filter(p =>
        (p.tipo || "razon").toLowerCase() === normTipo &&
        (p.texto || "").trim().toLowerCase() === normText
      );

      const toReview = matchingProposals.length > 0 ? matchingProposals : [propuesta];
      for (const p of toReview) {
        try {
          await apiJson(`/admin/propuestas/${encodeURIComponent(p.propuesta_id)}/revision`, {
            method: "PATCH",
            body: { estado_revision: estadoRevision }
          });
        } catch (e) {
          console.warn("Aviso secundario en API de propuesta:", p.propuesta_id, e);
        }
      }

      setPropuestas(prev =>
        prev.map(item => {
          if (
            (item.tipo || "razon").toLowerCase() === normTipo &&
            (item.texto || "").trim().toLowerCase() === normText
          ) {
            return { ...item, estado_revision: estadoRevision };
          }
          return item;
        })
      );
      showToast("Sugerencia marcada como revisada.");
    } catch (err) {
      console.error("Error al revisar propuesta:", err);
      showToast(`Error al revisar propuesta: ${err.message}`);
    }
  }

  async function handleAnularEvento(eventoId) {
    if (!cancelReason.trim()) return;
    try {
      const updated = await apiJson(`/admin/eventos/${encodeURIComponent(eventoId)}`, {
        method: "PATCH",
        body: {
          estado_evento: "anulado",
          observacion: `ANULADO: ${cancelReason}`
        }
      });
      setEventos(prev => prev.map(evt => evt.evento_id === updated.evento_id ? updated : evt));
      setSelectedEvent(null);
      setCancelReason("");
      showToast("Evento de parada anulado.");
    } catch (err) {
      console.error(err);
      showToast("Error al anular evento.");
    }
  }

  function handleStartEdit(row) {
    const evt = row.originalEvent;
    
    const startIso = evt.hora_desde || evt.fecha_hora_inicio || evt.inicio;
    const finIso = evt.hora_hasta || evt.fecha_hora_fin || evt.fin;

    const startParts = parseIsoToLocalParts(startIso);
    const finParts = parseIsoToLocalParts(finIso);
    
    let origId = "";
    if (Array.isArray(evt.origenes) && evt.origenes.length > 0) {
      origId = evt.origenes[0].origen_id || "";
    } else if (evt.origen_id) {
      origId = evt.origen_id;
    }

    setEditingRecord({
      event: evt
    });

    setEditForm({
      startDate: startParts.date,
      startTime: startParts.time,
      endDate: finParts.date,
      endTime: finParts.time,
      razon_id: evt.razon_id || "",
      origen_id: origId,
      observacion: evt.observaciones || evt.observacion || "",
      ubicacion: evt.ubicacion || "",
      linea: evt.linea || evt.secadero_id
    });
  }

  async function handleSaveEdit(e) {
    e.preventDefault();
    if (!editingRecord) return;
    
    const evt = editingRecord.event;
    const startIso = new Date(`${editForm.startDate}T${editForm.startTime}`).toISOString();
    let finIso = null;
    if (editForm.endDate && editForm.endTime) {
      finIso = new Date(`${editForm.endDate}T${editForm.endTime}`).toISOString();
    }

    const payload = {
      fecha_hora_inicio: startIso,
      fecha_hora_fin: finIso,
      razon_id: editForm.razon_id || null,
      origenes: editForm.origen_id ? [{ origen_id: editForm.origen_id }] : [],
      observacion: editForm.observacion,
      ubicacion: editForm.ubicacion || null
    };

    try {
      const updated = await apiJson(`/admin/eventos/${encodeURIComponent(evt.evento_id)}`, {
        method: "PATCH",
        body: payload
      });

      setEventos(prev => prev.map(item => item.evento_id === updated.evento_id ? updated : item));
      showToast("Registro editado correctamente.");
      setEditingRecord(null);
    } catch (err) {
      console.error(err);
      showToast("Error al guardar cambios.");
    }
  }

  const secaderosList = useMemo(() => {
    return secaderos.map(sec => {
      const tablet = tabletsStatus.find(t => t.secadero_id === sec.id);
      const hasTablet = !!tablet;
      const isConectada = tablet ? tablet.conectada : false;
      
      let ultimaComm = "Sin reporte";
      if (tablet && tablet.lastSeen) {
        const diffMs = Date.now() - Date.parse(tablet.lastSeen);
        const diffMins = Math.floor(diffMs / 60000);
        if (diffMins < 1) {
          const diffSecs = Math.floor(diffMs / 1000);
          ultimaComm = `Hace ${Math.max(1, diffSecs)} seg`;
        } else if (diffMins < 60) {
          ultimaComm = `Hace ${diffMins} min`;
        } else {
          const diffHours = Math.floor(diffMins / 60);
          ultimaComm = `Hace ${diffHours} h`;
        }
      }

      const eventsForSec = eventos.filter(e => e.secadero_id === sec.id).sort((a, b) => {
        const timeA = Date.parse(a.fecha_hora_inicio || a.inicio || a.timestamp_registro || 0);
        const timeB = Date.parse(b.fecha_hora_inicio || b.inicio || b.timestamp_registro || 0);
        return timeB - timeA;
      });

      const latestEvent = eventsForSec[0];
      const activeEvent = (latestEvent && latestEvent.estado_evento === "abierto" && !latestEvent.fecha_hora_fin) ? latestEvent : null;
      
      let estado = "SIN_TABLET";
      let duracionEstado = "";
      let razon = sec.razon;
      let origen = sec.origen;

      if (hasTablet) {
        if (activeEvent) {
          estado = "PARADO";
          const startMs = Date.parse(activeEvent.fecha_hora_inicio);
          const diffMs = Date.now() - startMs;
          const diffMins = Math.floor(diffMs / 60000);
          if (diffMins < 60) {
            duracionEstado = `${Math.max(0, diffMins)} min`;
          } else {
            const hrs = Math.floor(diffMins / 60);
            const mins = diffMins % 60;
            duracionEstado = `${hrs}h ${mins}m`;
          }

          if (activeEvent.tiempo_muerto) {
            razon = activeEvent.tiempo_muerto;
          } else if (activeEvent.razon_id) {
            razon = masterData.razones.find(r => r.razon_id === activeEvent.razon_id)?.nombre || "Desconocida";
          } else {
            razon = activeEvent.propuesta_manual?.texto || "--";
          }

          if (activeEvent.categoria_tm) {
            origen = activeEvent.categoria_tm;
          } else if (Array.isArray(activeEvent.origenes) && activeEvent.origenes.length > 0) {
            origen = activeEvent.origenes
              .map(o => masterData.origenes.find(org => org.origen_id === o.origen_id)?.nombre || o.origen_manual || o.origen_id)
              .join(", ");
          } else {
            origen = "--";
          }
        } else if (!isConectada) {
          estado = "DESCONECTADO";
          duracionEstado = "";
          razon = "--";
          origen = "--";
        } else {
          estado = "OPERANDO";
          duracionEstado = "";
          razon = "--";
          origen = "--";
        }
      }

      const todayStr = new Date().toISOString().split("T")[0];
      let totalSeconds = 0;
      let paradasTurno = 0;
      eventos.forEach(evt => {
        if (evt.secadero_id !== sec.id) return;
        const startIso = evt.fecha_hora_inicio || evt.inicio;
        if (!startIso) return;
        const startDay = startIso.split("T")[0];
        if (startDay !== todayStr) return;

        paradasTurno++;
        let seconds = evt.duracion_segundos || evt.tiempo_parada || 0;
        if (evt.estado_evento === "abierto" || !evt.fecha_hora_fin) {
          seconds = Math.max(0, Math.floor((Date.now() - Date.parse(startIso)) / 1000));
        }
        totalSeconds += seconds;
      });

      let tiempoMuertoTurno = "0m";
      if (totalSeconds > 0) {
        const hrs = Math.floor(totalSeconds / 3600);
        const mins = Math.floor((totalSeconds % 3600) / 60);
        tiempoMuertoTurno = hrs > 0 ? `${hrs}h ${mins}m` : `${mins}m`;
      }

      return {
        ...sec,
        estado,
        duracionEstado,
        razon,
        origen,
        tabletId: tablet ? tablet.tablet_id : sec.tabletId,
        tabletConectada: isConectada,
        ultimaComm,
        paradasTurno,
        tiempoMuertoTurno
      };
    });
  }, [tabletsStatus, eventos, masterData, secaderos]);

  const totalDowntimeToday = useMemo(() => {
    const todayStr = new Date().toISOString().split("T")[0];
    let totalSeconds = 0;
    eventos.forEach(evt => {
      const startIso = evt.fecha_hora_inicio || evt.inicio;
      if (!startIso) return;
      const startDay = startIso.split("T")[0];
      if (startDay !== todayStr) return;
      
      let seconds = evt.duracion_segundos || evt.tiempo_parada || 0;
      if (evt.estado_evento === "abierto" || !evt.fecha_hora_fin) {
        seconds = Math.max(0, Math.floor((Date.now() - Date.parse(startIso)) / 1000));
      }
      totalSeconds += seconds;
    });
    if (totalSeconds === 0) return "0m";
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  }, [eventos]);

  if (activeTab === "presentacion") {
    return (
      <PresentacionView
        onClose={() => {
          const url = new URL(window.location);
          url.searchParams.delete("presentacion");
          window.history.replaceState({}, "", url);
          setActiveTab("operacion");
        }}
      />
    );
  }

  return (
    <>
      {showSplash && <IntroSplash onFinish={() => setShowSplash(false)} />}
      <div className="app-shell">
      <aside className="sidebar">
        <div className="brand-header">
          <img src="/lumo-transparent-logo.png" alt="Lumo Data Solutions" className="lumo-logo-img" />
          <div className="brand-tagline">Más información, mejores decisiones industriales.</div>
        </div>

        <nav className="nav-list" aria-label="Navegación">
          <NavItem icon={LayoutDashboard} label="Operación" active={activeTab === "operacion"} onClick={() => setActiveTab("operacion")} />
          <NavItem icon={FileClock} label="Eventos" badge={eventos.filter(e => e.estado_evento === "abierto").length} active={activeTab === "eventos"} onClick={() => setActiveTab("eventos")} />
          <NavItem icon={BarChart3} label="Análisis" active={activeTab === "analisis"} onClick={() => setActiveTab("analisis")} />
          <NavItem icon={SlidersHorizontal} label="Parámetros" active={activeTab === "parametros"} onClick={() => setActiveTab("parametros")} />
          <NavItem icon={Clock3} label="Turnos" active={activeTab === "turnos"} onClick={() => setActiveTab("turnos")} />
          <NavItem icon={CheckCircle2} label="Validaciones" badge={pendingPropuestas.length} active={activeTab === "validaciones"} onClick={() => setActiveTab("validaciones")} />
        </nav>

        <div className="sidebar-footer">
          <button 
            className="btn-secondary" 
            style={{ width: "100%", minHeight: "32px", padding: "0 10px", fontSize: "11px", marginBottom: "16px", background: "rgba(250, 204, 21, 0.04)", borderColor: "rgba(250, 204, 21, 0.15)", color: "var(--brand-lumo)" }}
            onClick={() => setActiveTab("presentacion")}
          >
            <Play size={12} style={{ marginRight: "6px" }} /> Presentación del Proyecto
          </button>
          <div className="user-card">
            <div className="avatar">J</div>
            <div>
              <strong style={{ display: "block", color: "var(--text-main)" }}>Supervisor Secado</strong>
              <span style={{ fontSize: "11px", color: "var(--text-dim)" }}>COAMA SudAmerica</span>
            </div>
          </div>
        </div>
      </aside>

      <main className="workspace">
        <header className="status-bar">
          <div className="status-group">
            <span className="status-pill"><Gauge size={14} /> Control Telemetría: <strong>ONLINE</strong></span>
            <span className="status-pill"><Archive size={14} /> Almacenamiento: <strong>Local-First</strong></span>
          </div>
          <div className="status-group">
            <span>Última Sync: <strong style={{ color: "var(--brand-lumo-gold)" }}>{formatTime(status.updatedAt)}</strong></span>
            <button className="btn-secondary" style={{ minHeight: "32px", padding: "0 10px" }} onClick={refreshData}>
              <RefreshCw size={13} />
            </button>
          </div>
        </header>

        {activeTab === "operacion" && (
          <div className="view-container">
            <OperacionView
              secaderos={secaderosList}
              totalDowntime={totalDowntimeToday}
              onSelectSecadero={id => { setSelectedSecaderoFilter(id); setActiveTab("eventos"); }}
            />
          </div>
        )}

        {activeTab === "eventos" && (
          <div className="view-container">
            <EventosView
              eventos={eventos}
              setSelectedEvent={setSelectedEvent}
              showToast={showToast}
              masterData={masterData}
              secaderos={secaderos}
              onStartEdit={handleStartEdit}
              selectedSecaderoFilter={selectedSecaderoFilter}
              setSelectedSecaderoFilter={setSelectedSecaderoFilter}
            />
          </div>
        )}

        {activeTab === "analisis" && (
          <div className="view-container">
            <AnalisisView eventos={eventos} masterData={masterData} showToast={showToast} />
          </div>
        )}

        {activeTab === "parametros" && (
          <div className="view-container">
            <ParametrosView
              activeMaster={activeMaster}
              changeMaster={changeMaster}
              masterData={masterData}
              filteredRows={filteredMasterRows}
              config={config}
              query={query}
              setQuery={setQuery}
              categoryFilter={categoryFilter}
              setCategoryFilter={setCategoryFilter}
              selected={selected}
              selectRow={selectRow}
              onDownloadXlsx={handleDownloadXlsx}
              onUploadXlsx={handleUploadXlsx}
              tabletsStatus={tabletsStatus}
              refreshTablets={refreshData}
              MASTER_CONFIG={MASTER_CONFIG}
            />
          </div>
        )}

        {activeTab === "turnos" && (
          <div className="view-container">
            <TurnosView
              turnos={masterData.turnos || []}
            />
          </div>
        )}

        {activeTab === "validaciones" && (
          <div className="view-container">
            <ValidacionesView proposals={pendingPropuestas} onReview={reviewProposal} />
          </div>
        )}

        {/* MODAL ANULACIÓN */}
        {selectedEvent && (
          <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(0,0,0,0.85)", backdropFilter: "blur(4px)", display: "grid", placeItems: "center", zIndex: 1000 }}>
            <div className="clean-card" style={{ width: "420px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
                <h3 style={{ margin: 0, fontSize: "16px", fontWeight: "800" }}>Auditoría de Evento</h3>
                <button onClick={() => setSelectedEvent(null)}><X size={16} color="var(--text-dim)" /></button>
              </div>
              <div style={{ fontSize: "13px", display: "grid", gap: "8px", marginBottom: "20px" }}>
                <div><span>Secadero:</span> <strong>{selectedEvent.secadero_id}</strong></div>
                <div><span>Causa:</span> <strong>{selectedEvent.causa}</strong> ({selectedEvent.subcausa})</div>
                <div><span>Inicio:</span> {formatTime(new Date(selectedEvent.fecha_hora_inicio || selectedEvent.inicio))}</div>
              </div>
              {selectedEvent.estado_evento !== "anulado" && (
                <div>
                  <input
                    value={cancelReason}
                    onChange={e => setCancelReason(e.target.value)}
                    placeholder="Justificación obligatoria..."
                    style={{ width: "100%", padding: "10px", borderRadius: "2px", border: "1px solid var(--border-subtle)", background: "var(--bg-input)", color: "#fff", marginBottom: "12px", fontSize: "13px" }}
                  />
                  <button className="btn-primary" style={{ width: "100%", background: "var(--accent-rose)", borderColor: "var(--accent-rose)", color: "#fff" }} onClick={() => handleAnularEvento(selectedEvent.evento_id)}>
                    Anular Registro
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* MODAL EDICIÓN REGISTRO */}
        {editingRecord && (
          <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(0,0,0,0.85)", backdropFilter: "blur(4px)", display: "grid", placeItems: "center", zIndex: 1000 }}>
            <div className="clean-card" style={{ width: "450px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
                <h3 style={{ margin: 0, fontSize: "16px", fontWeight: "800" }}>Editar Registro Parada</h3>
                <button onClick={() => setEditingRecord(null)}><X size={16} color="var(--text-dim)" /></button>
              </div>
              
              <div style={{ fontSize: "12px", background: "rgba(255,255,255,0.02)", padding: "10px 12px", borderRadius: "2px", marginBottom: "16px", border: "1px solid var(--border-subtle)" }}>
                <div>Línea / Secadero: <strong style={{ color: "var(--brand-lumo)" }}>{editingRecord.event.linea || editingRecord.event.secadero_id}</strong></div>
              </div>

              <form onSubmit={handleSaveEdit} style={{ display: "grid", gap: "10px", maxHeight: "80vh", overflowY: "auto", paddingRight: "4px" }}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                  <label style={{ fontSize: "11px", fontWeight: "700", color: "var(--text-dim)" }}>
                    Fecha Inicio
                    <input
                      type="date"
                      required
                      value={editForm.startDate}
                      onChange={e => setEditForm({ ...editForm, startDate: e.target.value })}
                      style={{ width: "100%", padding: "8px", borderRadius: "2px", border: "1px solid var(--border-subtle)", background: "var(--bg-input)", color: "#fff", marginTop: "4px" }}
                    />
                  </label>
                  <label style={{ fontSize: "11px", fontWeight: "700", color: "var(--text-dim)" }}>
                    Hora Inicio
                    <input
                      type="time"
                      required
                      value={editForm.startTime}
                      onChange={e => setEditForm({ ...editForm, startTime: e.target.value })}
                      style={{ width: "100%", padding: "8px", borderRadius: "2px", border: "1px solid var(--border-subtle)", background: "var(--bg-input)", color: "#fff", marginTop: "4px" }}
                    />
                  </label>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                  <label style={{ fontSize: "11px", fontWeight: "700", color: "var(--text-dim)" }}>
                    Fecha Fin
                    <input
                      type="date"
                      value={editForm.endDate || ""}
                      onChange={e => setEditForm({ ...editForm, endDate: e.target.value })}
                      style={{ width: "100%", padding: "8px", borderRadius: "2px", border: "1px solid var(--border-subtle)", background: "var(--bg-input)", color: "#fff", marginTop: "4px" }}
                    />
                  </label>
                  <label style={{ fontSize: "11px", fontWeight: "700", color: "var(--text-dim)" }}>
                    Hora Fin
                    <input
                      type="time"
                      value={editForm.endTime || ""}
                      onChange={e => setEditForm({ ...editForm, endTime: e.target.value })}
                      style={{ width: "100%", padding: "8px", borderRadius: "2px", border: "1px solid var(--border-subtle)", background: "var(--bg-input)", color: "#fff", marginTop: "4px" }}
                    />
                  </label>
                </div>

                <label style={{ fontSize: "11px", fontWeight: "700", color: "var(--text-dim)" }}>
                  Razón de Parada
                  <select
                    value={editForm.razon_id}
                    onChange={e => setEditForm({ ...editForm, razon_id: e.target.value })}
                    style={{ width: "100%", padding: "8px", borderRadius: "2px", border: "1px solid var(--border-subtle)", background: "var(--bg-input)", color: "#fff", marginTop: "4px" }}
                  >
                    <option value="">Seleccionar razón...</option>
                    {masterData.razones.map(r => (
                      <option key={r.razon_id} value={r.razon_id}>{r.nombre}</option>
                    ))}
                  </select>
                </label>

                <label style={{ fontSize: "11px", fontWeight: "700", color: "var(--text-dim)" }}>
                  Origen de Parada
                  <select
                    value={editForm.origen_id}
                    onChange={e => setEditForm({ ...editForm, origen_id: e.target.value })}
                    style={{ width: "100%", padding: "8px", borderRadius: "2px", border: "1px solid var(--border-subtle)", background: "var(--bg-input)", color: "#fff", marginTop: "4px" }}
                  >
                    <option value="">Seleccionar origen...</option>
                    {masterData.origenes.map(o => (
                      <option key={o.origen_id} value={o.origen_id}>{o.nombre}</option>
                    ))}
                  </select>
                </label>

                <label style={{ fontSize: "11px", fontWeight: "700", color: "var(--text-dim)" }}>
                  Ubicación Layout (ej. N1P4, Entrada, Salida)
                  <input
                    type="text"
                    value={editForm.ubicacion}
                    onChange={e => setEditForm({ ...editForm, ubicacion: e.target.value })}
                    style={{ width: "100%", padding: "8px", borderRadius: "2px", border: "1px solid var(--border-subtle)", background: "var(--bg-input)", color: "#fff", marginTop: "4px" }}
                  />
                </label>

                <label style={{ fontSize: "11px", fontWeight: "700", color: "var(--text-dim)" }}>
                  Observaciones / Comentarios
                  <textarea
                    value={editForm.observacion}
                    onChange={e => setEditForm({ ...editForm, observacion: e.target.value })}
                    style={{ width: "100%", padding: "8px", borderRadius: "2px", border: "1px solid var(--border-subtle)", background: "var(--bg-input)", color: "#fff", marginTop: "4px", minHeight: "50px", resize: "vertical" }}
                  />
                </label>

                <button className="btn-primary" type="submit" style={{ marginTop: "8px", width: "100%" }}>
                  Guardar Cambios
                </button>
              </form>
            </div>
          </div>
        )}

        {/* TOASTER */}
        <div className="toast-container">
          {toasts.map(t => (
            <div className="toast" key={t.id}>
              <CheckCircle2 size={16} color="var(--brand-lumo)" />
              <span>{t.message}</span>
            </div>
          ))}
        </div>
      </main>
    </div>
    </>
  );
}

function NavItem({ icon: Icon, label, active, badge, onClick }) {
  return (
    <button className={`nav-item ${active ? "active" : ""}`} onClick={onClick}>
      <Icon size={17} />
      <span>{label}</span>
      {badge ? <strong>{badge}</strong> : null}
    </button>
  );
}

/* UTILS */
function parseIsoToLocalParts(isoString) {
  if (!isoString) return { date: "", time: "" };
  const d = new Date(isoString);
  if (isNaN(d.getTime())) return { date: "", time: "" };
  
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const date = String(d.getDate()).padStart(2, "0");
  const dateStr = `${year}-${month}-${date}`;
  
  const hours = String(d.getHours()).padStart(2, "0");
  const minutes = String(d.getMinutes()).padStart(2, "0");
  const timeStr = `${hours}:${minutes}`;
  
  return { date: dateStr, time: timeStr };
}

function createBlankForm(masterKey) {
  return {
    codigo: "",
    nombre: "",
    activa: true,
    origen_ids: [],
    observacion_obligatoria: false,
    observaciones_predefinidas: "",
    mostrar_perfil: false
  };
}

function toForm(row, masterKey) {
  return {
    codigo: row.codigo || "",
    nombre: row.nombre || "",
    activa: row.activa ?? true,
    origen_ids: row.origen_ids || [],
    observacion_obligatoria: row.observacion_obligatoria ?? false,
    observaciones_predefinidas: row.observaciones_predefinidas || "",
    mostrar_perfil: row.mostrar_perfil ?? false
  };
}

function upsertById(rows, idField, saved) {
  const index = rows.findIndex(r => r[idField] === saved[idField]);
  if (index === -1) return [...rows, saved];
  return rows.map(r => (r[idField] === saved[idField] ? saved : r));
}

async function apiGet(path) {
  const res = await fetch(`/api${path}`);
  return res.json();
}

async function apiJson(path, { method, body }) {
  const res = await fetch(`/api${path}`, {
    method,
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body)
  });
  if (!res.ok) {
    const errText = await res.text();
    let errMsg = `HTTP ${res.status}`;
    try {
      const errObj = JSON.parse(errText);
      if (errObj.error) errMsg = errObj.error;
    } catch {}
    throw new Error(errMsg);
  }
  return res.ok ? res.json() : {};
}

function formatTime(val) {
  return new Intl.DateTimeFormat("es-AR", { timeStyle: "medium" }).format(val);
}

const container = document.getElementById("root");
const root = window.__coamaSupervisorRoot ?? createRoot(container);
window.__coamaSupervisorRoot = root;
root.render(<App />);
