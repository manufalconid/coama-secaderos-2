import React from "react";
import TouchButton from "../TouchButton";
import { ArrowLeft, ArrowRight, MapPin } from "lucide-react";

interface UbicacionSecaderoStageProps {
  isPerfilCompleto: boolean;
  isPerfilNiveles: boolean;
  isUbicacionObligatoria: boolean;
  formUbicacion: string;
  setFormUbicacion: (ub: string) => void;
  onBack: () => void;
  onNext: () => void;
}

export default function UbicacionSecaderoStage({
  isPerfilCompleto,
  isPerfilNiveles,
  isUbicacionObligatoria,
  formUbicacion,
  setFormUbicacion,
  onBack,
  onNext
}: UbicacionSecaderoStageProps) {
  const isNextDisabled = isUbicacionObligatoria && !formUbicacion;

  const handleSelectZone = (zoneVal: string) => {
    setFormUbicacion(zoneVal);
  };

  return (
    <div className="stage-container">
      <div className="stage-title-block">
        <h2 className="stage-title">Ubicación en el Secadero</h2>
        <p className="stage-subtitle">
          {isPerfilNiveles
            ? "Selecciona el Nivel afectado en el secadero"
            : "Selecciona el punto específico de la falla en el mapa del secadero"}
        </p>
      </div>

      <div style={{ width: "100%", maxWidth: "900px" }}>
        {isUbicacionObligatoria && !formUbicacion && (
          <div
            style={{
              padding: "10px 16px",
              marginBottom: "16px",
              borderRadius: "4px",
              background: "rgba(239, 68, 68, 0.15)",
              border: "1px solid var(--state-alert)",
              color: "#f87171",
              fontSize: "13px",
              fontWeight: "bold",
              textAlign: "center"
            }}
          >
            ⚠️ Debe seleccionar una ubicación en el secadero para continuar *
          </div>
        )}

        {/* MODO 1: SOLO NIVELES (6 Rectángulos Largos) */}
        {isPerfilNiveles && !isPerfilCompleto ? (
          <div className="niveles-profile-wrapper" style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            {[6, 5, 4, 3, 2, 1].map(lvl => {
              const val = `NIVEL ${lvl}`;
              const isSelected = formUbicacion === val;
              return (
                <TouchButton
                  key={lvl}
                  onConfirm={() => handleSelectZone(val)}
                  confirmText="TOCA PARA SELECCIONAR NIVEL"
                  className={`nivel-long-card ${isSelected ? "selected" : ""}`}
                  style={{
                    padding: "20px",
                    borderRadius: "6px",
                    fontSize: "18px",
                    fontWeight: "bold",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    border: isSelected ? "3px solid var(--brand-lumo-gold)" : "1px solid var(--border-subtle)",
                    background: isSelected ? "rgba(250, 204, 21, 0.25)" : "var(--bg-input)",
                    color: isSelected ? "#fff" : "var(--text-muted)",
                    cursor: "pointer"
                  }}
                >
                  <span style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                    <MapPin size={22} color={isSelected ? "var(--brand-lumo-gold)" : "var(--text-dim)"} />
                    NIVEL {lvl}
                  </span>
                  <span style={{ fontSize: "13px", color: isSelected ? "var(--brand-lumo-gold)" : "var(--text-dim)" }}>
                    {isSelected ? "SELECCIONADO ✓" : "Tocar para marcar"}
                  </span>
                </TouchButton>
              );
            })}
          </div>
        ) : (
          /* MODO 2: PERFIL COMPLETO (M. Entrada + Cargador + Matriz N1-N6 x P1-P13 + M. Salida + Cinta Transportadora) */
          <div className="secadero-full-profile-wrapper" style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            <div className="secadero-overlay-layout" style={{ background: "var(--bg-card)", padding: "16px", borderRadius: "8px", border: "1px solid var(--border-subtle)" }}>
              
              {/* Bloque Izquierda: Mesa de Entrada & Cargador */}
              <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                <TouchButton
                  onConfirm={() => handleSelectZone("MESA DE ENTRADA")}
                  confirmText="SELECCIONAR"
                  className={`secadero-zone-btn ${formUbicacion === "MESA DE ENTRADA" ? "selected" : ""}`}
                  style={{
                    height: "110px",
                    padding: "8px",
                    fontSize: "13px",
                    fontWeight: "bold",
                    borderRadius: "4px",
                    background: formUbicacion === "MESA DE ENTRADA" ? "rgba(250, 204, 21, 0.25)" : "var(--bg-input)",
                    border: formUbicacion === "MESA DE ENTRADA" ? "2px solid var(--brand-lumo-gold)" : "1px solid var(--border-subtle)"
                  }}
                >
                  M. ENTRADA
                </TouchButton>

                <TouchButton
                  onConfirm={() => handleSelectZone("CARGADOR")}
                  confirmText="SELECCIONAR"
                  className={`secadero-zone-btn ${formUbicacion === "CARGADOR" ? "selected" : ""}`}
                  style={{
                    height: "110px",
                    padding: "8px",
                    fontSize: "13px",
                    fontWeight: "bold",
                    borderRadius: "4px",
                    background: formUbicacion === "CARGADOR" ? "rgba(250, 204, 21, 0.25)" : "var(--bg-input)",
                    border: formUbicacion === "CARGADOR" ? "2px solid var(--brand-lumo-gold)" : "1px solid var(--border-subtle)"
                  }}
                >
                  CARGADOR
                </TouchButton>
              </div>

              {/* Matriz Central: N1-N6 x P1-P13 */}
              <div style={{ display: "flex", flexDirection: "column", flex: 1, margin: "0 10px" }}>
                <div className="secadero-grid-wrapper">
                  <div className="secadero-row-labels">
                    {[6, 5, 4, 3, 2, 1].map(lvl => (
                      <span key={lvl} className="secadero-row-label">N{lvl}</span>
                    ))}
                  </div>

                  <div className="secadero-grid-container">
                    {[6, 5, 4, 3, 2, 1].map(lvl => {
                      return Array.from({ length: 13 }, (_, i) => i + 1).map(door => {
                        const val = `N${lvl}P${door}`;
                        const isSelected = formUbicacion === val;
                        return (
                          <TouchButton
                            key={`${lvl}-${door}`}
                            onConfirm={() => handleSelectZone(val)}
                            confirmText="✓"
                            className={`secadero-cell ${isSelected ? "selected" : ""}`}
                            style={{
                              padding: 0,
                              background: isSelected ? "var(--brand-lumo-gold)" : "rgba(255, 255, 255, 0.05)",
                              borderColor: isSelected ? "#fff" : "rgba(255, 255, 255, 0.1)"
                            }}
                            title={val}
                          >
                            <span style={{ fontSize: "10px", display: isSelected ? "block" : "none" }}>✓</span>
                          </TouchButton>
                        );
                      });
                    })}
                  </div>

                  <div className="secadero-row-labels">
                    {[6, 5, 4, 3, 2, 1].map(lvl => (
                      <span key={lvl} className="secadero-row-label">N{lvl}</span>
                    ))}
                  </div>
                </div>

                <div className="secadero-col-labels">
                  {Array.from({ length: 13 }, (_, i) => i + 1).map(door => (
                    <span key={door} className="secadero-col-label">{door}</span>
                  ))}
                </div>
              </div>

              {/* Bloque Derecha: Mesa de Salida */}
              <div style={{ display: "flex", flexDirection: "column" }}>
                <TouchButton
                  onConfirm={() => handleSelectZone("MESA DE SALIDA")}
                  confirmText="SELECCIONAR"
                  className={`secadero-zone-btn ${formUbicacion === "MESA DE SALIDA" ? "selected" : ""}`}
                  style={{
                    height: "230px",
                    padding: "8px",
                    fontSize: "13px",
                    fontWeight: "bold",
                    borderRadius: "4px",
                    background: formUbicacion === "MESA DE SALIDA" ? "rgba(250, 204, 21, 0.25)" : "var(--bg-input)",
                    border: formUbicacion === "MESA DE SALIDA" ? "2px solid var(--brand-lumo-gold)" : "1px solid var(--border-subtle)"
                  }}
                >
                  M. SALIDA
                </TouchButton>
              </div>
            </div>

            {/* BOTÓN DESTACADO PARA CINTA TRANSPORTADORA EN LA PARTE INFERIOR */}
            <div style={{ marginTop: "4px" }}>
              <TouchButton
                onConfirm={() => handleSelectZone("CINTA TRANSPORTADORA")}
                confirmText="CONFIRMAR SELECCIÓN DE CINTA"
                className={`cinta-transportadora-btn ${formUbicacion === "CINTA TRANSPORTADORA" ? "selected" : ""}`}
                style={{
                  width: "100%",
                  padding: "16px",
                  fontSize: "16px",
                  fontWeight: "bold",
                  borderRadius: "6px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "10px",
                  border: formUbicacion === "CINTA TRANSPORTADORA" ? "3px solid var(--brand-lumo-gold)" : "1px dashed var(--brand-lumo-gold)",
                  background: formUbicacion === "CINTA TRANSPORTADORA" ? "rgba(250, 204, 21, 0.3)" : "rgba(250, 204, 21, 0.05)",
                  color: formUbicacion === "CINTA TRANSPORTADORA" ? "#fff" : "var(--brand-lumo-gold)",
                  cursor: "pointer"
                }}
              >
                <MapPin size={20} />
                CINTA TRANSPORTADORA
                {formUbicacion === "CINTA TRANSPORTADORA" && " (SELECCIONADA ✓)"}
              </TouchButton>
            </div>
          </div>
        )}

        {/* Muestra la ubicación actualmente elegida */}
        {formUbicacion && (
          <div
            style={{
              marginTop: "16px",
              padding: "12px 16px",
              borderRadius: "4px",
              background: "rgba(250, 204, 21, 0.1)",
              border: "1px solid var(--brand-lumo-gold)",
              color: "#fff",
              fontSize: "14px",
              textAlign: "center"
            }}
          >
            Ubicación Seleccionada: <strong style={{ color: "var(--brand-lumo-gold)", textTransform: "uppercase" }}>{formUbicacion}</strong>
          </div>
        )}

        {/* Botones de Navegación */}
        <div className="action-footer-fixed" style={{ marginTop: "24px", display: "flex", justifyContent: "space-between", gap: "16px" }}>
          <TouchButton
            onConfirm={onBack}
            confirmText="CONFIRMAR VOLVER"
            className="btn-control secondary"
            style={{ width: "160px" }}
          >
            <ArrowLeft size={18} /> Volver
          </TouchButton>

          <TouchButton
            onConfirm={onNext}
            confirmText="CONFIRMAR SIGUIENTE"
            disabled={isNextDisabled}
            className="btn-control primary"
            style={{
              flex: 1,
              maxWidth: "320px",
              opacity: isNextDisabled ? 0.5 : 1,
              cursor: isNextDisabled ? "not-allowed" : "pointer"
            }}
          >
            Siguiente <ArrowRight size={18} />
          </TouchButton>
        </div>
      </div>
    </div>
  );
}
