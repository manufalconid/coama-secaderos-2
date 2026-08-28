import React from "react";
import { Download } from "lucide-react";

export default function AnalisisView({ eventos, masterData, showToast }) {
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
      "Fecha",
      "Hora",
      "Turno",
      "Lin",
      "Horadesde",
      "Horahasta",
      "Categoria",
      "Tiempo Muer",
      "Observacion",
      "Tiempo total sum",
      "Tiempo en hor",
      "Cant Hor",
      "Cant. Horas descan",
      "Factor de U"
    ].join(delimiter) + "\n";

    const body = eventos.map(e => {
      const start = e.fecha_hora_inicio || e.inicio || "";
      const end = e.fecha_hora_fin || e.fin || "";
      if (!start) return "";

      const startDateObj = new Date(start);
      
      const day = String(startDateObj.getDate()).padStart(2, "0");
      const month = String(startDateObj.getMonth() + 1).padStart(2, "0");
      const year = startDateObj.getFullYear();
      const fechaFormatted = `${day}/${month}/${year}`;

      const horaDefault = "00:00:00";

      let shiftObj = null;
      if (e.turno_id && masterData.turnos) {
        shiftObj = masterData.turnos.find(t => t.turno_id === e.turno_id);
      }
      if (!shiftObj) {
        shiftObj = getTurnoForTime(start, masterData.turnos);
      }
      const turnoNombre = shiftObj ? shiftObj.nombre : "T1 06 hs - 18 hs";
      const cantHoras = shiftObj ? shiftObj.horas_totales : 12.00;
      const cantDescanso = shiftObj ? shiftObj.horas_descanso : 0.00;

      const secObj = masterData.secaderos ? masterData.secaderos.find(s => s.secadero_id === e.secadero_id) : null;
      const lineaNombre = e.linea || (secObj ? secObj.nombre : (e.secadero_id === "sec-omeco" ? "OMECO" : (e.secadero_id === "sec-benecke" ? "BENECKE" : (e.secadero_id === "sec-raute" ? "RAUTE" : e.secadero_id || "BENECKE"))));

      const horaDesde = startDateObj.toTimeString().slice(0, 8);
      const horaHasta = end ? new Date(end).toTimeString().slice(0, 8) : "";

      let catNombre = "";
      if (Array.isArray(e.origenes) && e.origenes.length > 0) {
        const firstOrigId = e.origenes[0].origen_id;
        const origObj = masterData.origenes.find(o => o.origen_id === firstOrigId);
        catNombre = origObj ? origObj.nombre : (e.origenes[0].origen_manual || firstOrigId);
      } else if (e.origen) {
        catNombre = e.origen;
      }
      if (!catNombre) catNombre = "PROBLEMAS OPERATIVOS";

      const razonObj = masterData.razones.find(r => r.razon_id === e.razon_id);
      const tiempoMuertoNombre = razonObj ? razonObj.nombre : (e.razon_manual || e.causa || "PARADA");

      const obsText = e.observacion ? e.observacion.replace(/\[Sugerido\].*?\.\s*/, "") : "";
      const observacionVal = obsText.trim() ? obsText.trim() : "-.-";

      const durSeconds = e.duracion_segundos || 0;
      const durMinutes = Math.round(durSeconds / 60);
      const durHours = Number((durMinutes / 60).toFixed(2));

      const divisor = cantHoras - cantDescanso;
      const factorU = divisor > 0 
        ? Number((((divisor - durHours) / divisor) * 100).toFixed(2)) 
        : 100.00;

      const durHoursStr = String(durHours).replace(".", ",");
      const cantHorasStr = String(cantHoras).replace(".", ",");
      const cantDescansoStr = String(cantDescanso).replace(".", ",");
      const factorUStr = String(factorU).replace(".", ",");

      return [
        fechaFormatted,
        horaDefault,
        turnoNombre,
        lineaNombre,
        horaDesde,
        horaHasta,
        catNombre.toUpperCase(),
        tiempoMuertoNombre.toUpperCase(),
        observacionVal.toUpperCase(),
        durMinutes,
        durHoursStr,
        cantHorasStr,
        cantDescansoStr,
        factorUStr
      ].join(delimiter);
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
        <button className="btn-primary" onClick={downloadCsv}>
          Descargar CSV ERP <Download size={14} />
        </button>
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
