import React, { useMemo } from "react";
import { CheckCircle2, MessageSquare, Tag, MapPin, Tablet } from "lucide-react";

export default function ValidacionesView({ proposals = [], onReview }) {
  const uniqueProposals = useMemo(() => {
    const map = new Map();
    for (const p of proposals) {
      const key = `${(p.tipo || "razon").toLowerCase()}:${(p.texto || p.razon_manual || "").trim().toLowerCase()}`;
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
          <h1>Centro de Validaciones y Homologación</h1>
          <p>Revisión detallada de sugerencias y motivos de parada ingresados libremente por operarios en tablets</p>
        </div>
      </div>

      <div className="clean-card">
        <h3 style={{ margin: "0 0 16px 0", fontSize: "15px", fontWeight: "700" }}>
          Sugerencias de Operarios Pendientes ({uniqueProposals.length})
        </h3>

        {uniqueProposals.length === 0 ? (
          <div style={{ textAlign: "center", padding: "40px 20px", color: "var(--text-dim)" }}>
            <CheckCircle2 size={36} color="var(--accent-emerald)" style={{ marginBottom: "8px" }} />
            <div style={{ fontSize: "14px", fontWeight: "700", color: "#fff" }}>¡Excelente! No hay sugerencias pendientes</div>
            <p style={{ fontSize: "12.5px", marginTop: "4px", color: "var(--text-muted)" }}>Todas las razones y categorías manuales propuestas por los operarios en tablets han sido revisadas.</p>
          </div>
        ) : (
          <div style={{ display: "grid", gap: "14px" }}>
            {uniqueProposals.map(p => {
              const razonText = p.texto || p.razon_manual || "Sugerencia sin nombre";
              const categoriaText = (p.categoria_tm || p.origen_manual || p.tipo || "OPERATIVO").toUpperCase();
              const secaderoText = (p.linea || p.secadero_id || "Secadero General").toUpperCase();
              const obsText = p.observacion || p.observaciones || null;
              const ubicacionText = p.ubicacion || null;
              const eventoId = p.evento_id || null;

              return (
                <div
                  key={p.propuesta_id || Math.random()}
                  style={{
                    background: "rgba(255, 255, 255, 0.02)",
                    border: "1px solid var(--border-subtle)",
                    borderRadius: "4px",
                    padding: "16px",
                    display: "grid",
                    gridTemplateColumns: "1fr 160px",
                    gap: "16px",
                    alignItems: "center"
                  }}
                >
                  <div style={{ display: "grid", gap: "8px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
                      <span className="mono" style={{ background: "rgba(250, 204, 21, 0.12)", color: "var(--brand-lumo-gold)", border: "1px solid rgba(250, 204, 21, 0.3)", padding: "2px 8px", borderRadius: "3px", fontSize: "11px", fontWeight: "700" }}>
                        {secaderoText}
                      </span>
                      <span className="state-tag parado" style={{ fontSize: "10.5px" }}>
                        <Tag size={10} style={{ marginRight: "4px" }} /> {categoriaText}
                      </span>
                      {ubicacionText && (
                        <span style={{ fontSize: "11px", color: "var(--brand-lumo)", display: "inline-flex", alignItems: "center", gap: "2px" }}>
                          <MapPin size={11} /> {ubicacionText}
                        </span>
                      )}
                      {eventoId && (
                        <span className="mono" style={{ fontSize: "10.5px", color: "var(--text-dim)" }}>
                          Evento ID: <code>{eventoId.slice(0, 8)}</code>
                        </span>
                      )}
                    </div>

                    <div>
                      <strong style={{ fontSize: "15px", color: "#fff", display: "block" }}>
                        "{razonText}"
                      </strong>
                    </div>

                    {obsText ? (
                      <div style={{ fontSize: "12px", background: "rgba(0,0,0,0.3)", padding: "8px 12px", borderRadius: "3px", borderLeft: "3px solid var(--brand-lumo-gold)", color: "var(--text-muted)", display: "flex", gap: "6px", alignItems: "flex-start" }}>
                        <MessageSquare size={13} style={{ marginTop: "2px", flexShrink: 0, color: "var(--brand-lumo-gold)" }} />
                        <span><strong>Observación del Operario:</strong> {obsText}</span>
                      </div>
                    ) : (
                      <div style={{ fontSize: "11.5px", color: "var(--text-dim)", fontStyle: "italic" }}>
                        Sin observaciones adicionales registradas.
                      </div>
                    )}
                  </div>

                  <div style={{ textAlign: "right" }}>
                    <button
                      className="btn-primary"
                      style={{
                        width: "100%",
                        minHeight: "36px",
                        padding: "0 16px",
                        fontSize: "12px",
                        background: "var(--brand-lumo-gold)",
                        color: "#000",
                        fontWeight: "700",
                        borderRadius: "4px"
                      }}
                      onClick={() => onReview(p, "rechazada")}
                    >
                      ✓ Marcar Homologado / Revisado
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </>
  );
}

