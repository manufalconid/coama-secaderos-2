import React, { useState, useEffect } from "react";
import { X, ArrowLeft, ArrowRight } from "lucide-react";

export default function PresentacionView({ onClose }) {
  const [currentSlide, setCurrentSlide] = useState(0);

  const slides = [
    {
      subtitle: "Sistema Lumo Secaderos",
      title: "Digitalización y Colecta de Tiempos Muertos",
      desc: "Proyecto de control y registro operativo de paradas de secado de COAMA SudAmerica. Uniendo la captura en planta con la analítica y los sistemas de gestión central.",
      content: (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "32px", height: "100%" }}>
          <div style={{ textAlign: "center" }}>
            <span style={{ display: "block", fontSize: "10px", color: "var(--text-dim)", textTransform: "uppercase", letterSpacing: "2.5px", marginBottom: "8px" }}>Desarrollado por</span>
            <img src="/lumo-transparent-logo.png" alt="Lumo Logo" style={{ maxHeight: "48px", width: "auto", objectFit: "contain" }} />
          </div>
          
          <div style={{ width: "60px", height: "1px", background: "var(--border-subtle)" }} />
          
          <div style={{ textAlign: "center" }}>
            <span style={{ display: "block", fontSize: "10px", color: "var(--text-dim)", textTransform: "uppercase", letterSpacing: "2.5px", marginBottom: "12px" }}>Cliente</span>
            <div style={{ display: "flex", alignItems: "center", gap: "12px", justifyContent: "center" }}>
              <img src="/coama-logo.png" alt="COAMA Logo" style={{ maxHeight: "36px", width: "auto", objectFit: "contain" }} />
              <span style={{ fontSize: "16px", fontWeight: "bold", color: "#fff", fontFamily: "var(--font-mono)", letterSpacing: "1px" }}>COAMA SudAmerica</span>
            </div>
          </div>
        </div>
      )
    },
    {
      subtitle: "Planificación General",
      title: "Gantt de Proyecto y Estado Actual",
      desc: "Cronograma de diseño, desarrollo y despliegue del sistema. Hoy, 23 de agosto, nos encontramos en la etapa final de Diseño y Validación de Interfaz.",
      layout: "full",
      content: (
        <div style={{ width: "100%", height: "100%", display: "flex", justifyContent: "center", alignItems: "center" }}>
          <img src="/media_1787495222553.png" alt="Gantt Project" style={{ width: "100%", maxWidth: "1100px", maxHeight: "55vh", objectFit: "contain", border: "1px solid #222", boxShadow: "0 20px 50px rgba(0, 0, 0, 0.85)" }} />
        </div>
      )
    },
    {
      subtitle: "Fundamentos Básicos",
      title: "Comprensión del Proyecto",
      desc: "Un ecosistema digital integrado para erradicar planillas manuales en papel, evitar doble carga de datos y acelerar reportes de pérdidas.",
      content: (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px" }}>
          <div style={{ padding: "20px", background: "#111", border: "1px solid #222" }}>
            <strong style={{ color: "var(--brand-lumo)", fontSize: "15px", display: "block", marginBottom: "6px" }}>1. Captura en Planta</strong>
            <p style={{ margin: 0, fontSize: "13px", color: "var(--text-muted)", lineHeight: "1.45" }}>Terminales táctiles físicas en cada secadero para registro directo por operarios.</p>
          </div>
          <div style={{ padding: "20px", background: "#111", border: "1px solid #222" }}>
            <strong style={{ color: "var(--brand-lumo)", fontSize: "15px", display: "block", marginBottom: "6px" }}>2. Portal de Control</strong>
            <p style={{ margin: 0, fontSize: "13px", color: "var(--text-muted)", lineHeight: "1.45" }}>Consola web para que el supervisor gestione históricos, KPI del turno y maestros.</p>
          </div>
          <div style={{ padding: "20px", background: "#111", border: "1px solid #222" }}>
            <strong style={{ color: "var(--brand-lumo)", fontSize: "15px", display: "block", marginBottom: "6px" }}>3. Alertas Móviles</strong>
            <p style={{ margin: 0, fontSize: "13px", color: "var(--text-muted)", lineHeight: "1.45" }}>Despacho automático de notificaciones de paradas críticas en el celular (Telegram).</p>
          </div>
          <div style={{ padding: "20px", background: "#111", border: "1px solid #222" }}>
            <strong style={{ color: "var(--brand-lumo)", fontSize: "15px", display: "block", marginBottom: "6px" }}>4. Dashboard BI</strong>
            <p style={{ margin: 0, fontSize: "13px", color: "var(--text-muted)", lineHeight: "1.45" }}>Volcado seguro en la nube para reportes avanzados en Looker Studio.</p>
          </div>
        </div>
      )
    },
    {
      subtitle: "Captura en Planta",
      title: "Terminal de Operario en Secaderos",
      desc: "Cada secadero tendrá montada físicamente una tablet con su aplicación dedicada. La interfaz vertical permite a los operarios registrar el inicio y fin de paradas en segundos.",
      content: (
        <div className="pres-img-container">
          <img src="/media_1787495282927.png" alt="Tablet Interface" className="pres-screenshot" />
        </div>
      )
    },
    {
      subtitle: "Monitoreo y Control",
      title: "Portal Web del Supervisor",
      desc: "Consola en tiempo real para la supervisión activa de secaderos, visualización del acumulado de pérdidas de turno y administración de parámetros.",
      content: (
        <div className="pres-img-container">
          <img src="/media_1787495295937.png" alt="Supervisor Portal Interface" className="pres-screenshot-landscape" />
        </div>
      )
    },
    {
      subtitle: "Notificaciones Automáticas",
      title: "Alertas al Celular del Supervisor",
      desc: "Integración nativa con un Bot de Telegram. Notificaciones inmediatas en la pantalla de bloqueo detallando máquina, inicio de parada y comentarios.",
      content: (
        <div className="pres-img-container">
          <img src="/media_1787495429496.jpg" alt="Telegram Notification" className="pres-screenshot" />
        </div>
      )
    },
    {
      subtitle: "Salidas de Información",
      title: "Tableros de Analítica y Reportes BI",
      desc: "Los datos operativos de tiempos muertos se vuelcan automáticamente en Google Sheets y alimentan el dashboard analítico de Looker Studio de forma ágil.",
      content: (
        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          <div style={{ padding: "20px", background: "#111", border: "1px solid #222", borderLeft: "4px solid var(--brand-lumo)" }}>
            <h4 style={{ margin: "0 0 6px 0", fontSize: "16px", color: "#fff" }}>Análisis de Tendencias</h4>
            <p style={{ margin: 0, fontSize: "13.5px", color: "var(--text-muted)", lineHeight: "1.45" }}>Permite evaluar paradas acumuladas por motivo, máquina y operador, observando la evolución histórica.</p>
          </div>
          <div style={{ padding: "20px", background: "#111", border: "1px solid #222", borderLeft: "4px solid var(--brand-lumo)" }}>
            <h4 style={{ margin: "0 0 6px 0", fontSize: "16px", color: "#fff" }}>Frecuencia de Reportes Incrementada</h4>
            <p style={{ margin: 0, fontSize: "13.5px", color: "var(--text-muted)", lineHeight: "1.45" }}>En lugar del procesamiento manual cada 15 días, el sistema permite visualizar desvíos diariamente o a la hora.</p>
          </div>
        </div>
      )
    },
    {
      subtitle: "Ecosistema de Datos",
      title: "Flujo Real de Información",
      desc: "Ciclo de vida del dato desde la planta hasta el panel gerencial. Cada paso cuenta con almacenamiento persistente para garantizar cero pérdidas y alertas instantáneas.",
      layout: "full",
      content: (
        <div style={{ display: "flex", flexDirection: "column", gap: "16px", width: "100%", maxWidth: "900px", padding: "10px", margin: "0 auto" }}>
          {/* Tier 1: Captura */}
          <div style={{ border: "1px dashed #333", padding: "12px", background: "rgba(255,255,255,0.01)" }}>
            <span style={{ fontSize: "10px", color: "var(--text-dim)", textTransform: "uppercase", letterSpacing: "1.5px", display: "block", marginBottom: "8px" }}>1. Captura en Planta</span>
            <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
              <div className="flow-step step-1" style={{ flex: 1, padding: "10px", background: "#111", border: "1px solid #222", textAlign: "center", borderRadius: "2px" }}>
                <span style={{ fontSize: "12px", color: "var(--brand-lumo)", fontWeight: "bold" }}>Tablet Táctil</span>
                <div style={{ fontSize: "10.5px", color: "var(--text-muted)", marginTop: "4px" }}>Registro Operario</div>
              </div>
              <div style={{ color: "var(--text-dim)", fontSize: "12px" }}>➔</div>
              <div className="flow-step step-2" style={{ flex: 1, padding: "10px", background: "#111", border: "1px solid #222", textAlign: "center", borderRadius: "2px" }}>
                <span style={{ fontSize: "12px", color: "var(--brand-lumo)", fontWeight: "bold" }}>Base SQLite</span>
                <div style={{ fontSize: "10.5px", color: "var(--text-muted)", marginTop: "4px" }}>Copia de Respaldo</div>
              </div>
            </div>
          </div>

          {/* Tier 2: Servidor */}
          <div style={{ border: "1px dashed #333", padding: "12px", background: "rgba(255,255,255,0.01)" }}>
            <span style={{ fontSize: "10px", color: "var(--text-dim)", textTransform: "uppercase", letterSpacing: "1.5px", display: "block", marginBottom: "8px" }}>2. Monitoreo y Notificaciones Local-First</span>
            <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
              <div className="flow-step step-3" style={{ flex: 1, padding: "10px", background: "#111", border: "1px solid #222", textAlign: "center", borderRadius: "2px" }}>
                <span style={{ fontSize: "12px", color: "var(--brand-lumo)", fontWeight: "bold" }}>Servidor Local</span>
                <div style={{ fontSize: "10.5px", color: "var(--text-muted)", marginTop: "4px" }}>Portal Web WebSockets</div>
              </div>
              <div style={{ color: "var(--text-dim)", fontSize: "12px" }}>➔</div>
              <div className="flow-step step-4" style={{ flex: 1, padding: "10px", background: "#111", border: "1px solid #222", textAlign: "center", borderRadius: "2px" }}>
                <span style={{ fontSize: "12px", color: "var(--brand-lumo)", fontWeight: "bold" }}>Base Postgres</span>
                <div style={{ fontSize: "10.5px", color: "var(--text-muted)", marginTop: "4px" }}>Historial en Planta</div>
              </div>
              <div style={{ color: "var(--text-dim)", fontSize: "12px" }}>➔</div>
              <div className="flow-step step-5" style={{ flex: 1, padding: "10px", background: "#111", border: "1px solid #222", textAlign: "center", borderRadius: "2px" }}>
                <span style={{ fontSize: "12px", color: "var(--accent-rose)", fontWeight: "bold" }}>Bot Telegram</span>
                <div style={{ fontSize: "10.5px", color: "var(--text-muted)", marginTop: "4px" }}>Alertas Inmediatas</div>
              </div>
            </div>
          </div>

          {/* Tier 3: Analítica */}
          <div style={{ border: "1px dashed #333", padding: "12px", background: "rgba(255,255,255,0.01)" }}>
            <span style={{ fontSize: "10px", color: "var(--text-dim)", textTransform: "uppercase", letterSpacing: "1.5px", display: "block", marginBottom: "8px" }}>3. Nube y Analytics BI</span>
            <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
              <div className="flow-step step-6" style={{ flex: 1, padding: "10px", background: "#111", border: "1px solid #222", textAlign: "center", borderRadius: "2px" }}>
                <span style={{ fontSize: "12px", color: "var(--brand-lumo)", fontWeight: "bold" }}>Google Sheets</span>
                <div style={{ fontSize: "10.5px", color: "var(--text-muted)", marginTop: "4px" }}>Volcado en Nube</div>
              </div>
              <div style={{ color: "var(--text-dim)", fontSize: "12px" }}>➔</div>
              <div className="flow-step step-7" style={{ flex: 1, padding: "10px", background: "#111", border: "1px solid #222", textAlign: "center", borderRadius: "2px" }}>
                <span style={{ fontSize: "12px", color: "var(--brand-lumo)", fontWeight: "bold" }}>Looker Studio</span>
                <div style={{ fontSize: "10.5px", color: "var(--text-muted)", marginTop: "4px" }}>Dashboard BI</div>
              </div>
            </div>
          </div>
        </div>
      )
    },
    {
      subtitle: "Resiliencia Operativa",
      title: "Seguridad de Operación (Local-First)",
      desc: "La colecta de datos y el portal de supervisión corren de forma 100% autónoma en la red local de planta. No se detienen si no hay conexión a internet.",
      content: (
        <div style={{ padding: "24px", background: "#090909", border: "1px solid #222" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "13.5px" }}>
              <span>Registro Tablet &gt; Server Local:</span>
              <strong style={{ color: "var(--accent-emerald)" }}>CONECTADO (Local Wi-Fi)</strong>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "13.5px" }}>
              <span>Portal de Supervisión:</span>
              <strong style={{ color: "var(--accent-emerald)" }}>ACTIVO (Red Interna)</strong>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "13.5px" }}>
              <span>Notificaciones Celular / Nube:</span>
              <strong style={{ color: "var(--brand-lumo)" }}>PAUSADO (Espera Internet)</strong>
            </div>
            <div style={{ fontSize: "12px", color: "var(--text-dim)", marginTop: "8px", textAlign: "center", borderTop: "1px solid #222", paddingTop: "10px" }}>
              Los datos se guardan de forma segura localmente y se transmiten a la nube de manera automática una vez retorne el enlace de internet.
            </div>
          </div>
        </div>
      )
    },
    {
      subtitle: "Estado del Desarrollo",
      title: "¿Dónde estamos parados hoy?",
      desc: "Módulos completados técnicamente y listos para validar hoy en conjunto con el equipo de COAMA SudAmerica.",
      content: (
        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          <div style={{ padding: "16px", background: "#111", border: "1px solid #222" }}>
            <span style={{ fontSize: "10px", fontWeight: "bold", color: "var(--brand-lumo)", display: "block" }}>90% - SUJETO A VALIDACIÓN HOY</span>
            <strong style={{ display: "block", fontSize: "15px", color: "#fff", margin: "4px 0" }}>Diseño Portal Supervisor</strong>
            <p style={{ margin: 0, fontSize: "12.5px", color: "var(--text-muted)" }}>Control estético oscuro 'lumo', KPI del turno dinámico sin scroll and visualizadores.</p>
          </div>
          <div style={{ padding: "16px", background: "#111", border: "1px solid #222" }}>
            <span style={{ fontSize: "10px", fontWeight: "bold", color: "var(--brand-lumo)", display: "block" }}>90% - SUJETO A VALIDACIÓN HOY</span>
            <strong style={{ display: "block", fontSize: "15px", color: "#fff", margin: "4px 0" }}>Alertas Telegram</strong>
            <p style={{ margin: 0, fontSize: "12.5px", color: "var(--text-muted)" }}>Bot en grupo de supervisores configurado y despachando paradas en vivo.</p>
          </div>
          <div style={{ padding: "16px", background: "#111", border: "1px solid #222" }}>
            <span style={{ fontSize: "10px", fontWeight: "bold", color: "var(--brand-lumo)", display: "block" }}>90% - SUJETO A VALIDACIÓN HOY</span>
            <strong style={{ display: "block", fontSize: "15px", color: "#fff", margin: "4px 0" }}>Administración</strong>
            <p style={{ margin: 0, fontSize: "12.5px", color: "var(--text-muted)" }}>ABM de razones y orígenes con eliminación segura contra base Postgres.</p>
          </div>
        </div>
      )
    },
    {
      subtitle: "Planificación de Entregas",
      title: "Módulos en Desarrollo Activo",
      desc: "Módulos en curso para la etapa final de implementación.",
      content: (
        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          <div style={{ padding: "20px", background: "#111", border: "1px solid #222" }}>
            <span style={{ fontSize: "10px", fontWeight: "bold", color: "var(--brand-lumo)", display: "block" }}>HITOS EN PROCESO:</span>
            <div style={{ display: "flex", justifyContent: "space-between", marginTop: "12px", fontSize: "14px" }}>
              <span>App Tablets (Capacitor/Android):</span>
              <strong style={{ color: "var(--brand-lumo)" }}>En avance</strong>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", marginTop: "8px", fontSize: "14px" }}>
              <span>Dashboard Looker Studio (BI):</span>
              <strong style={{ color: "var(--brand-lumo)" }}>Definiendo KPIs</strong>
            </div>
          </div>
        </div>
      )
    },
    {
      subtitle: "Agenda de la Reunión",
      title: "Decisiones y Objetivos de Hoy",
      desc: "Establecer las definiciones funcionales de Looker Studio y validar el Portal y Alertas.",
      content: (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px" }}>
          <div style={{ padding: "20px", background: "#111", border: "1px solid #222", borderLeft: "4px solid var(--brand-lumo)" }}>
            <strong style={{ fontSize: "15px", color: "#fff", display: "block", marginBottom: "6px" }}>1. Validar Portal & Alertas</strong>
            <p style={{ margin: 0, fontSize: "13px", color: "var(--text-muted)", lineHeight: "1.45" }}>Confirmar usabilidad del Portal del Supervisor y entrega de alertas.</p>
          </div>
          <div style={{ padding: "20px", background: "#111", border: "1px solid #222", borderLeft: "4px solid var(--brand-lumo)" }}>
            <strong style={{ fontSize: "15px", color: "#fff", display: "block", marginBottom: "6px" }}>2. Requerimientos BI</strong>
            <p style={{ margin: 0, fontSize: "13px", color: "var(--text-muted)", lineHeight: "1.45" }}>Definir métricas críticas para el Dashboard en Google Sheets / Looker Studio.</p>
          </div>
        </div>
      )
    },
    {
      subtitle: "Lumo Secaderos",
      title: "Próximos Pasos & Calendario",
      desc: "Finalización del diseño y validación para iniciar la etapa de desarrollo y piloto en planta.",
      layout: "full",
      content: (
        <div style={{ display: "flex", flexDirection: "column", gap: "20px", alignItems: "center", width: "100%" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "24px", marginBottom: "8px" }}>
            <img src="/lumo-transparent-logo.png" alt="Lumo Logo" style={{ maxHeight: "30px", width: "auto" }} />
            <div style={{ width: "1px", height: "20px", background: "var(--border-subtle)" }} />
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <img src="/coama-logo.png" alt="COAMA Logo" style={{ maxHeight: "24px" }} />
              <span style={{ fontSize: "13px", fontWeight: "bold", color: "#fff" }}>COAMA SudAmerica</span>
            </div>
          </div>
          <img src="/media_1787495222553.png" alt="Gantt Project" style={{ width: "100%", maxWidth: "1000px", maxHeight: "45vh", objectFit: "contain", border: "1px solid #222", boxShadow: "0 20px 50px rgba(0, 0, 0, 0.85)" }} />
          <span style={{ fontSize: "11px", color: "var(--text-dim)", fontFamily: "var(--font-mono)" }}>Hoy: dom, 23 de agosto - Etapa de Diseño & Validación</span>
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
      <div style={{ position: "absolute", top: "24px", left: "4%", display: "flex", alignItems: "center", gap: "10px", opacity: 0.45, zIndex: 10001 }}>
        <img src="/lumo-icon.png" alt="Lumo" style={{ height: "24px", width: "auto" }} />
        <span style={{ fontSize: "11px", fontWeight: "bold", fontFamily: "var(--font-mono)", letterSpacing: "2.5px", textTransform: "uppercase", color: "#ffffff" }}>LUMO</span>
      </div>

      <button className="presentation-close-btn" onClick={onClose}>
        Volver al portal <X size={14} style={{ marginLeft: "4px" }} />
      </button>

      <div className="presentation-slide-container">
        {slides.map((slide, index) => {
          const isActive = index === currentSlide;
          return (
            <div key={index} className={`presentation-slide ${isActive ? "active" : ""}`}>
              {slide.layout === "full" ? (
                <div style={{ display: "flex", flexDirection: "column", height: "100%", width: "100%", justifyContent: "center" }}>
                  <div style={{ textAlign: "center", marginBottom: "20px" }}>
                    <span className="pres-subtitle" style={{ display: "block", marginBottom: "8px" }}>{slide.subtitle}</span>
                    <h2 className="pres-title" style={{ fontSize: "38px", margin: "0 0 8px 0" }}>{slide.title}</h2>
                    <p className="pres-desc" style={{ fontSize: "16px", margin: "0 auto 16px auto", maxWidth: "800px" }}>{slide.desc}</p>
                  </div>
                  <div className="pres-img-container" style={{ flex: 1 }}>
                    {slide.content}
                  </div>
                </div>
              ) : (
                <div className="pres-grid-2">
                  <div style={{ display: "flex", flexDirection: "column", justifyContent: "center" }}>
                    <span className="pres-subtitle">{slide.subtitle}</span>
                    <h2 className="pres-title">{slide.title}</h2>
                    <p className="pres-desc">{slide.desc}</p>
                  </div>
                  <div>
                    {slide.content}
                  </div>
                </div>
              )}
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
