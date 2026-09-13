import React, { useState } from "react";
import TouchButton from "../TouchButton";
import { ArrowLeft, ArrowRight, MapPin, ListFilter, Cpu, Wrench, Grid } from "lucide-react";

interface UbicacionSecaderoStageProps {
  selectedReasonObj?: any;
  isPerfilCompleto: boolean;
  isPerfilNiveles: boolean;
  isUbicacionObligatoria: boolean;
  formUbicacion: string;
  setFormUbicacion: (ub: string) => void;
  onBack: () => void;
  onNext: () => void;
}

export default function UbicacionSecaderoStage({
  selectedReasonObj,
  isPerfilCompleto,
  isPerfilNiveles,
  isUbicacionObligatoria,
  formUbicacion,
  setFormUbicacion,
  onBack,
  onNext
}: UbicacionSecaderoStageProps) {
  const isNextDisabled = isUbicacionObligatoria && !formUbicacion;
  const [customInput, setCustomInput] = useState("");

  const handleSelectZone = (zoneVal: string) => {
    setFormUbicacion(zoneVal);
  };

  // Determine active view mode based on selectedReasonObj properties
  const isUbicacionLista = !!(selectedReasonObj?.ubicacion_lista && selectedReasonObj.ubicacion_lista.trim());
  const isVistaElectricos = !!selectedReasonObj?.vista_electricos;
  const isVistaMecanicosRodillos = !!selectedReasonObj?.vista_mecanicos_rodillos;
  const isVistaMecanicos = !!selectedReasonObj?.vista_mecanicos && !isVistaMecanicosRodillos;
  const isMatrizExtendida = !!selectedReasonObj?.matriz_extendida;
  const isMatrizOnly = !!selectedReasonObj?.matriz;

  // Options list for UBICACION LISTA
  const listaOptions = isUbicacionLista
    ? selectedReasonObj.ubicacion_lista.split(",").map((s: string) => s.trim()).filter(Boolean)
    : [];

  return (
    <div className="landscape-stage-wrapper">
      {/* AREA PRINCIPAL (IZQUIERDA / CENTRO) */}
      <div className="stage-main-area">
        {/* ENCABEZADO ULTRA-COMPACTO */}
        <div className="compact-stage-header">
          <div className="compact-stage-title">
            <span>UBICACION</span>
            {isUbicacionObligatoria ? (
              <span className="required-asterisk">*</span>
            ) : (
              <span className="optional-badge">(Opcional)</span>
            )}
          </div>
          <span style={{ fontSize: "12px", color: "var(--text-muted)", fontWeight: "600" }}>
            Paso 3 de 4 • Selecciona el punto o zona afectada
          </span>
        </div>

        <div style={{ flex: 1, overflowY: "auto", paddingRight: "4px" }}>
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

        {/* ------------------------------------------------------------- */}
        {/* VISTA 1: UBICACION LISTA (Dropdown / Lista Touch) */}
        {/* ------------------------------------------------------------- */}
        {isUbicacionLista ? (
          <div style={{ display: "flex", flexDirection: "column", gap: "16px", background: "var(--bg-card)", padding: "20px", borderRadius: "8px", border: "1px solid var(--border-subtle)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "10px", color: "var(--brand-lumo-gold)", fontSize: "16px", fontWeight: "bold" }}>
              <ListFilter size={20} /> Lista de Ubicaciones Disponibles:
            </div>
            
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: "12px" }}>
              {listaOptions.map((opt: string, idx: number) => {
                const isSelected = formUbicacion.toUpperCase() === opt.toUpperCase();
                return (
                  <TouchButton
                    key={idx}
                    onConfirm={() => handleSelectZone(opt.toUpperCase())}
                    confirmText="SELECCIONAR"
                    className={`nivel-long-card ${isSelected ? "selected" : ""}`}
                    style={{
                      padding: "16px",
                      borderRadius: "6px",
                      fontSize: "16px",
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
                    <span>{opt}</span>
                    {isSelected && <span style={{ color: "var(--brand-lumo-gold)" }}>✓</span>}
                  </TouchButton>
                );
              })}
            </div>

            {/* Custom fallback input */}
            <div style={{ marginTop: "12px", borderTop: "1px solid var(--border-subtle)", paddingTop: "12px" }}>
              <label style={{ fontSize: "13px", color: "var(--text-dim)", display: "block", marginBottom: "6px" }}>
                O escribe otra ubicación personalizada:
              </label>
              <div style={{ display: "flex", gap: "10px" }}>
                <input
                  type="text"
                  placeholder="Ej. Entrada posterior..."
                  value={customInput}
                  onChange={e => setCustomInput(e.target.value)}
                  style={{
                    flex: 1,
                    padding: "12px",
                    borderRadius: "6px",
                    background: "var(--bg-input)",
                    border: "1px solid var(--border-subtle)",
                    color: "#fff",
                    fontSize: "15px"
                  }}
                />
                <TouchButton
                  onConfirm={() => {
                    if (customInput.trim()) {
                      handleSelectZone(customInput.trim().toUpperCase());
                      setCustomInput("");
                    }
                  }}
                  confirmText="USAR TEXTO"
                  className="btn-control secondary"
                  style={{ padding: "0 16px" }}
                >
                  Establecer
                </TouchButton>
              </div>
            </div>
          </div>
        ) : isVistaElectricos ? (
          /* ------------------------------------------------------------- */
          /* VISTA 2: VISTA ELECTRICOS */
          /* ------------------------------------------------------------- */
          <div style={{ display: "flex", flexDirection: "column", gap: "16px", background: "var(--bg-card)", padding: "16px", borderRadius: "8px", border: "1px solid var(--border-subtle)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "10px", color: "#38bdf8", fontSize: "15px", fontWeight: "bold" }}>
              <Cpu size={18} /> Diagrama Eléctrico
            </div>

            <div style={{ display: "flex", gap: "12px", alignItems: "stretch" }}>
              {/* Izquierda: MT, C, ME */}
              <div style={{ display: "flex", flexDirection: "column", gap: "8px", width: "130px" }}>
                <TouchButton
                  onConfirm={() => handleSelectZone("MESA DE TIJERA")}
                  confirmText="SELECCIONAR"
                  style={{
                    flex: 1,
                    padding: "8px",
                    fontSize: "12px",
                    fontWeight: "bold",
                    borderRadius: "4px",
                    background: formUbicacion === "MESA DE TIJERA" ? "rgba(250, 204, 21, 0.25)" : "var(--bg-input)",
                    border: formUbicacion === "MESA DE TIJERA" ? "2px solid var(--brand-lumo-gold)" : "1px solid var(--border-subtle)"
                  }}
                >
                  MT (M. TIJERA)
                </TouchButton>

                <TouchButton
                  onConfirm={() => handleSelectZone("CARGADOR")}
                  confirmText="SELECCIONAR"
                  style={{
                    flex: 1,
                    padding: "8px",
                    fontSize: "12px",
                    fontWeight: "bold",
                    borderRadius: "4px",
                    background: formUbicacion === "CARGADOR" ? "rgba(250, 204, 21, 0.25)" : "var(--bg-input)",
                    border: formUbicacion === "CARGADOR" ? "2px solid var(--brand-lumo-gold)" : "1px solid var(--border-subtle)"
                  }}
                >
                  C (CARGADOR)
                </TouchButton>

                <TouchButton
                  onConfirm={() => handleSelectZone("MESA DE ENTRADA")}
                  confirmText="SELECCIONAR"
                  style={{
                    flex: 1,
                    padding: "8px",
                    fontSize: "12px",
                    fontWeight: "bold",
                    borderRadius: "4px",
                    background: formUbicacion === "MESA DE ENTRADA" ? "rgba(250, 204, 21, 0.25)" : "var(--bg-input)",
                    border: formUbicacion === "MESA DE ENTRADA" ? "2px solid var(--brand-lumo-gold)" : "1px solid var(--border-subtle)"
                  }}
                >
                  ME (M. ENTRADA)
                </TouchButton>
              </div>

              {/* Centro: Puertas P1..P14 y Bloque Rayado de Cámara Secadero */}
              <div style={{ display: "flex", flexDirection: "column", flex: 1, gap: "8px" }}>
                {/* Fila Puertas P1..P14 */}
                <div style={{ display: "grid", gridTemplateColumns: "repeat(14, 1fr)", gap: "4px" }}>
                  {Array.from({ length: 14 }, (_, i) => i + 1).map(door => {
                    const val = `PUERTA ${door}`;
                    const isSelected = formUbicacion === val;
                    const isP14 = door === 14;
                    return (
                      <TouchButton
                        key={door}
                        onConfirm={() => handleSelectZone(val)}
                        confirmText="✓"
                        style={{
                          padding: "8px 2px",
                          fontSize: "11px",
                          fontWeight: "bold",
                          borderRadius: "4px",
                          background: isSelected
                            ? "var(--brand-lumo-gold)"
                            : isP14
                            ? "rgba(6, 182, 212, 0.25)"
                            : "var(--bg-input)",
                          border: isSelected
                            ? "2px solid #fff"
                            : isP14
                            ? "1px solid #06b6d4"
                            : "1px solid var(--border-subtle)",
                          color: isSelected ? "#fff" : isP14 ? "#38bdf8" : "var(--text-muted)"
                        }}
                      >
                        P{door}
                      </TouchButton>
                    );
                  })}
                </div>

                {/* Cámara Secadero (Bloque Ilustrativo sin interacción) */}
                <div
                  style={{
                    flex: 1,
                    minHeight: "140px",
                    borderRadius: "6px",
                    border: "1px dashed rgba(255, 255, 255, 0.2)",
                    background: "repeating-linear-gradient(45deg, rgba(255, 255, 255, 0.03), rgba(255, 255, 255, 0.03) 10px, rgba(255, 255, 255, 0.07) 10px, rgba(255, 255, 255, 0.07) 20px)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "rgba(255, 255, 255, 0.3)",
                    fontSize: "14px",
                    fontWeight: "bold",
                    textTransform: "uppercase",
                    letterSpacing: "2px"
                  }}
                >
                  Cámara del Secadero (P1 - P14)
                </div>
              </div>

              {/* Derecha: MS (Mesa Salida) & CT (Cinta) */}
              <div style={{ display: "flex", flexDirection: "column", gap: "8px", width: "130px" }}>
                <TouchButton
                  onConfirm={() => handleSelectZone("MESA DE SALIDA")}
                  confirmText="SELECCIONAR"
                  style={{
                    flex: 1,
                    padding: "8px",
                    fontSize: "12px",
                    fontWeight: "bold",
                    borderRadius: "4px",
                    background: formUbicacion === "MESA DE SALIDA" ? "rgba(250, 204, 21, 0.25)" : "var(--bg-input)",
                    border: formUbicacion === "MESA DE SALIDA" ? "2px solid var(--brand-lumo-gold)" : "1px solid var(--border-subtle)"
                  }}
                >
                  MS (M. SALIDA)
                </TouchButton>

                <TouchButton
                  onConfirm={() => handleSelectZone("CINTA TRANSPORTADORA")}
                  confirmText="SELECCIONAR"
                  style={{
                    flex: 1,
                    padding: "8px",
                    fontSize: "12px",
                    fontWeight: "bold",
                    borderRadius: "4px",
                    background: formUbicacion === "CINTA TRANSPORTADORA" ? "rgba(250, 204, 21, 0.25)" : "var(--bg-input)",
                    border: formUbicacion === "CINTA TRANSPORTADORA" ? "2px solid var(--brand-lumo-gold)" : "1px solid var(--border-subtle)"
                  }}
                >
                  CT (CINTA)
                </TouchButton>
              </div>
            </div>
          </div>
        ) : isVistaMecanicos || isVistaMecanicosRodillos ? (
          /* ------------------------------------------------------------- */
          /* VISTA 3 y 4: VISTA MECANICOS / VISTA MECANICOS RODILLOS */
          /* ------------------------------------------------------------- */
          <div style={{ display: "flex", flexDirection: "column", gap: "16px", background: "var(--bg-card)", padding: "16px", borderRadius: "8px", border: "1px solid var(--border-subtle)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "10px", color: "#f59e0b", fontSize: "15px", fontWeight: "bold" }}>
              <Wrench size={18} /> {isVistaMecanicosRodillos ? "Diagrama Mecánico Rodillos (Sin MT)" : "Diagrama Mecánico Completo"}
            </div>

            <div style={{ display: "flex", gap: "10px" }}>
              {/* Bloque Izquierda: MT (solo si no es rodillos), C, ME N1-N6 */}
              <div style={{ display: "flex", flexDirection: "column", gap: "8px", width: "130px" }}>
                {!isVistaMecanicosRodillos && (
                  <TouchButton
                    onConfirm={() => handleSelectZone("MESA DE TIJERA")}
                    confirmText="SELECCIONAR"
                    style={{
                      height: "50px",
                      padding: "4px",
                      fontSize: "11px",
                      fontWeight: "bold",
                      borderRadius: "4px",
                      background: formUbicacion === "MESA DE TIJERA" ? "rgba(250, 204, 21, 0.25)" : "var(--bg-input)",
                      border: formUbicacion === "MESA DE TIJERA" ? "2px solid var(--brand-lumo-gold)" : "1px solid var(--border-subtle)"
                    }}
                  >
                    MT (M. TIJERA)
                  </TouchButton>
                )}

                <TouchButton
                  onConfirm={() => handleSelectZone("CARGADOR")}
                  confirmText="SELECCIONAR"
                  style={{
                    height: "50px",
                    padding: "4px",
                    fontSize: "11px",
                    fontWeight: "bold",
                    borderRadius: "4px",
                    background: formUbicacion === "CARGADOR" ? "rgba(250, 204, 21, 0.25)" : "var(--bg-input)",
                    border: formUbicacion === "CARGADOR" ? "2px solid var(--brand-lumo-gold)" : "1px solid var(--border-subtle)"
                  }}
                >
                  C (CARGADOR)
                </TouchButton>

                {/* ME (Mesa Entrada) con Niveles */}
                <div style={{ display: "flex", flexDirection: "column", gap: "3px", flex: 1, border: "1px solid var(--border-subtle)", padding: "4px", borderRadius: "4px", background: "rgba(0, 0, 0, 0.2)" }}>
                  <span style={{ fontSize: "10px", fontWeight: "bold", textAlign: "center", color: "var(--text-dim)" }}>ME (ENTRADA)</span>
                  {[6, 5, 4, 3, 2, 1].map(lvl => {
                    const val = `MESA ENTRADA N${lvl}`;
                    const isSelected = formUbicacion === val;
                    return (
                      <TouchButton
                        key={lvl}
                        onConfirm={() => handleSelectZone(val)}
                        confirmText="✓"
                        style={{
                          flex: 1,
                          padding: "2px",
                          fontSize: "10px",
                          fontWeight: "bold",
                          borderRadius: "2px",
                          background: isSelected ? "var(--brand-lumo-gold)" : "var(--bg-input)",
                          border: isSelected ? "1px solid #fff" : "1px solid var(--border-subtle)"
                        }}
                      >
                        N{lvl}
                      </TouchButton>
                    );
                  })}
                </div>
              </div>

              {/* Matriz Central: Fila Nivel Motores (M P1..M P14) + Matriz N6-N1 x P1-P14 */}
              <div style={{ display: "flex", flexDirection: "column", flex: 1, gap: "6px" }}>
                {/* Nivel Motores (M P1..M P14) */}
                <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
                  <span style={{ fontSize: "11px", fontWeight: "bold", color: "#f59e0b" }}>⚡ NIVEL MOTORES (M)</span>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(14, 1fr)", gap: "3px" }}>
                    {Array.from({ length: 14 }, (_, i) => i + 1).map(door => {
                      const val = `MOTOR PUERTA ${door}`;
                      const isSelected = formUbicacion === val;
                      const isP14 = door === 14;
                      return (
                        <TouchButton
                          key={door}
                          onConfirm={() => handleSelectZone(val)}
                          confirmText="✓"
                          style={{
                            padding: "6px 1px",
                            fontSize: "9px",
                            fontWeight: "bold",
                            borderRadius: "3px",
                            background: isSelected
                              ? "var(--brand-lumo-gold)"
                              : isP14
                              ? "rgba(6, 182, 212, 0.3)"
                              : "rgba(245, 158, 11, 0.15)",
                            border: isSelected
                              ? "2px solid #fff"
                              : isP14
                              ? "1px solid #06b6d4"
                              : "1px solid rgba(245, 158, 11, 0.4)",
                            color: isSelected ? "#fff" : isP14 ? "#38bdf8" : "#f59e0b"
                          }}
                          title={`Motor Puerta ${door}`}
                        >
                          M{door}
                        </TouchButton>
                      );
                    })}
                  </div>
                </div>

                {/* Matriz Principal: N6..N1 x P1..P14 */}
                <div style={{ display: "flex", flexDirection: "column", gap: "2px", marginTop: "4px" }}>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(14, 1fr)", gap: "3px" }}>
                    {[6, 5, 4, 3, 2, 1].map(lvl => {
                      return Array.from({ length: 14 }, (_, i) => i + 1).map(door => {
                        const val = `N${lvl}P${door}`;
                        const isSelected = formUbicacion === val;
                        const isP14 = door === 14;
                        return (
                          <TouchButton
                            key={`${lvl}-${door}`}
                            onConfirm={() => handleSelectZone(val)}
                            confirmText="✓"
                            style={{
                              height: "26px",
                              padding: 0,
                              fontSize: "9px",
                              fontWeight: "bold",
                              borderRadius: "2px",
                              background: isSelected
                                ? "var(--brand-lumo-gold)"
                                : isP14
                                ? "rgba(6, 182, 212, 0.2)"
                                : "rgba(255, 255, 255, 0.05)",
                              border: isSelected
                                ? "2px solid #fff"
                                : isP14
                                ? "1px solid #06b6d4"
                                : "1px solid rgba(255, 255, 255, 0.1)",
                              color: isSelected ? "#fff" : isP14 ? "#38bdf8" : "inherit"
                            }}
                            title={`Nivel ${lvl} Puerta ${door}`}
                          >
                            {isSelected ? "✓" : `N${lvl}`}
                          </TouchButton>
                        );
                      });
                    })}
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "repeat(14, 1fr)", gap: "3px", textAlign: "center", fontSize: "10px", color: "var(--text-dim)", marginTop: "2px" }}>
                    {Array.from({ length: 14 }, (_, i) => i + 1).map(door => (
                      <span key={door} style={{ color: door === 14 ? "#38bdf8" : "inherit", fontWeight: door === 14 ? "bold" : "normal" }}>
                        P{door}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              {/* Derecha: MS N1-N6 y CT (Cinta Transportadora) */}
              <div style={{ display: "flex", flexDirection: "column", gap: "8px", width: "130px" }}>
                {/* MS (Mesa Salida) con Niveles */}
                <div style={{ display: "flex", flexDirection: "column", gap: "3px", flex: 1, border: "1px solid var(--border-subtle)", padding: "4px", borderRadius: "4px", background: "rgba(0, 0, 0, 0.2)" }}>
                  <span style={{ fontSize: "10px", fontWeight: "bold", textAlign: "center", color: "var(--text-dim)" }}>MS (SALIDA)</span>
                  {[6, 5, 4, 3, 2, 1].map(lvl => {
                    const val = `MESA SALIDA N${lvl}`;
                    const isSelected = formUbicacion === val;
                    return (
                      <TouchButton
                        key={lvl}
                        onConfirm={() => handleSelectZone(val)}
                        confirmText="✓"
                        style={{
                          flex: 1,
                          padding: "2px",
                          fontSize: "10px",
                          fontWeight: "bold",
                          borderRadius: "2px",
                          background: isSelected ? "var(--brand-lumo-gold)" : "var(--bg-input)",
                          border: isSelected ? "1px solid #fff" : "1px solid var(--border-subtle)"
                        }}
                      >
                        N{lvl}
                      </TouchButton>
                    );
                  })}
                </div>

                <TouchButton
                  onConfirm={() => handleSelectZone("CINTA TRANSPORTADORA")}
                  confirmText="SELECCIONAR"
                  style={{
                    height: "50px",
                    padding: "4px",
                    fontSize: "11px",
                    fontWeight: "bold",
                    borderRadius: "4px",
                    background: formUbicacion === "CINTA TRANSPORTADORA" ? "rgba(250, 204, 21, 0.25)" : "var(--bg-input)",
                    border: formUbicacion === "CINTA TRANSPORTADORA" ? "2px solid var(--brand-lumo-gold)" : "1px solid var(--border-subtle)"
                  }}
                >
                  CT (CINTA)
                </TouchButton>
              </div>
            </div>
          </div>
        ) : isMatrizExtendida ? (
          /* ------------------------------------------------------------- */
          /* VISTA 5: MATRIZ EXTENDIDA (ME N1-N6 + Matriz N1-N6 x P1-P14 + MS N1-N6) */
          /* ------------------------------------------------------------- */
          <div style={{ display: "flex", flexDirection: "column", gap: "16px", background: "var(--bg-card)", padding: "16px", borderRadius: "8px", border: "1px solid var(--border-subtle)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "10px", color: "var(--brand-lumo-gold)", fontSize: "15px", fontWeight: "bold" }}>
              <Grid size={18} /> Diagrama Matriz Extendida (Mesa Entrada + Secadero 1-14 + Mesa Salida)
            </div>

            <div style={{ display: "flex", gap: "10px" }}>
              {/* Izquierda: ME N1-N6 */}
              <div style={{ display: "flex", flexDirection: "column", gap: "4px", width: "120px", border: "1px solid var(--border-subtle)", padding: "6px", borderRadius: "4px", background: "rgba(0, 0, 0, 0.2)" }}>
                <span style={{ fontSize: "11px", fontWeight: "bold", textAlign: "center", color: "var(--text-dim)" }}>ME (ENTRADA)</span>
                {[6, 5, 4, 3, 2, 1].map(lvl => {
                  const val = `MESA ENTRADA N${lvl}`;
                  const isSelected = formUbicacion === val;
                  return (
                    <TouchButton
                      key={lvl}
                      onConfirm={() => handleSelectZone(val)}
                      confirmText="✓"
                      style={{
                        flex: 1,
                        padding: "8px",
                        fontSize: "12px",
                        fontWeight: "bold",
                        borderRadius: "3px",
                        background: isSelected ? "var(--brand-lumo-gold)" : "var(--bg-input)",
                        border: isSelected ? "2px solid #fff" : "1px solid var(--border-subtle)"
                      }}
                    >
                      N{lvl}
                    </TouchButton>
                  );
                })}
              </div>

              {/* Centro: Matriz N6..N1 x P1..P14 */}
              <div style={{ display: "flex", flexDirection: "column", flex: 1, gap: "4px" }}>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(14, 1fr)", gap: "3px" }}>
                  {[6, 5, 4, 3, 2, 1].map(lvl => {
                    return Array.from({ length: 14 }, (_, i) => i + 1).map(door => {
                      const val = `N${lvl}P${door}`;
                      const isSelected = formUbicacion === val;
                      const isP14 = door === 14;
                      return (
                        <TouchButton
                          key={`${lvl}-${door}`}
                          onConfirm={() => handleSelectZone(val)}
                          confirmText="✓"
                          style={{
                            height: "32px",
                            padding: 0,
                            fontSize: "10px",
                            fontWeight: "bold",
                            borderRadius: "3px",
                            background: isSelected
                              ? "var(--brand-lumo-gold)"
                              : isP14
                              ? "rgba(6, 182, 212, 0.25)"
                              : "rgba(255, 255, 255, 0.05)",
                            border: isSelected
                              ? "2px solid #fff"
                              : isP14
                              ? "1px solid #06b6d4"
                              : "1px solid rgba(255, 255, 255, 0.1)",
                            color: isSelected ? "#fff" : isP14 ? "#38bdf8" : "inherit"
                          }}
                          title={`Nivel ${lvl} Puerta ${door}`}
                        >
                          {isSelected ? "✓" : `N${lvl}`}
                        </TouchButton>
                      );
                    });
                  })}
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "repeat(14, 1fr)", gap: "3px", textAlign: "center", fontSize: "11px", color: "var(--text-dim)", marginTop: "4px" }}>
                  {Array.from({ length: 14 }, (_, i) => i + 1).map(door => (
                    <span key={door} style={{ color: door === 14 ? "#38bdf8" : "inherit", fontWeight: door === 14 ? "bold" : "normal" }}>
                      P{door}
                    </span>
                  ))}
                </div>
              </div>

              {/* Derecha: MS N1-N6 */}
              <div style={{ display: "flex", flexDirection: "column", gap: "4px", width: "120px", border: "1px solid var(--border-subtle)", padding: "6px", borderRadius: "4px", background: "rgba(0, 0, 0, 0.2)" }}>
                <span style={{ fontSize: "11px", fontWeight: "bold", textAlign: "center", color: "var(--text-dim)" }}>MS (SALIDA)</span>
                {[6, 5, 4, 3, 2, 1].map(lvl => {
                  const val = `MESA SALIDA N${lvl}`;
                  const isSelected = formUbicacion === val;
                  return (
                    <TouchButton
                      key={lvl}
                      onConfirm={() => handleSelectZone(val)}
                      confirmText="✓"
                      style={{
                        flex: 1,
                        padding: "8px",
                        fontSize: "12px",
                        fontWeight: "bold",
                        borderRadius: "3px",
                        background: isSelected ? "var(--brand-lumo-gold)" : "var(--bg-input)",
                        border: isSelected ? "2px solid #fff" : "1px solid var(--border-subtle)"
                      }}
                    >
                      N{lvl}
                    </TouchButton>
                  );
                })}
              </div>
            </div>
          </div>
        ) : isPerfilNiveles && !isPerfilCompleto ? (
          /* ------------------------------------------------------------- */
          /* VISTA 6: SOLO NIVELES (6 Rectángulos Largos) */
          /* ------------------------------------------------------------- */
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
          /* ------------------------------------------------------------- */
          /* VISTA DEFAULT / PERFIL COMPLETO */
          /* ------------------------------------------------------------- */
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

              {/* Matriz Central: N1-N6 x P1-P14 */}
              <div style={{ display: "flex", flexDirection: "column", flex: 1, margin: "0 10px" }}>
                <div className="secadero-grid-wrapper">
                  <div className="secadero-row-labels">
                    {[6, 5, 4, 3, 2, 1].map(lvl => (
                      <span key={lvl} className="secadero-row-label">N{lvl}</span>
                    ))}
                  </div>

                  <div className="secadero-grid-container" style={{ gridTemplateColumns: "repeat(14, 1fr)" }}>
                    {[6, 5, 4, 3, 2, 1].map(lvl => {
                      return Array.from({ length: 14 }, (_, i) => i + 1).map(door => {
                        const val = `N${lvl}P${door}`;
                        const isSelected = formUbicacion === val;
                        const isP14 = door === 14;
                        return (
                          <TouchButton
                            key={`${lvl}-${door}`}
                            onConfirm={() => handleSelectZone(val)}
                            confirmText="✓"
                            className={`secadero-cell ${isSelected ? "selected" : ""}`}
                            style={{
                              padding: 0,
                              background: isSelected
                                ? "var(--brand-lumo-gold)"
                                : isP14
                                ? "rgba(6, 182, 212, 0.25)"
                                : "rgba(255, 255, 255, 0.05)",
                              borderColor: isSelected ? "#fff" : isP14 ? "#06b6d4" : "rgba(255, 255, 255, 0.1)"
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

                <div className="secadero-col-labels" style={{ gridTemplateColumns: "repeat(14, 1fr)" }}>
                  {Array.from({ length: 14 }, (_, i) => i + 1).map(door => (
                    <span key={door} className="secadero-col-label" style={{ color: door === 14 ? "#38bdf8" : "inherit" }}>
                      {door}
                    </span>
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

        </div>
      </div>

      {/* BARRA LATERAL ULTRA-COMPACTA DE ACCIONES (DERECHA, 135px) */}
      <div className="stage-sidebar-actions">
        <TouchButton
          onConfirm={onNext}
          confirmText="CONFIRMAR SIGUIENTE"
          disabled={isNextDisabled}
          className="btn-control primary btn-sidebar-square"
          style={{
            opacity: isNextDisabled ? 0.5 : 1,
            cursor: isNextDisabled ? "not-allowed" : "pointer"
          }}
        >
          <ArrowRight size={24} />
          <span>Siguiente</span>
        </TouchButton>

        <TouchButton
          onConfirm={onBack}
          confirmText="CONFIRMAR VOLVER"
          className="btn-control secondary btn-sidebar-square"
        >
          <ArrowLeft size={24} />
          <span>Volver</span>
        </TouchButton>
      </div>
    </div>
  );
}
