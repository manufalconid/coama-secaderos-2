import React from "react";
import { Send, Tablet, Download } from "lucide-react";

export default function EventosView({
  eventos,
  setSelectedEvent,
  showToast,
  masterData,
  secaderos,
  onStartEdit,
  selectedSecaderoFilter,
  setSelectedSecaderoFilter
}) {
  async function testTelegram() {
    try {
      const res = await fetch("/api/admin/test-telegram", { method: "POST" });
      if (res.ok) {
        showToast("🔴 Notificación de prueba enviada al Bot de Telegram.");
      } else {
        showToast("⚠️ Error al enviar prueba: verifica las variables de entorno.");
      }
    } catch (err) {
      console.error(err);
      showToast("⚠️ Error al comunicarse con el servidor.");
    }
  }

  function formatTimeOnly(date) {
    if (!(date instanceof Date) || isNaN(date.getTime())) return "";
    return date.toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" });
  }

  const rows = [];
  eventos.forEach(evt => {
    const secId = evt.secadero_id || evt.linea;
    const matchesFilter = !selectedSecaderoFilter || 
      secId === selectedSecaderoFilter ||
      evt.secadero_id === selectedSecaderoFilter ||
      (selectedSecaderoFilter === "sec-omeco" && (secId === "sec-omeco" || secId === "OMECO" || secId === "Secadero OMECO")) ||
      (selectedSecaderoFilter === "sec-benecke" && (secId === "sec-benecke" || secId === "BENECKE" || secId === "Secadero 1" || secId === "sec-1")) ||
      (selectedSecaderoFilter === "sec-raute" && (secId === "sec-raute" || secId === "RAUTE" || secId === "Secadero 2" || secId === "sec-2"));

    if (!matchesFilter) {
      return;
    }

    let razonName = "";
    if (evt.tiempo_muerto) {
      razonName = evt.tiempo_muerto;
    } else if (evt.razon_id) {
      razonName = masterData.razones.find(r => r.razon_id === evt.razon_id)?.nombre || "Desconocida";
    } else {
      razonName = evt.razon_manual || "--";
    }

    let originName = "";
    if (evt.categoria_tm) {
      originName = evt.categoria_tm;
    } else if (Array.isArray(evt.origenes) && evt.origenes.length > 0) {
      originName = evt.origenes
        .map(o => masterData.origenes.find(org => org.origen_id === o.origen_id)?.nombre || o.origen_manual || o.origen_id)
        .join(", ");
    } else {
      originName = "--";
    }

    const startIso = evt.hora_desde || evt.fecha_hora_inicio || evt.inicio;
    const endIso = evt.hora_hasta || evt.fecha_hora_fin || evt.fin;
    const startStr = startIso ? new Date(startIso).toLocaleString("es-AR", { timeZone: "America/Argentina/Buenos_Aires" }) : "--";
    const endStr = endIso ? new Date(endIso).toLocaleString("es-AR", { timeZone: "America/Argentina/Buenos_Aires" }) : "Abierto (En curso)";
    
    const durSec = evt.tiempo_parada || evt.duracion_segundos;
    const durationStr = durSec != null ? `${(durSec / 60).toFixed(1)} min` : "--";

    const turnoText = evt.tipo_turno || (evt.turno_id ? masterData.turnos?.find(t => t.turno_id === evt.turno_id)?.nombre : "--");
    const regTimestamp = evt.timestamp_registro || evt.creado_en_tablet || evt.recibido_en_servidor;
    const regStr = regTimestamp ? new Date(regTimestamp).toLocaleString("es-AR", { timeZone: "America/Argentina/Buenos_Aires" }) : "--";

    rows.push({
      key: evt.evento_id,
      evento_id: evt.evento_id,
      originalEvent: evt,
      fecha_registro: evt.fecha_registro || (regTimestamp ? regTimestamp.slice(0, 10) : "--"),
      hora_registro: evt.hora_registro || (regTimestamp ? regTimestamp.slice(11, 19) : "--"),
      timestamp_registro: regStr,
      linea: evt.linea || (secId === "sec-omeco" || secId === "Secadero OMECO" ? "OMECO" : (secId === "sec-benecke" || secId === "Secadero 1" ? "BENECKE" : "RAUTE")),
      hora_desde: startStr,
      hora_hasta: endStr,
      categoria_tm: originName,
      tiempo_muerto: razonName,
      observaciones: evt.observaciones || evt.observacion || "--",
      ubicacion: evt.ubicacion || "--",
      tiempo_parada_seg: durSec != null ? `${durSec} s` : "--",
      tiempo_parada_min: durSec != null ? `${(durSec / 60).toFixed(1)} m` : "--",
      tiempo_parada_hor: durSec != null ? `${(durSec / 3600).toFixed(2)} h` : "--",
      tipo_turno: turnoText,
      disponible: evt.tiempo_disponible_turno != null ? `${evt.tiempo_disponible_turno} hs` : "--",
      dateObj: new Date(startIso || regTimestamp || new Date())
    });
  });

  // Sort chronologically (newest first)
  rows.sort((a, b) => b.dateObj.getTime() - a.dateObj.getTime());

  // Find if there is an active/open stop strictly on the latest event of the filtered machine
  const machineEvents = [...eventos].filter(evt => {
    return evt.secadero_id === selectedSecaderoFilter ||
      (selectedSecaderoFilter === "sec-omeco" && evt.secadero_id === "Secadero OMECO") ||
      (selectedSecaderoFilter === "sec-benecke" && evt.secadero_id === "Secadero 1") ||
      (selectedSecaderoFilter === "sec-raute" && evt.secadero_id === "Secadero 2");
  }).sort((a, b) => {
    const timeA = Date.parse(a.fecha_hora_inicio || a.inicio || a.timestamp_registro || 0);
    const timeB = Date.parse(b.fecha_hora_inicio || b.inicio || b.timestamp_registro || 0);
    return timeB - timeA;
  });

  const latestMachineEvent = machineEvents[0];
  const activeStop = (latestMachineEvent && latestMachineEvent.estado_evento === "abierto" && !latestMachineEvent.fecha_hora_fin) ? latestMachineEvent : null;

  const secFilteredObj = secaderos.find(s => s.id === selectedSecaderoFilter);
  const secName = secFilteredObj ? secFilteredObj.nombre : "Secadero";

  return (
    <>
      <div className="main-header">
        <div>
          <h1>Registro de Eventos y Telemetría</h1>
          <p>Historial de paradas e inicios de ciclo de secado</p>
        </div>
        {/* BOTÓN TELEGRAM EN MODO SECUNDARIO/DISCRETO */}
        <button
          className="btn-secondary"
          style={{ minHeight: "32px", padding: "0 12px", fontSize: "11px", color: "var(--text-dim)", borderColor: "var(--border-subtle)" }}
          onClick={testTelegram}
        >
          Probar Bot Telegram <Send size={11} style={{ marginLeft: "4px" }} />
        </button>
      </div>

      {/* SECCIÓN DE FILTRADO POR SECADERO (EXCLUSIVOS, SIN "TODOS") */}
      <div className="secadero-filter-bar" style={{ marginBottom: "24px", display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "12px" }}>
        {secaderos.map(sec => {
          const isSelected = selectedSecaderoFilter === sec.id;
          return (
            <button
              key={sec.id}
              className={`filter-btn ${isSelected ? "active" : ""}`}
              onClick={() => setSelectedSecaderoFilter(sec.id)}
            >
              {sec.imagen ? (
                <img
                  src={sec.imagen}
                  alt={sec.nombre}
                  style={{
                    height: "36px",
                    width: "auto",
                    objectFit: "contain",
                    borderRadius: "2px"
                  }}
                />
              ) : (
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", color: "var(--text-dim)" }}>
                  <Tablet size={18} />
                  <span style={{ fontSize: "8.5px", marginTop: "2px", fontWeight: "600", textTransform: "uppercase" }}>Sin tablet</span>
                </div>
              )}
              <span style={{ fontSize: "11px", fontWeight: "700" }}>{sec.nombre}</span>
            </button>
          );
        })}
      </div>

      {/* ALERTA DE PARADA EN VIVO O MENSAJE DE OPERACIÓN NORMAL */}
      {activeStop ? (
        <div className="clean-card card-live-alert" style={{ marginBottom: "24px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
            <h3 style={{ margin: 0, fontSize: "15px", fontWeight: "700" }}>{secName} — Parada Abierta en Vivo</h3>
            <span className="live-badge">ALERTA ACTIVA</span>
          </div>
          <div style={{ fontSize: "13px", color: "var(--text-muted)", display: "flex", gap: "24px" }}>
            <div>Duración actual: <strong style={{ color: "var(--accent-rose)" }}>{secFilteredObj?.duracionEstado || "Calculando..."}</strong></div>
            <div>Inicio: <strong>{formatTimeOnly(new Date(activeStop.fecha_hora_inicio || activeStop.inicio))} hs</strong></div>
          </div>
        </div>
      ) : (
        <div className="clean-card" style={{ marginBottom: "24px", display: "flex", alignItems: "center", gap: "12px", borderLeft: "4px solid var(--accent-emerald)", background: "rgba(16, 185, 129, 0.02)" }}>
          <div style={{ width: "8px", height: "8px", background: "var(--accent-emerald)", boxShadow: "0 0 8px var(--accent-emerald)" }} />
          <div style={{ fontSize: "13px", color: "var(--text-muted)" }}>
            El secadero <strong>{secName}</strong> se encuentra operando normalmente. No hay paradas activas detectadas.
          </div>
        </div>
      )}

      <div className="clean-card">
        <h3 style={{ margin: "0 0 16px 0", fontSize: "15px", fontWeight: "700" }}>Historial de Eventos Registrados</h3>
        <table className="clean-table" style={{ fontSize: "12px" }}>
          <thead>
            <tr>
              <th style={{ width: "90px" }}>Línea</th>
              <th style={{ width: "90px" }}>Inicio (Desde)</th>
              <th style={{ width: "90px" }}>Fin (Hasta)</th>
              <th style={{ width: "120px" }}>Categoría TM</th>
              <th style={{ width: "160px" }}>Tiempo Muerto</th>
              <th>Observaciones</th>
              <th style={{ width: "100px" }}>Ubicación</th>
              <th style={{ width: "90px" }}>Duración (Min)</th>
              <th style={{ textAlign: "right", width: "70px" }}>Acción</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr><td colSpan={9} style={{ textAlign: "center", padding: "24px", color: "var(--text-dim)" }}>No hay registros para mostrar.</td></tr>
            ) : (
              rows.map(row => (
                <tr key={row.key} style={{ borderBottom: "1px solid var(--border-subtle)" }}>
                  <td><strong>{row.linea}</strong></td>
                  <td className="mono" style={{ whiteSpace: "nowrap" }}>{row.hora_desde.includes(",") ? row.hora_desde.split(",")[1]?.trim() || row.hora_desde : row.hora_desde.split(" ")[1] || row.hora_desde}</td>
                  <td className="mono" style={{ whiteSpace: "nowrap", color: row.hora_hasta.includes("Abierto") ? "var(--accent-rose)" : "inherit" }}>
                    {row.hora_hasta.includes("Abierto") ? row.hora_hasta : (row.hora_hasta.includes(",") ? row.hora_hasta.split(",")[1]?.trim() || row.hora_hasta : row.hora_hasta.split(" ")[1] || row.hora_hasta)}
                  </td>
                  <td><span className="mono" style={{ fontSize: "11px", background: "rgba(255,255,255,0.03)", padding: "2px 4px", borderRadius: "2px" }}>{row.categoria_tm}</span></td>
                  <td><strong>{row.tiempo_muerto}</strong></td>
                  <td style={{ overflow: "hidden", textOverflow: "ellipsis", wordBreak: "break-word" }} title={row.observaciones}>
                    {row.observaciones}
                  </td>
                  <td><span className="mono" style={{ color: "var(--brand-lumo-gold)" }}>{row.ubicacion}</span></td>
                  <td className="mono">{row.tiempo_parada_min}</td>
                  <td style={{ textAlign: "right" }}>
                    <button className="btn-secondary" style={{ minHeight: "28px", padding: "0 10px", fontSize: "11px", borderRadius: "2px" }} onClick={() => onStartEdit(row)}>
                      Editar
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}
