import React, { useState, useEffect } from "react";
import { 
  X, ArrowLeft, ArrowRight, Server, Wifi, Activity, 
  FileSpreadsheet, Send, ShieldCheck, Clock, Layers, 
  BarChart2, Edit3, Trash2, CheckCircle2, AlertTriangle, BookOpen, Monitor
} from "lucide-react";

export default function PresentacionView({ onClose }) {
  const [currentSlide, setCurrentSlide] = useState(0);

  const slides = [
    {
      subtitle: "Manual Operativo — Sistema Lumo Secaderos",
      title: "Instrucciones de Uso del Sistema",
      desc: "Guía interactiva de operación para el Portal del Supervisor y las Terminales (Tablets) en Planta de COAMA SudAmerica.",
      content: (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "28px", height: "100%" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "20px" }}>
            <img src="/lumo-transparent-logo.png" alt="Lumo Logo" style={{ maxHeight: "40px", width: "auto" }} />
            <div style={{ width: "1px", height: "30px", background: "var(--border-subtle)" }} />
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <img src="/coama-logo.png" alt="COAMA Logo" style={{ maxHeight: "30px", width: "auto" }} />
              <span style={{ fontSize: "16px", fontWeight: "bold", color: "#fff", fontFamily: "var(--font-mono)" }}>COAMA SudAmerica</span>
            </div>
          </div>
          
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "16px", width: "100%", maxWidth: "850px", marginTop: "10px" }}>
            <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid var(--border-subtle)", padding: "16px", borderRadius: "4px", textAlign: "center" }}>
              <Monitor size={24} color="var(--brand-lumo-gold)" style={{ marginBottom: "8px" }} />
              <strong style={{ display: "block", color: "#fff", fontSize: "13px" }}>1. Portal Supervisor</strong>
              <span style={{ fontSize: "11.5px", color: "var(--text-muted)" }}>Control de estados, edición de registros y gestión de parámetros.</span>
            </div>
            <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid var(--border-subtle)", padding: "16px", borderRadius: "4px", textAlign: "center" }}>
              <Activity size={24} color="var(--brand-lumo)" style={{ marginBottom: "8px" }} />
              <strong style={{ display: "block", color: "#fff", fontSize: "13px" }}>2. Tablets en Planta</strong>
              <span style={{ fontSize: "11.5px", color: "var(--text-muted)" }}>Captura inmediata de paradas e inicios de ciclo en cada secadero.</span>
            </div>
            <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid var(--border-subtle)", padding: "16px", borderRadius: "4px", textAlign: "center" }}>
              <BarChart2 size={24} color="var(--accent-emerald)" style={{ marginBottom: "8px" }} />
              <strong style={{ display: "block", color: "#fff", fontSize: "13px" }}>3. ERP & Analítica BI</strong>
              <span style={{ fontSize: "11.5px", color: "var(--text-muted)" }}>Exportación automática de pérdidas de turno y tableros BI.</span>
            </div>
          </div>

          <span style={{ fontSize: "11px", color: "var(--text-dim)", fontFamily: "var(--font-mono)" }}>
            Navega con las flechas del teclado (◀ ▶) o botones inferiores para ver la guía completa.
          </span>
        </div>
      )
    },
    {
      subtitle: "Arquitectura & Conexión de Servidor",
      title: "Conexión Servidor ↔ Tablets (Red Local)",
      desc: "El sistema funciona con arquitectura Local-First. La comunicación corre dentro de la red local de planta.",
      content: (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
          <div style={{ background: "#111", border: "1px solid #222", padding: "18px" }}>
            <Server size={22} color="var(--brand-lumo-gold)" style={{ marginBottom: "8px" }} />
            <strong style={{ color: "#fff", fontSize: "14px", display: "block", marginBottom: "6px" }}>1. Servidor Central de Planta</strong>
            <p style={{ fontSize: "12.5px", color: "var(--text-muted)", margin: 0, lineHeight: "1.45" }}>
              La PC Servidor debe estar encendida ejecutando el servicio API. El servidor se <strong>inicia automáticamente con Windows</strong>. Si se cerró por error, haz doble clic en el acceso directo del escritorio: <code>Iniciar Servidor COAMA</code>.
            </p>
          </div>
          <div style={{ background: "#111", border: "1px solid #222", padding: "18px" }}>
            <Wifi size={22} color="var(--brand-lumo)" style={{ marginBottom: "8px" }} />
            <strong style={{ color: "#fff", fontSize: "14px", display: "block", marginBottom: "6px" }}>2. Comunicación con Tablets</strong>
            <p style={{ fontSize: "12.5px", color: "var(--text-muted)", margin: 0, lineHeight: "1.45" }}>
              Las tablets físicas se conectan vía Wi-Fi local a la IP de la PC Servidor (ej. <code>192.168.1.X:8080</code>). Transmiten paradas al instante y descargan el catálogo actualizado.
            </p>
          </div>
          <div style={{ background: "#111", border: "1px solid #222", padding: "18px", gridColumn: "span 2" }}>
            <ShieldCheck size={22} color="var(--accent-emerald)" style={{ marginBottom: "8px" }} />
            <strong style={{ color: "#fff", fontSize: "14px", display: "block", marginBottom: "6px" }}>3. Resiliencia Desconectada (Local-First)</strong>
            <p style={{ fontSize: "12.5px", color: "var(--text-muted)", margin: 0, lineHeight: "1.45" }}>
              Si internet se interrumpe, las tablets y el portal continúan trabajando al 100% en la red interna sin perder datos. En cuanto vuelve el enlace a internet, las alertas de Telegram y el volcado a la nube se reanudan automáticamente.
            </p>
          </div>
        </div>
      )
    },
    {
      subtitle: "Monitoreo de Terminales",
      title: "Los 3 Estados del Secadero en el Portal",
      desc: "El portal diagnostica en tiempo real la conectividad de la tablet y el estado operativo de cada máquina.",
      content: (
        <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
          <div style={{ padding: "16px", background: "rgba(16, 185, 129, 0.04)", borderLeft: "4px solid var(--accent-emerald)", border: "1px solid rgba(16, 185, 129, 0.2)" }}>
            <strong style={{ color: "var(--accent-emerald)", fontSize: "14px", display: "block" }}>🟢 OPERANDO</strong>
            <p style={{ margin: "4px 0 0 0", fontSize: "12.5px", color: "var(--text-muted)" }}>
              El secadero se encuentra operando normalmente. La tablet está <strong>ONLINE</strong> (enviando reportes y respondiendo a pings ICMP) y no hay paradas abiertas.
            </p>
          </div>

          <div style={{ padding: "16px", background: "rgba(244, 63, 94, 0.04)", borderLeft: "4px solid var(--accent-rose)", border: "1px solid rgba(244, 63, 94, 0.2)" }}>
            <strong style={{ color: "var(--accent-rose)", fontSize: "14px", display: "block" }}>🔴 PARADO (Parada Abierta en Vivo)</strong>
            <p style={{ margin: "4px 0 0 0", fontSize: "12.5px", color: "var(--text-muted)" }}>
              El operario registró el inicio de una parada desde la tablet y la máquina está detenida acumulando tiempo muerto en vivo hasta que se registre el fin.
            </p>
          </div>

          <div style={{ padding: "16px", background: "rgba(234, 179, 8, 0.04)", borderLeft: "4px solid #facc15", border: "1px solid rgba(234, 179, 8, 0.2)" }}>
            <strong style={{ color: "#fef08a", fontSize: "14px", display: "block" }}>🟡 DESCONOCIDO</strong>
            <p style={{ margin: "4px 0 0 0", fontSize: "12.5px", color: "var(--text-muted)" }}>
              La tablet está fuera de línea o sin respuesta (más de 45 segundos sin reportar al servidor o sin respuesta ICMP). El servidor marca estado desconocido por seguridad hasta restablecer la comunicación.
            </p>
          </div>
        </div>
      )
    },
    {
      subtitle: "Captura en Planta",
      title: "¿Qué información carga el operario en la Tablet?",
      desc: "Flujo ágil de registro diseñado para que el operario declare paradas en menos de 10 segundos.",
      content: (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
          <div style={{ padding: "16px", background: "#111", border: "1px solid #222" }}>
            <strong style={{ color: "var(--brand-lumo-gold)", fontSize: "13.5px", display: "block", marginBottom: "4px" }}>1. Razón / Tiempo Muerto</strong>
            <p style={{ margin: 0, fontSize: "12px", color: "var(--text-muted)" }}>Motivo específico de la parada seleccionado del catálogo activo (ej. Avance, Rodillos, Baño, Falda de Madera).</p>
          </div>
          <div style={{ padding: "16px", background: "#111", border: "1px solid #222" }}>
            <strong style={{ color: "var(--brand-lumo-gold)", fontSize: "13.5px", display: "block", marginBottom: "4px" }}>2. Categoría / Origen</strong>
            <p style={{ margin: 0, fontSize: "12px", color: "var(--text-muted)" }}>Clasificación padre del origen del problema (ej. Operativo, Eléctrico, Mecánico, Mecánico Rodillos).</p>
          </div>
          <div style={{ padding: "16px", background: "#111", border: "1px solid #222" }}>
            <strong style={{ color: "var(--brand-lumo-gold)", fontSize: "13.5px", display: "block", marginBottom: "4px" }}>3. Observaciones del Operador</strong>
            <p style={{ margin: 0, fontSize: "12px", color: "var(--text-muted)" }}>Comentario aclaratorio. Puede ser obligatorio u opcional según la configuración del parámetro.</p>
          </div>
          <div style={{ padding: "16px", background: "#111", border: "1px solid #222" }}>
            <strong style={{ color: "var(--brand-lumo-gold)", fontSize: "13.5px", display: "block", marginBottom: "4px" }}>4. Ubicación Layout / Perfil</strong>
            <p style={{ margin: 0, fontSize: "12px", color: "var(--text-muted)" }}>Ubicación física en la máquina (ej. N1P4, Entrada, Salida) cuando la razón requiere perfil de niveles o completo.</p>
          </div>
        </div>
      )
    },
    {
      subtitle: "Parametrización por Excel",
      title: "Configuración del Catálogo e IP desde Excel (XLSX)",
      desc: "El supervisor puede administrar toda la configuración del sistema desde la planilla Excel.",
      content: (
        <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
          <div style={{ padding: "16px", background: "#111", border: "1px solid #222", borderLeft: "4px solid var(--brand-lumo-gold)" }}>
            <h4 style={{ margin: "0 0 4px 0", fontSize: "14px", color: "#fff" }}>📥 Descargar Planilla</h4>
            <p style={{ margin: 0, fontSize: "12px", color: "var(--text-muted)" }}>En la pestaña <strong>Parámetros</strong>, toca <em>Descargar Planilla</em>. Obtendrás un archivo <code>xlsx</code> con las pestañas de Razones, Orígenes, Turnos, Secaderos y Tablets.</p>
          </div>
          <div style={{ padding: "16px", background: "#111", border: "1px solid #222", borderLeft: "4px solid var(--brand-lumo-gold)" }}>
            <h4 style={{ margin: "0 0 4px 0", fontSize: "14px", color: "#fff" }}>✏️ Edición de Parámetros</h4>
            <p style={{ margin: 0, fontSize: "12px", color: "var(--text-muted)" }}>Puedes agregar o renombrar razones, asignar IP a tablets, activar/desactivar motivos, y definir si la observación o ubicación son obligatorias.</p>
          </div>
          <div style={{ padding: "16px", background: "#111", border: "1px solid #222", borderLeft: "4px solid var(--brand-lumo-gold)" }}>
            <h4 style={{ margin: "0 0 4px 0", fontSize: "14px", color: "#fff" }}>📤 Subir Planilla</h4>
            <p style={{ margin: 0, fontSize: "12px", color: "var(--text-muted)" }}>Al presionar <em>Subir Planilla</em>, el servidor procesa el Excel e impacta de inmediato en el portal y en todas las tablets.</p>
          </div>
        </div>
      )
    },
    {
      subtitle: "Alertas Automáticas",
      title: "Bot de Notificaciones por Telegram",
      desc: "Despacho instantáneo de eventos a celulares de supervisores.",
      content: (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", alignItems: "center" }}>
          <div style={{ padding: "18px", background: "#111", border: "1px solid #222" }}>
            <Send size={24} color="var(--brand-lumo-gold)" style={{ marginBottom: "8px" }} />
            <strong style={{ color: "#fff", fontSize: "14px", display: "block", marginBottom: "6px" }}>Notificación en Tiempo Real</strong>
            <p style={{ fontSize: "12px", color: "var(--text-muted)", margin: 0, lineHeight: "1.45" }}>
              Cada vez que se registra el inicio de una parada en cualquier tablet, el Bot despacha un mensaje de alerta al grupo de Telegram indicando secadero, motivo, hora y comentarios.
            </p>
          </div>
          <div style={{ padding: "18px", background: "rgba(250,204,21,0.04)", border: "1px solid rgba(250,204,21,0.2)", borderRadius: "4px" }}>
            <strong style={{ color: "var(--brand-lumo-gold)", fontSize: "13px", display: "block", marginBottom: "8px" }}>Prueba de Notificación:</strong>
            <p style={{ fontSize: "12px", color: "var(--text-muted)", margin: "0 0 12px 0" }}>
              Puedes presionar el botón <em>Probar Bot Telegram</em> en la cabecera de la pestaña Eventos para validar la recepción de alertas.
            </p>
          </div>
        </div>
      )
    },
    {
      subtitle: "Protocolo del Supervisor",
      title: "Flujo de Trabajo del Supervisor durante el Turno",
      desc: "Pasos operativos recomendados al inicio, durante y al final del turno.",
      content: (
        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          <div style={{ padding: "14px", background: "#111", border: "1px solid #222", borderLeft: "4px solid var(--accent-emerald)" }}>
            <strong style={{ color: "var(--accent-emerald)", fontSize: "13px" }}>1. AL INICIAR EL TURNO</strong>
            <p style={{ margin: "2px 0 0 0", fontSize: "12px", color: "var(--text-muted)" }}>
              Ingresar al portal (o verificar que abrió). Comprobar en la pestaña <strong>Operación</strong> que las tablets figuren <strong>ONLINE (🟢)</strong> y que los secaderos estén operando o con la parada correspondiente.
            </p>
          </div>
          <div style={{ padding: "14px", background: "#111", border: "1px solid #222", borderLeft: "4px solid var(--brand-lumo-gold)" }}>
            <strong style={{ color: "var(--brand-lumo-gold)", fontSize: "13px" }}>2. DURANTE EL TURNO</strong>
            <p style={{ margin: "2px 0 0 0", fontSize: "12px", color: "var(--text-muted)" }}>
              Supervisar la tabla de <strong>Eventos</strong>. Si un operario se equivocó de horario o razón, usar los botones de <strong>Editar</strong> o <strong>Eliminar 🗑️</strong>. Revisar la solapa <strong>Validaciones</strong> para homologar motivos ingresados manualmente.
            </p>
          </div>
          <div style={{ padding: "14px", background: "#111", border: "1px solid #222", borderLeft: "4px solid var(--brand-lumo)" }}>
            <strong style={{ color: "var(--brand-lumo)", fontSize: "13px" }}>3. AL FINALIZAR EL TURNO</strong>
            <p style={{ margin: "2px 0 0 0", fontSize: "12px", color: "var(--text-muted)" }}>
              Los datos acumulados se vuelcan automáticamente al ERP de la planta y a los tableros analíticos en la nube (Looker Studio). No se requiere ningún guardado ni exportación manual obligatoria.
            </p>
          </div>
        </div>
      )
    },
    {
      subtitle: "Salidas de Información",
      title: "Exportación a ERP & Dashboard Looker Studio",
      desc: "Integración con los sistemas de gestión de planta y tableros gerenciales.",
      content: (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
          <div style={{ padding: "18px", background: "#111", border: "1px solid #222" }}>
            <FileSpreadsheet size={22} color="var(--brand-lumo-gold)" style={{ marginBottom: "8px" }} />
            <strong style={{ color: "#fff", fontSize: "14px", display: "block", marginBottom: "6px" }}>1. Exportación ERP de Planta</strong>
            <p style={{ fontSize: "12px", color: "var(--text-muted)", margin: 0, lineHeight: "1.45" }}>
              Generación de archivo formateado específicamente para el sistema de gestión ERP de la planta, imputando tiempos muertos por línea, fecha y turno.
            </p>
          </div>
          <div style={{ padding: "18px", background: "#111", border: "1px solid #222" }}>
            <BarChart2 size={22} color="var(--brand-lumo)" style={{ marginBottom: "8px" }} />
            <strong style={{ color: "#fff", fontSize: "14px", display: "block", marginBottom: "6px" }}>2. Dashboard Looker Studio (BI)</strong>
            <p style={{ fontSize: "12px", color: "var(--text-muted)", margin: 0, lineHeight: "1.45" }}>
              Volcado continuo en la nube (Google Sheets) para alimentar los tableros de control analítico en Looker Studio (disponibles en la solapa <strong>Análisis</strong>).
            </p>
          </div>
        </div>
      )
    },
    {
      subtitle: "Navegación del Portal",
      title: "¿Para qué sirve cada pestaña del Portal del Supervisor?",
      desc: "Resumen ejecutivo de la barra lateral de navegación.",
      content: (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", fontSize: "12px" }}>
          <div style={{ padding: "10px 12px", background: "#111", border: "1px solid #222" }}>
            <strong style={{ color: "var(--brand-lumo-gold)" }}>📊 Operación:</strong> Estado en vivo de los 3 secaderos y total de paradas del día.
          </div>
          <div style={{ padding: "10px 12px", background: "#111", border: "1px solid #222" }}>
            <strong style={{ color: "var(--brand-lumo-gold)" }}>⏱️ Eventos:</strong> Historial de paradas con edición y eliminación ordenada 🗑️.
          </div>
          <div style={{ padding: "10px 12px", background: "#111", border: "1px solid #222" }}>
            <strong style={{ color: "var(--brand-lumo-gold)" }}>📈 Análisis:</strong> Tableros de control interactivos de Looker Studio.
          </div>
          <div style={{ padding: "10px 12px", background: "#111", border: "1px solid #222" }}>
            <strong style={{ color: "var(--brand-lumo-gold)" }}>⚙️ Parámetros:</strong> Filtro de razones, Excel y monitoreo IP de tablets.
          </div>
          <div style={{ padding: "10px 12px", background: "#111", border: "1px solid #222" }}>
            <strong style={{ color: "var(--brand-lumo-gold)" }}>🕒 Turnos:</strong> Maestro de turnos vigentes y supervisores asignados.
          </div>
          <div style={{ padding: "10px 12px", background: "#111", border: "1px solid #222" }}>
            <strong style={{ color: "var(--brand-lumo-gold)" }}>✅ Validaciones:</strong> Homologación de motivos libres propuestos por operarios.
          </div>
        </div>
      )
    }
  ];

  useEffect(() => {
    function handleKeyDown(e) {
      if (
        e.key === "ArrowRight" || 
        e.key === "ArrowDown" || 
        e.key === "PageDown" || 
        e.key === "Space"
      ) {
        setCurrentSlide(prev => Math.min(prev + 1, slides.length - 1));
      } else if (
        e.key === "ArrowLeft" || 
        e.key === "ArrowUp" || 
        e.key === "PageUp"
      ) {
        setCurrentSlide(prev => Math.max(prev - 1, 0));
      } else if (e.key === "Escape") {
        onClose();
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [slides.length, onClose]);

  const progressPercent = ((currentSlide + 1) / slides.length) * 100;

  return (
    <div className="presentation-deck">
      <div className="presentation-progress-bar" style={{ width: `${progressPercent}%` }} />
      
      {/* Persistent Lumo Logo Branding */}
      <div style={{ position: "absolute", top: "24px", left: "4%", display: "flex", alignItems: "center", gap: "10px", opacity: 0.8, zIndex: 10001 }}>
        <img src="/lumo-transparent-logo.png" alt="Lumo Data Solutions" style={{ height: "24px", width: "auto" }} />
      </div>

      <button className="presentation-close-btn" onClick={onClose}>
        Volver al portal <X size={14} style={{ marginLeft: "4px" }} />
      </button>

      <div className="presentation-slide-container">
        {slides.map((slide, index) => {
          const isActive = index === currentSlide;
          return (
            <div key={index} className={`presentation-slide ${isActive ? "active" : ""}`}>
              <div style={{ display: "flex", flexDirection: "column", height: "100%", width: "100%", justifyContent: "center" }}>
                <div style={{ textAlign: "center", marginBottom: "20px" }}>
                  <span className="pres-subtitle" style={{ display: "block", marginBottom: "6px" }}>{slide.subtitle}</span>
                  <h2 className="pres-title" style={{ fontSize: "32px", margin: "0 0 8px 0" }}>{slide.title}</h2>
                  <p className="pres-desc" style={{ fontSize: "15px", margin: "0 auto 16px auto", maxWidth: "800px" }}>{slide.desc}</p>
                </div>
                <div className="pres-img-container" style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <div style={{ width: "100%", maxWidth: "850px" }}>
                    {slide.content}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="presentation-nav">
        <button 
          className="presentation-nav-btn" 
          onClick={() => setCurrentSlide(prev => Math.max(prev - 1, 0))}
          disabled={currentSlide === 0}
        >
          <ArrowLeft size={16} />
        </button>
        <span className="presentation-nav-info">
          {String(currentSlide + 1).padStart(2, "0")} / {String(slides.length).padStart(2, "0")}
        </span>
        <button 
          className="presentation-nav-btn" 
          onClick={() => setCurrentSlide(prev => Math.min(prev + 1, slides.length - 1))}
          disabled={currentSlide === slides.length - 1}
        >
          <ArrowRight size={16} />
        </button>
      </div>
    </div>
  );
}
