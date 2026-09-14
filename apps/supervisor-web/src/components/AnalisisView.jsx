import React, { useState, useEffect } from "react";
import { Download, Database, FileSpreadsheet, Calendar, Layers, X, Check, Loader2, Sparkles } from "lucide-react";

export default function AnalisisView({ eventos, masterData, showToast }) {
  const [isExporting, setIsExporting] = useState(false);
  
  // Estados para el Modal de Grid
  const [isGridModalOpen, setIsGridModalOpen] = useState(false);
  const [isLoadingOptions, setIsLoadingOptions] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [gridOptions, setGridOptions] = useState({
    lines: ["BENECKE", "OMECO", "RAUTE"],
    minDate: "",
    maxDate: "",
    totalRows: 0
  });
  const [fechaInicio, setFechaInicio] = useState("");
  const [fechaFin, setFechaFin] = useState("");
  const [selectedLineas, setSelectedLineas] = useState([]);
  const [activePreset, setActivePreset] = useState("all");

  // Cargar opciones de Google Sheets al abrir modal
  async function openGridModal() {
    setIsGridModalOpen(true);
    setIsLoadingOptions(true);
    try {
      const res = await fetch("/api/admin/grid/options");
      if (res.ok) {
        const data = await res.json();
        setGridOptions(data);
        if (!fechaInicio) setFechaInicio(data.minDate || "");
        if (!fechaFin) setFechaFin(data.maxDate || "");
        if (selectedLineas.length === 0 && Array.isArray(data.lines)) {
          setSelectedLineas(data.lines);
        }
      }
    } catch (err) {
      console.warn("Error cargando opciones de grid:", err);
    } finally {
      setIsLoadingOptions(false);
    }
  }

  function applyDatePreset(preset) {
    setActivePreset(preset);
    const today = new Date();
    const toISO = d => {
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, "0");
      const day = String(d.getDate()).padStart(2, "0");
      return `${year}-${month}-${day}`;
    };

    if (preset === "today") {
      const iso = toISO(today);
      setFechaInicio(iso);
      setFechaFin(iso);
    } else if (preset === "yesterday") {
      const y = new Date();
      y.setDate(y.getDate() - 1);
      const iso = toISO(y);
      setFechaInicio(iso);
      setFechaFin(iso);
    } else if (preset === "last7") {
      const d = new Date();
      d.setDate(d.getDate() - 6);
      setFechaInicio(toISO(d));
      setFechaFin(toISO(today));
    } else if (preset === "month") {
      const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
      setFechaInicio(toISO(startOfMonth));
      setFechaFin(toISO(today));
    } else if (preset === "all") {
      setFechaInicio(gridOptions.minDate || "");
      setFechaFin(gridOptions.maxDate || "");
    }
  }

  function toggleLinea(line) {
    if (selectedLineas.includes(line)) {
      if (selectedLineas.length === 1) {
        // Al menos una línea seleccionada
        return;
      }
      setSelectedLineas(selectedLineas.filter(l => l !== line));
    } else {
      setSelectedLineas([...selectedLineas, line]);
    }
  }

  function toggleAllLineas() {
    if (selectedLineas.length === gridOptions.lines.length) {
      // Dejar la primera seleccionada
      setSelectedLineas([gridOptions.lines[0]]);
    } else {
      setSelectedLineas([...gridOptions.lines]);
    }
  }

  async function handleDownloadGrid() {
    setIsDownloading(true);
    showToast("Generando archivo Excel desde Google Sheets...");
    try {
      const res = await fetch("/api/admin/grid/export", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fechaInicio: fechaInicio || undefined,
          fechaFin: fechaFin || undefined,
          lineas: selectedLineas.length > 0 ? selectedLineas : undefined
        })
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.error || `Error HTTP ${res.status}`);
      }

      let filename = "Grid tiempos muertos LumoDS.xlsx";
      const disposition = res.headers.get("content-disposition");
      if (disposition) {
        const matchUtf8 = disposition.match(/filename\*=UTF-8''([^;]+)/i);
        if (matchUtf8 && matchUtf8[1]) {
          filename = decodeURIComponent(matchUtf8[1]);
        } else {
          const matchStandard = disposition.match(/filename="?([^";]+)"?/i);
          if (matchStandard && matchStandard[1]) {
            filename = matchStandard[1];
          }
        }
      }

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      showToast(`✅ Excel descargado: ${filename}`);
      setIsGridModalOpen(false);
    } catch (err) {
      console.error(err);
      showToast(`❌ Error al descargar grid: ${err.message}`);
    } finally {
      setIsDownloading(false);
    }
  }

  async function exportToSheets() {
    setIsExporting(true);
    showToast("Iniciando exportación a Google Sheets...");
    try {
      const res = await fetch("/api/admin/sheets/sync", {
        method: "POST"
      });
      const data = await res.json();
      if (res.ok) {
        showToast("✅ Google Sheets sincronizado con éxito.");
      } else {
        showToast(`❌ Error: ${data.error || "Fallo en la exportación"}`);
      }
    } catch (err) {
      console.error(err);
      showToast("❌ Error de red al conectar con el servidor.");
    } finally {
      setIsExporting(false);
    }
  }

  function getTurnoForTime(fechaHoraInicio, turnos) {
    if (!fechaHoraInicio) return null;
    const date = new Date(fechaHoraInicio);
    const hours = date.getHours();
    const minutes = date.getMinutes();
    const timeNum = hours * 60 + minutes;

    const activeTurnos = (turnos || []).filter(t => t.activo);
    if (activeTurnos.length === 0) return null;

    for (const t of activeTurnos) {
      const [sh, sm] = t.hora_inicio.split(":").map(Number);
      const [eh, em] = t.hora_fin.split(":").map(Number);
      const sMin = sh * 60 + sm;
      const eMin = eh * 60 + em;

      if (sMin < eMin) {
        if (timeNum >= sMin && timeNum < eMin) {
          return t;
        }
      } else {
        if (timeNum >= sMin || timeNum < eMin) {
          return t;
        }
      }
    }
    return activeTurnos[0];
  }

  function downloadCsv() {
    const delimiter = ";";
    const header = [
      "fecha_de_registro",
      "linea",
      "turno_hora_desde",
      "turno_hora_hasta",
      "tiempo_de_turno_en_horas_programadas",
      "categoria",
      "tiempo_muerto",
      "observacion",
      "ubicacion",
      "tiempo_muerto_hora_desde",
      "tiempo_muerto_hora_hasta",
      "tiempo_muerto_en_horas",
      "tiempo_muerto_en_minutos"
    ].join(delimiter) + "\r\n";

    // Filtrar paradas cerradas y descartar eventos redundantes (inicio_evento_id)
    const closedEvents = (eventos || [])
      .filter(e => (!e.estado_evento || e.estado_evento === "cerrado") && !e.inicio_evento_id && (e.fecha_hora_inicio || e.inicio))
      .sort((a, b) => new Date(a.fecha_hora_inicio || a.inicio || 0) - new Date(b.fecha_hora_inicio || b.inicio || 0));

    const body = closedEvents.map(e => {
      const start = e.fecha_hora_inicio || e.inicio || "";
      const end = e.fecha_hora_fin || e.fin || "";
      if (!start) return "";

      const startDateObj = new Date(start);
      const day = String(startDateObj.getDate()).padStart(2, "0");
      const month = String(startDateObj.getMonth() + 1).padStart(2, "0");
      const year = startDateObj.getFullYear();
      const fechaFormatted = `${year}-${month}-${day}`;

      let shiftObj = null;
      if (e.turno_id && masterData.turnos) {
        shiftObj = masterData.turnos.find(t => t.turno_id === e.turno_id);
      }
      if (!shiftObj) {
        shiftObj = getTurnoForTime(start, masterData.turnos);
      }
      const horaInicioTurno = shiftObj ? shiftObj.hora_inicio : "06:00:00";
      const horaFinTurno = shiftObj ? shiftObj.hora_fin : "18:00:00";
      const horasProgramadasNum = shiftObj ? Number(shiftObj.horas_totales) : 12;
      const horasProgramadasStr = Number.isInteger(horasProgramadasNum) ? String(horasProgramadasNum) : horasProgramadasNum.toFixed(1).replace(".", ",");

      const secObj = masterData.secaderos ? masterData.secaderos.find(s => s.secadero_id === e.secadero_id) : null;
      let lineaNombre = e.linea || (secObj ? secObj.nombre : e.secadero_id || "");
      if (lineaNombre) {
        lineaNombre = lineaNombre.replace(/^Secadero\s+/i, "").toUpperCase();
      }

      const horaDesde = start;
      const horaHasta = end || "";

      let catNombre = "";
      if (Array.isArray(e.origenes) && e.origenes.length > 0) {
        const oNames = e.origenes.map(o => {
          if (o.origen_manual) return o.origen_manual;
          const origObj = masterData.origenes.find(x => x.origen_id === o.origen_id);
          return origObj ? origObj.nombre : o.origen_id;
        });
        catNombre = oNames.join(", ");
      } else if (e.origen) {
        catNombre = e.origen;
      } else if (e.categoria_tm) {
        catNombre = e.categoria_tm;
      }
      if (!catNombre) catNombre = "OPERATIVO";

      const razonObj = masterData.razones.find(r => r.razon_id === e.razon_id);
      const tiempoMuertoNombre = razonObj ? razonObj.nombre : (e.razon_manual || e.causa || e.tiempo_muerto || "PARADA");

      let obsText = (e.observacion || e.observaciones || "").replace(/\[Sugerido\].*?\.\s*/i, "").trim();
      if (obsText) {
        obsText = obsText.replace(/;/g, ",").replace(/\r?\n/g, " ").trim();
      }
      const observacionVal = obsText ? obsText.toUpperCase() : "-.-";
      const ubicacionVal = e.ubicacion ? e.ubicacion.toUpperCase() : "";

      const durSeconds = e.duracion_segundos || e.tiempo_parada || 0;
      const durHrFixed = (durSeconds / 3600).toFixed(2);
      const durMinFixed = (durSeconds / 60).toFixed(1);
      const durHoursStr = durHrFixed === "0.00" ? "0" : durHrFixed.replace(".", ",");
      const durMinutesStr = durMinFixed === "0.0" ? "0" : durMinFixed.replace(".", ",");

      const row = [
        fechaFormatted,
        lineaNombre,
        horaInicioTurno,
        horaFinTurno,
        horasProgramadasStr,
        catNombre.toUpperCase(),
        tiempoMuertoNombre.toUpperCase(),
        observacionVal,
        ubicacionVal,
        horaDesde,
        horaHasta,
        durHoursStr,
        durMinutesStr
      ];

      return row.map(val => {
        const str = String(val ?? "").replace(/;/g, ",").replace(/\r?\n/g, " ");
        if (str.includes('"')) {
          return `"${str.replace(/"/g, '""')}"`;
        }
        return str;
      }).join(delimiter);
    }).filter(Boolean).join("\r\n");

    const blob = new Blob(["\ufeff" + header + body], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `COAMA_Exportacion_ERP.csv`;
    link.click();
    showToast("CSV descargado para ERP COAMA (13 columnas).");
  }

  return (
    <>
      <div className="main-header">
        <div>
          <h1>Análisis BI & Grid de Tiempos Muertos</h1>
          <p>Dashboard de Looker Studio, Grid de Tiempos Muertos y exportación ERP</p>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          {/* BOTÓN PROTAGONICO DESTACADO PARA EL SUPERVISOR */}
          <button 
            className="btn-grid-hero" 
            onClick={openGridModal}
            id="btn-bajar-grid"
          >
            <FileSpreadsheet size={16} />
            <span>Bajar Grid de Registros</span>
          </button>

          {/* BOTONES SECUNDARIOS Y DISCRETOS (MENOS LLAMATIVOS) */}
          <button 
            className="btn-subtle" 
            onClick={exportToSheets} 
            disabled={isExporting}
            title="Sincronizar base de datos completa con Google Sheets"
          >
            <Database size={13} />
            <span>{isExporting ? "Sincronizando..." : "Exportar a Google Sheets"}</span>
          </button>
          
          <button 
            className="btn-subtle" 
            onClick={downloadCsv}
            title="Descargar archivo CSV plano para el ERP COAMA"
          >
            <Download size={13} />
            <span>Exportar CSV ERP</span>
          </button>
        </div>
      </div>

      <div className="clean-card" style={{ height: "75vh", minHeight: "680px", padding: 0, overflow: "hidden", border: "1px solid var(--border-subtle)" }}>
        <iframe
          title="Looker Studio"
          src="https://datastudio.google.com/embed/reporting/1006faa4-11e5-4ced-985f-343126bf6d51/page/p_z2r3vgy76d"
          width="100%"
          height="100%"
          style={{ border: 0 }}
          allowFullScreen
        />
      </div>

      {/* MODAL PARA BAJAR GRID DE REGISTROS CON FILTROS */}
      {isGridModalOpen && (
        <div style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: "rgba(0, 0, 0, 0.82)",
          backdropFilter: "blur(6px)",
          display: "grid",
          placeItems: "center",
          zIndex: 1000,
          padding: "20px"
        }}>
          <div className="clean-card" style={{
            width: "100%",
            maxWidth: "520px",
            border: "1px solid rgba(250, 204, 21, 0.35)",
            boxShadow: "0 24px 60px rgba(0, 0, 0, 0.9), 0 0 30px rgba(250, 204, 21, 0.08)",
            padding: "28px",
            borderRadius: "4px",
            position: "relative"
          }}>
            {/* Header Modal */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "20px" }}>
              <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
                <div style={{
                  width: "40px",
                  height: "40px",
                  borderRadius: "4px",
                  background: "rgba(250, 204, 21, 0.12)",
                  border: "1px solid var(--brand-lumo)",
                  display: "grid",
                  placeItems: "center",
                  color: "var(--brand-lumo)"
                }}>
                  <FileSpreadsheet size={20} />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: "17px", fontWeight: "800", color: "#ffffff" }}>
                    Bajar Grid de Registros
                  </h3>
                  <p style={{ margin: "3px 0 0", fontSize: "12px", color: "var(--text-muted)" }}>
                    Descarga consolidada en Excel (.xlsx) desde Google Sheets
                  </p>
                </div>
              </div>
              <button 
                onClick={() => setIsGridModalOpen(false)}
                style={{
                  background: "transparent",
                  border: "none",
                  color: "var(--text-dim)",
                  padding: "4px",
                  cursor: "pointer",
                  display: "grid",
                  placeItems: "center"
                }}
              >
                <X size={18} />
              </button>
            </div>

            {/* Presets de fechas */}
            <div style={{ marginBottom: "16px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                <label style={{ fontSize: "11px", fontWeight: "700", textTransform: "uppercase", letterSpacing: "0.5px", color: "var(--text-dim)", display: "flex", alignItems: "center", gap: "5px" }}>
                  <Calendar size={12} color="var(--brand-lumo)" /> Rango de Fechas
                </label>
                <span style={{ fontSize: "10.5px", color: "var(--text-dim)" }}>Accesos rápidos:</span>
              </div>
              
              <div style={{ display: "flex", flexWrap: "wrap", gap: "6px", marginBottom: "12px" }}>
                <button 
                  type="button" 
                  className={`preset-btn ${activePreset === "today" ? "active" : ""}`}
                  onClick={() => applyDatePreset("today")}
                >
                  Hoy
                </button>
                <button 
                  type="button" 
                  className={`preset-btn ${activePreset === "yesterday" ? "active" : ""}`}
                  onClick={() => applyDatePreset("yesterday")}
                >
                  Ayer
                </button>
                <button 
                  type="button" 
                  className={`preset-btn ${activePreset === "last7" ? "active" : ""}`}
                  onClick={() => applyDatePreset("last7")}
                >
                  Últimos 7 días
                </button>
                <button 
                  type="button" 
                  className={`preset-btn ${activePreset === "month" ? "active" : ""}`}
                  onClick={() => applyDatePreset("month")}
                >
                  Mes actual
                </button>
                <button 
                  type="button" 
                  className={`preset-btn ${activePreset === "all" ? "active" : ""}`}
                  onClick={() => applyDatePreset("all")}
                >
                  Todo el historial
                </button>
              </div>

              {/* Selectores de fecha Desde / Hasta */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                <div>
                  <span style={{ display: "block", fontSize: "11px", color: "var(--text-muted)", marginBottom: "4px" }}>
                    Fecha Desde
                  </span>
                  <input
                    type="date"
                    value={fechaInicio}
                    onChange={e => {
                      setFechaInicio(e.target.value);
                      setActivePreset("custom");
                    }}
                    style={{
                      width: "100%",
                      padding: "9px 12px",
                      borderRadius: "3px",
                      background: "var(--bg-input)",
                      border: "1px solid var(--border-subtle)",
                      color: "#ffffff",
                      fontSize: "13px",
                      fontFamily: "var(--font-mono)",
                      outline: "none"
                    }}
                  />
                </div>
                <div>
                  <span style={{ display: "block", fontSize: "11px", color: "var(--text-muted)", marginBottom: "4px" }}>
                    Fecha Hasta
                  </span>
                  <input
                    type="date"
                    value={fechaFin}
                    onChange={e => {
                      setFechaFin(e.target.value);
                      setActivePreset("custom");
                    }}
                    style={{
                      width: "100%",
                      padding: "9px 12px",
                      borderRadius: "3px",
                      background: "var(--bg-input)",
                      border: "1px solid var(--border-subtle)",
                      color: "#ffffff",
                      fontSize: "13px",
                      fontFamily: "var(--font-mono)",
                      outline: "none"
                    }}
                  />
                </div>
              </div>
            </div>

            {/* Filtro de Líneas / Secaderos */}
            <div style={{ marginBottom: "22px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                <label style={{ fontSize: "11px", fontWeight: "700", textTransform: "uppercase", letterSpacing: "0.5px", color: "var(--text-dim)", display: "flex", alignItems: "center", gap: "5px" }}>
                  <Layers size={12} color="var(--brand-lumo)" /> Líneas / Secaderos en Google Sheets
                </label>
                <button
                  type="button"
                  onClick={toggleAllLineas}
                  style={{
                    background: "transparent",
                    border: "none",
                    color: "var(--brand-lumo)",
                    fontSize: "11px",
                    cursor: "pointer",
                    textDecoration: "underline",
                    padding: 0
                  }}
                >
                  {selectedLineas.length === gridOptions.lines.length ? "Deseleccionar todas" : "Seleccionar todas"}
                </button>
              </div>

              <div className="chip-group">
                {gridOptions.lines.map(line => {
                  const isSelected = selectedLineas.includes(line);
                  return (
                    <button
                      key={line}
                      type="button"
                      className={`filter-chip ${isSelected ? "active" : ""}`}
                      onClick={() => toggleLinea(line)}
                    >
                      {isSelected ? <Check size={13} /> : null}
                      <span>{line}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Tarjeta de Resumen / Info */}
            <div style={{
              background: "rgba(255, 255, 255, 0.02)",
              border: "1px solid var(--border-subtle)",
              borderRadius: "3px",
              padding: "12px 14px",
              marginBottom: "24px",
              fontSize: "12px",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center"
            }}>
              <div>
                <span style={{ color: "var(--text-dim)", display: "block", fontSize: "10.5px", textTransform: "uppercase" }}>
                  Estructura del archivo
                </span>
                <strong style={{ color: "var(--text-main)", fontSize: "12px" }}>
                  13 Columnas con formato numérico nativo
                </strong>
              </div>
              <div style={{ textAlign: "right" }}>
                <span style={{ color: "var(--text-dim)", display: "block", fontSize: "10.5px", textTransform: "uppercase" }}>
                  Total en Google Sheets
                </span>
                <strong style={{ color: "var(--brand-lumo)", fontFamily: "var(--font-mono)" }}>
                  {isLoadingOptions ? "Consultando..." : `${gridOptions.totalRows} registros`}
                </strong>
              </div>
            </div>

            {/* Acciones del Modal */}
            <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px" }}>
              <button
                type="button"
                className="btn-secondary"
                onClick={() => setIsGridModalOpen(false)}
                disabled={isDownloading}
              >
                Cancelar
              </button>
              <button
                type="button"
                className="btn-grid-hero"
                onClick={handleDownloadGrid}
                disabled={isDownloading || selectedLineas.length === 0}
                style={{ flex: 1 }}
              >
                {isDownloading ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    <span>Generando Grid...</span>
                  </>
                ) : (
                  <>
                    <Download size={16} />
                    <span>Descargar Excel (.xlsx)</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
