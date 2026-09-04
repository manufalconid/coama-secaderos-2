import React from "react";
import { Square, Play } from "lucide-react";
import TouchButton from "../TouchButton";

interface MainStageProps {
  machineState: "produciendo" | "parado";
  elapsedTime: number;
  handleStartStoppage: () => void;
  handleStartEndStoppage: () => void;
  formatSeconds: (secs: number) => string;
}

export default function MainStage({
  machineState,
  elapsedTime,
  handleStartStoppage,
  handleStartEndStoppage,
  formatSeconds
}: MainStageProps) {
  return (
    <div className="operator-console-container">
      {machineState === "produciendo" ? (
        <div className="console-flow-layout">
          {/* Machine Status Bar */}
          <div className="status-bar-banner producing">
            <span className="status-bar-dot">●</span>
            <span className="status-bar-text">PRODUCIENDO</span>
          </div>
          {/* Stoppage Trigger Button */}
          <TouchButton
            onConfirm={handleStartStoppage}
            confirmText="¡TOCA DE NUEVO PARA INICIAR PARADA!"
            className="btn-giant-action produciendo"
          >
            <Square size={48} fill="#fff" />
            <span>Iniciar Parada</span>
          </TouchButton>
        </div>
      ) : (
        <div className="console-flow-layout">
          {/* Machine Status Bar */}
          <div className="status-bar-banner stopped">
            <span className="status-bar-dot">●</span>
            <span className="status-bar-text">MÁQUINA PARADA</span>
          </div>
          {/* Stopwatch Counter */}
          <div className="console-timer-container">
            <span className="console-timer-label">TIEMPO DE PARADA TRANSCURRIDO</span>
            <div className="console-timer-value">{formatSeconds(elapsedTime)}</div>
          </div>
          {/* Stoppage Resume Button */}
          <TouchButton
            onConfirm={handleStartEndStoppage}
            confirmText="¡TOCA DE NUEVO PARA REGISTRAR FIN DE PARADA!"
            className="btn-giant-action parado"
            disabled={elapsedTime < 1}
            style={{ opacity: elapsedTime < 1 ? 0.6 : 1, cursor: elapsedTime < 1 ? "not-allowed" : "pointer" }}
          >
            <Play size={48} fill="#fff" />
            <span>{elapsedTime < 1 ? "Espere 1s..." : "Fin de Parada"}</span>
          </TouchButton>
        </div>
      )}
    </div>
  );
}
