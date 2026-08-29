import React, { useState } from "react";
import { Download, Database } from "lucide-react";

export default function AnalisisView({ eventos, masterData, showToast }) {
  const [isExporting, setIsExporting] = useState(false);

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
      "tiempo_de_descanso",
      "tiempo_de_turno_en_horas_programadas",
      "categoria",
      "tiempo_muerto",
      "observacion",
      "ubicacion",
      "tiempo_muerto_hora_desde",
      "tiempo_muerto_hora_hasta",
      "tiempo_muerto_en_horas",
      "tiempo_muerto_en_minutos"
    ].join(delimiter) + "\n";

    const body = eventos.map(e => {
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
      const cantDescanso = shiftObj ? Number(shiftObj.horas_descanso) : 1.00;
      const cantHoras = shiftObj ? Number(shiftObj.horas_totales) : 12.00;
      const tiempoTurnoProgramado = cantHoras - cantDescanso;

      const secObj = masterData.secaderos ? masterData.secaderos.find(s => s.secadero_id === e.secadero_id) : null;
      let lineaNombre = e.linea || (secObj ? secObj.nombre : e.secadero_id || "");
      if (lineaNombre) {
        lineaNombre = lineaNombre.replace("Secadero ", "").toUpperCase();
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
      }
      if (!catNombre) catNombre = "PROBLEMAS OPERATIVOS";

      const razonObj = masterData.razones.find(r => r.razon_id === e.razon_id);
      const tiempoMuertoNombre = razonObj ? razonObj.nombre : (e.razon_manual || e.causa || "PARADA");

      const obsText = e.observacion || e.observaciones || "";
      const observacionVal = obsText.replace(/\[Sugerido\].*?\.\s*/, "").trim();
      const ubicacionVal = e.ubicacion || "";

      const durSeconds = e.duracion_segundos || e.tiempo_parada || 0;
      const durMinutes = (durSeconds / 60).toFixed(1);
      const durHours = (durSeconds / 3600).toFixed(2);

      const cantDescansoStr = String(cantDescanso).replace(".", ",");
      const tiempoTurnoProgramadoStr = String(tiempoTurnoProgramado).replace(".", ",");
      const durHoursStr = String(durHours).replace(".", ",");
      const durMinutesStr = String(durMinutes).replace(".", ",");

      const row = [
        fechaFormatted,
        lineaNombre,
        horaInicioTurno,
        horaFinTurno,
        cantDescansoStr,
        tiempoTurnoProgramadoStr,
        catNombre.toUpperCase(),
        tiempoMuertoNombre.toUpperCase(),
        observacionVal ? observacionVal.toUpperCase() : "-.-",
        ubicacionVal ? ubicacionVal.toUpperCase() : "",
        horaDesde,
        horaHasta,
        durHoursStr,
        durMinutesStr
      ];

      return row.map(val => {
        const str = String(val).replace(/;/g, ",").replace(/\r?\n/g, " ");
        if (str.includes('"')) {
          return `"${str.replace(/"/g, '""')}"`;
        }
        return str;
      }).join(delimiter);
    }).filter(Boolean).join("\n");

    const blob = new Blob([header + body], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `COAMA_Exportacion_ERP.csv`;
    link.click();
    showToast("CSV descargado para ERP COAMA.");
  }

  return (
    <>
      <div className="main-header">
        <div>
          <h1>Análisis BI & Exportación ERP</h1>
          <p>Dashboard de Looker Studio e integración con ERP COAMA</p>
        </div>
        <div style={{ display: "flex", gap: "10px" }}>
          <button className="btn-secondary" onClick={exportToSheets} disabled={isExporting}>
            {isExporting ? "Sincronizando..." : "Exportar a Google Sheets"} <Database size={14} />
          </button>
          <button className="btn-primary" onClick={downloadCsv}>
            Descargar CSV ERP <Download size={14} />
          </button>
        </div>
      </div>

      <div className="clean-card" style={{ height: "75vh", minHeight: "680px", padding: 0, overflow: "hidden", border: "1px solid var(--border-subtle)" }}>
        <iframe
          title="Looker Studio"
          src="https://datastudio.google.com/embed/reporting/a16c3288-f5cd-42ca-967f-a385c9df0fc6/page/p_ymxhovxmyd"
          width="100%"
          height="100%"
          style={{ border: 0 }}
          allowFullScreen
        />
      </div>
    </>
  );
}
