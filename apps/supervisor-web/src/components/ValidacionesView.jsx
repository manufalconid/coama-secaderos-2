import React, { useMemo } from "react";

export default function ValidacionesView({ proposals, onReview }) {
  const uniqueProposals = useMemo(() => {
    const map = new Map();
    for (const p of proposals) {
      const key = `${(p.tipo || "razon").toLowerCase()}:${(p.texto || "").trim().toLowerCase()}`;
      if (!map.has(key)) {
        map.set(key, p);
      }
    }
    return Array.from(map.values());
  }, [proposals]);

  return (
    <>
      <div className="main-header">
        <div>
          <h1>Centro de Validaciones</h1>
          <p>Propuestas manuales de operarios pendientes de revisión y homologación</p>
        </div>
      </div>

      <div className="clean-card">
        <table className="clean-table">
          <thead>
            <tr>
              <th>Propuesta Operario</th>
              <th style={{ width: "100px" }}>Tipo</th>
              <th style={{ width: "120px" }}>ID Evento</th>
              <th style={{ width: "120px", textAlign: "right" }}>Acción</th>
            </tr>
          </thead>
          <tbody>
            {uniqueProposals.length === 0 ? (
              <tr><td colSpan={4} style={{ textAlign: "center", padding: "24px", color: "var(--text-dim)" }}>No hay propuestas pendientes de homologación.</td></tr>
            ) : (
              uniqueProposals.map(p => (
                <tr key={p.propuesta_id}>
                  <td><strong>{p.texto}</strong></td>
                  <td><span className="state-tag parado">{(p.tipo || "RAZON").toUpperCase()}</span></td>
                  <td className="mono">{p.evento_id ? p.evento_id.slice(0, 8) : "--"}</td>
                  <td style={{ textAlign: "right" }}>
                    <button
                      className="btn-primary"
                      style={{ minHeight: "28px", padding: "0 14px", fontSize: "11px", background: "var(--brand-lumo-gold)", color: "#000", fontWeight: "700" }}
                      onClick={() => onReview(p, "rechazada")}
                    >
                      ✓ REVISADO
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
