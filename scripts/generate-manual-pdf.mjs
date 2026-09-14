import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

// Helper to convert image file to Base64
function getBase64Image(filePath) {
  if (!fs.existsSync(filePath)) return '';
  const fileData = fs.readFileSync(filePath);
  const ext = path.extname(filePath).substring(1).toLowerCase();
  const mimeType = ext === 'png' ? 'image/png' : ext === 'jpg' || ext === 'jpeg' ? 'image/jpeg' : 'image/svg+xml';
  return `data:${mimeType};base64,${fileData.toString('base64')}`;
}

const lumoLogoBase64 = getBase64Image(path.join(rootDir, 'apps/supervisor-web/public/lumo-transparent-logo.png'));
const coamaLogoBase64 = getBase64Image(path.join(rootDir, 'apps/supervisor-web/public/coama-logo.png'));
const lumoFullLogoBase64 = getBase64Image(path.join(rootDir, 'apps/supervisor-web/public/lumo-full-logo.png'));

const htmlContent = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <title>Manual Operativo de Despliegue e Instalación - LUMO Secaderos COAMA</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Montserrat:ital,wght@0,300;0,400;0,500;0,600;0,700;0,800;1,400;1,600&display=swap');

    @page {
      size: A4;
      margin: 12mm 14mm 14mm 14mm;
    }

    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }

    body {
      font-family: 'Montserrat', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      color: #1E293B;
      background-color: #FFFFFF;
      font-size: 9pt;
      line-height: 1.45;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }

    .page-break {
      page-break-after: always;
      break-after: page;
    }

    .avoid-break {
      break-inside: avoid;
      page-break-inside: avoid;
    }

    /* --- COVER / HEADER --- */
    .header-banner {
      background: linear-gradient(135deg, #0B132B 0%, #1C2541 60%, #1E293B 100%);
      color: #FFFFFF;
      padding: 22px 26px;
      border-radius: 12px;
      border-bottom: 5px solid #EA580C;
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 18px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.12);
    }

    .header-titles h1 {
      font-size: 17pt;
      font-weight: 800;
      letter-spacing: -0.5px;
      color: #FFFFFF;
      text-transform: uppercase;
      margin-bottom: 3px;
    }

    .header-titles h1 span {
      color: #F97316;
    }

    .header-titles p {
      font-size: 9.5pt;
      font-weight: 500;
      color: #94A3B8;
    }

    .header-logos {
      display: flex;
      align-items: center;
      gap: 14px;
    }

    .header-logos img {
      max-height: 44px;
      object-fit: contain;
    }

    .meta-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 10px;
      margin-bottom: 18px;
    }

    .meta-card {
      background-color: #FFF7ED;
      border: 1px solid #FFEDD5;
      border-left: 4px solid #EA580C;
      padding: 8px 12px;
      border-radius: 8px;
    }

    .meta-card .label {
      font-size: 7pt;
      text-transform: uppercase;
      font-weight: 700;
      color: #C2410C;
      letter-spacing: 0.5px;
    }

    .meta-card .value {
      font-size: 9pt;
      font-weight: 700;
      color: #0F172A;
      margin-top: 1px;
    }

    /* --- SECTION STYLING --- */
    .section-header {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-top: 18px;
      margin-bottom: 10px;
      border-bottom: 2px solid #FED7AA;
      padding-bottom: 5px;
    }

    .section-badge {
      background: linear-gradient(135deg, #EA580C 0%, #C2410C 100%);
      color: #FFFFFF;
      font-weight: 800;
      font-size: 8.5pt;
      padding: 3px 8px;
      border-radius: 6px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .section-title {
      font-size: 11.5pt;
      font-weight: 800;
      color: #0F172A;
    }

    h3 {
      font-size: 9.5pt;
      font-weight: 700;
      color: #C2410C;
      margin-top: 10px;
      margin-bottom: 4px;
      display: flex;
      align-items: center;
      gap: 5px;
    }

    p {
      margin-bottom: 6px;
      color: #334155;
    }

    ul, ol {
      margin-left: 16px;
      margin-bottom: 8px;
    }

    li {
      margin-bottom: 3px;
      color: #334155;
    }

    /* --- CODE BLOCKS & COMMANDS --- */
    .code-block {
      background-color: #0F172A;
      color: #F8FAFC;
      font-family: 'Consolas', 'Courier New', monospace;
      font-size: 8pt;
      line-height: 1.4;
      padding: 10px 14px;
      border-radius: 7px;
      border-left: 4px solid #F97316;
      margin: 6px 0 10px 0;
      white-space: pre-wrap;
      word-break: break-all;
    }

    .code-comment {
      color: #94A3B8;
    }

    .code-cmd {
      color: #38BDF8;
      font-weight: 600;
    }

    .code-param {
      color: #A7F3D0;
    }

    .code-highlight {
      color: #FDE047;
      font-weight: 700;
    }

    /* --- CALLOUT BOXES --- */
    .callout {
      border-radius: 7px;
      padding: 8px 12px;
      margin: 8px 0;
      font-size: 8.5pt;
      line-height: 1.4;
    }

    .callout-warning {
      background-color: #FFF7ED;
      border: 1px solid #FDBA74;
      border-left: 4px solid #EA580C;
      color: #9A3412;
    }

    .callout-warning strong {
      color: #C2410C;
    }

    .callout-tip {
      background-color: #F0FDF4;
      border: 1px solid #86EFAC;
      border-left: 4px solid #16A34A;
      color: #14532D;
    }

    .callout-tip strong {
      color: #15803D;
    }

    .callout-important {
      background-color: #FEF2F2;
      border: 1px solid #FCA5A5;
      border-left: 4px solid #DC2626;
      color: #7F1D1D;
    }

    .callout-important strong {
      color: #B91C1C;
    }

    .callout-info {
      background-color: #EFF6FF;
      border: 1px solid #BFDBFE;
      border-left: 4px solid #2563EB;
      color: #1E3A8A;
    }

    .callout-info strong {
      color: #1D4ED8;
    }

    /* --- CHECKLIST ITEMS --- */
    .checklist-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 8px;
      margin: 8px 0;
    }

    .checklist-card {
      background: #F8FAFC;
      border: 1px solid #E2E8F0;
      border-radius: 7px;
      padding: 8px 10px;
      display: flex;
      align-items: flex-start;
      gap: 8px;
    }

    .checklist-icon {
      background-color: #EA580C;
      color: white;
      font-weight: 800;
      width: 20px;
      height: 20px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 7.5pt;
      flex-shrink: 0;
    }

    .checklist-text strong {
      display: block;
      color: #0F172A;
      font-size: 8.5pt;
    }

    .checklist-text span {
      font-size: 7.5pt;
      color: #64748B;
    }

    /* --- TABLES & TROUBLESHOOTING --- */
    table {
      width: 100%;
      border-collapse: collapse;
      margin: 10px 0;
      font-size: 8pt;
    }

    th {
      background-color: #0F172A;
      color: #FFFFFF;
      text-align: left;
      padding: 7px 9px;
      font-weight: 700;
      font-size: 8pt;
      border: 1px solid #334155;
    }

    td {
      padding: 6px 9px;
      border: 1px solid #E2E8F0;
      vertical-align: top;
      line-height: 1.35;
    }

    tr:nth-child(even) {
      background-color: #F8FAFC;
    }

    .problem-title {
      font-weight: 700;
      color: #B91C1C;
    }

    .solution-list {
      margin-left: 14px;
      margin-bottom: 0;
    }

    .solution-list li {
      margin-bottom: 2px;
    }

    /* --- STEPS NUMBERED --- */
    .step-container {
      margin: 10px 0;
      padding-left: 8px;
    }

    .step-item {
      display: flex;
      gap: 12px;
      margin-bottom: 12px;
    }

    .step-number {
      background: #0F172A;
      color: #F97316;
      font-weight: 800;
      font-size: 10pt;
      width: 26px;
      height: 26px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
      border: 2px solid #EA580C;
    }

    .step-content {
      flex: 1;
    }

    .step-content strong {
      color: #0F172A;
      font-size: 9pt;
    }

    /* --- FOOTER --- */
    .footer {
      margin-top: 18px;
      padding-top: 10px;
      border-top: 1px solid #CBD5E1;
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 7.5pt;
      color: #64748B;
    }

    .footer-brand {
      font-weight: 700;
      color: #EA580C;
    }

    .badge-pill {
      display: inline-block;
      padding: 2px 6px;
      border-radius: 4px;
      font-size: 7.5pt;
      font-weight: 700;
    }
    .badge-green { background: #DCFCE7; color: #15803D; }
    .badge-blue { background: #DBEAFE; color: #1D4ED8; }
    .badge-orange { background: #FFEDD5; color: #C2410C; }
  </style>
</head>
<body>

  <!-- ==================== PÁGINA 1 ==================== -->

  <!-- COVER HEADER -->
  <div class="header-banner">
    <div class="header-titles">
      <h1>LUMO <span>SECADEROS</span></h1>
      <p>Manual Operativo de Despliegue, Configuración e Implantación en Planta</p>
    </div>
    <div class="header-logos">
      ${coamaLogoBase64 ? `<img src="${coamaLogoBase64}" alt="COAMA Logo" style="background: white; padding: 4px 8px; border-radius: 6px; height: 38px;">` : ''}
      ${lumoLogoBase64 ? `<img src="${lumoLogoBase64}" alt="LUMO Logo" style="height: 42px;">` : ''}
    </div>
  </div>

  <!-- META GRID -->
  <div class="meta-grid">
    <div class="meta-card">
      <div class="label">Sistema</div>
      <div class="value">LUMO Secaderos v2.1</div>
    </div>
    <div class="meta-card">
      <div class="label">Cliente / Planta</div>
      <div class="value">COAMA - Misiones</div>
    </div>
    <div class="meta-card">
      <div class="label">Entorno</div>
      <div class="value">Windows 10/11 + Android</div>
    </div>
    <div class="meta-card">
      <div class="label">Soporte Técnico</div>
      <div class="value">LUMO Data Solutions</div>
    </div>
  </div>

  <!-- SECCIÓN 1: INTRODUCCIÓN Y ARQUITECTURA -->
  <div class="section-header">
    <span class="section-badge">Fase 0</span>
    <span class="section-title">Arquitectura de Operación: Modo Memoria vs PostgreSQL</span>
  </div>

  <p>El sistema <strong>LUMO Secaderos</strong> está diseñado con una arquitectura híbrida y tolerante a fallos que permite operar de manera fluida en entornos industriales:</p>

  <div class="checklist-grid">
    <div class="checklist-card">
      <div class="checklist-icon">💾</div>
      <div class="checklist-text">
        <strong>Modo Memoria (<span class="badge-pill badge-green">Recomendado Año 1</span>)</strong>
        <span>Velocidad instantánea, cero mantenimiento. Persistencia inmediata a disco en <code>store_snapshot.json</code> + respaldo en tiempo real en Google Sheets.</span>
      </div>
    </div>
    <div class="checklist-card">
      <div class="checklist-icon">🐘</div>
      <div class="checklist-text">
        <strong>Modo PostgreSQL (<span class="badge-pill badge-blue">Opcional / Futuro</span>)</strong>
        <span>Base de datos relacional SQL estándar en puerto 5432 o 5233. Auto-migraciones al arrancar y puente de migración con <code>npm run db:migrate</code>.</span>
      </div>
    </div>
  </div>

  <div class="callout callout-tip">
    <strong>💡 ¿Por qué el modo Memoria es la opción ideal para arrancar en COAMA?</strong><br>
    Con 3 secaderos y ~20 paradas por día, en 1 año se acumulan apenas ~7.000 eventos (~10 MB en disco). El servidor graba cada parada al instante en disco y la envía a Google Sheets. No requiere mantener servicios de bases de datos, no sufre bloqueos de puertos ni contraseñas, y es 100% Plug & Play. Si en el futuro se desea pasar a PostgreSQL, un solo comando (<code>npm run db:migrate</code>) pasa todo el historial acumulado en 3 segundos.
  </div>

  <!-- SECCIÓN 2: PREPARACIÓN DEL SERVIDOR -->
  <div class="section-header">
    <span class="section-badge">Fase 1</span>
    <span class="section-title">Preparación de la PC Servidor en Planta</span>
  </div>

  <div class="step-container">
    <div class="step-item">
      <div class="step-number">1</div>
      <div class="step-content">
        <strong>Instalar Requisitos Previos en Windows:</strong>
        <p>Asegúrate de que la PC tenga instalado <strong>Node.js (versión 20 o superior LTS)</strong> desde <code>https://nodejs.org</code>.</p>
      </div>
    </div>

    <div class="step-item">
      <div class="step-number">2</div>
      <div class="step-content">
        <strong>Copiar la Carpeta del Proyecto:</strong>
        <p>Copia la carpeta completa <code>coama-secaderos-2</code> en una ruta estable de la PC servidor (recomendado: <code>C:\\COAMA\\APP SECADEROS\\coama-secaderos-2</code>).</p>
      </div>
    </div>

    <div class="step-item">
      <div class="step-number">3</div>
      <div class="step-content">
        <strong>Configuración del Archivo <code>.env</code>:</strong>
        <p>Abre el archivo <code>.env</code> en la raíz del proyecto con el Bloc de Notas y verifica las variables principales:</p>
        <div class="code-block"><span class="code-comment"># Configuración para Modo Memoria (Recomendado Planta)</span>
<span class="code-cmd">API_HOST</span>=0.0.0.0
<span class="code-cmd">API_PORT</span>=8080
<span class="code-cmd">API_STORE</span>=<span class="code-highlight">memory</span>

<span class="code-comment"># Google Sheets & Telegram</span>
<span class="code-cmd">GOOGLE_SHEET_ID</span>=1ClFiLfrXfx1N_EehFHvXahuBvc3BqRjnylZ0k2Q5QMk
<span class="code-cmd">GOOGLE_APPLICATION_CREDENTIALS</span>=google-credentials.json
<span class="code-cmd">TELEGRAM_BOT_TOKEN</span>=8896313489:AAHy1RPy6nndrr2m7a5nkh7dRnGdnsGrO5U
<span class="code-cmd">TELEGRAM_CHAT_ID</span>=-5157803919</div>
      </div>
    </div>
  </div>

  <div class="footer">
    <div><span class="footer-brand">LUMO Data Solutions</span> &copy; 2026 - Manual de Despliegue COAMA Secaderos</div>
    <div>Página 1 de 4</div>
  </div>

  <div class="page-break"></div>

  <!-- ==================== PÁGINA 2 ==================== -->

  <!-- SECCIÓN 3: RED Y FIREWALL -->
  <div class="section-header">
    <span class="section-badge">Fase 2</span>
    <span class="section-title">Configuración de Red Local y Firewall de Windows</span>
  </div>

  <div class="callout callout-important">
    <strong>⚠️ LECCIÓN CRÍTICA DE CAMPO: Red Pública vs Red Privada en Windows</strong><br>
    Por defecto, cuando Windows se conecta a un nuevo router WiFi o cable de red en planta, lo cataloga como <em>"Red Pública"</em>. Esto <strong>bloquea automáticamente todas las conexiones entrantes</strong> desde las tablets hacia el puerto 8080.
  </div>

  <h3>Paso a Paso para Habilitar Acceso de las Tablets:</h3>
  <div class="step-container">
    <div class="step-item">
      <div class="step-number">1</div>
      <div class="step-content">
        <strong>Ejecutar el Habilitador Automático como Administrador:</strong>
        <p>Haz clic derecho sobre el archivo <code>Habilitar_Acceso_Red_Local.bat</code> y selecciona <strong>"Ejecutar como Administrador"</strong>.</p>
        <p>Este script detecta la IP real de la PC, cambia el perfil de red a <strong>Privada</strong> y abre los puertos <strong>8080</strong> (API y Web) y <strong>5173</strong> (Dev).</p>
      </div>
    </div>

    <div class="step-item">
      <div class="step-number">2</div>
      <div class="step-content">
        <strong>Comando Manual Alternativo en PowerShell (Administrador):</strong>
        <div class="code-block"><span class="code-comment"># 1. Cambiar la red activa a categoría Privada</span>
<span class="code-cmd">Set-NetConnectionProfile</span> -NetworkCategory <span class="code-highlight">Private</span>

<span class="code-comment"># 2. Abrir regla de firewall para el servidor LUMO</span>
<span class="code-cmd">New-NetFirewallRule</span> -DisplayName "LUMO Secaderos API (8080)" -Direction Inbound -LocalPort 8080 -Protocol TCP -Action Allow</div>
      </div>
    </div>

    <div class="step-item">
      <div class="step-number">3</div>
      <div class="step-content">
        <strong>Identificar la IP de la PC Servidor:</strong>
        <p>Abre PowerShell o CMD y escribe <code>ipconfig</code>. Busca la <em>"Dirección IPv4"</em> (ejemplo: <code>192.168.1.32</code> o <code>192.168.10.50</code>). Anota esta IP, ya que es la que se ingresará en las tablets.</p>
        <div class="callout callout-tip">
          <strong>💡 Consejo de Planta:</strong> Se recomienda solicitar al área de sistemas de COAMA que fijen la IP de la PC Servidor por DHCP (IP Estática) para que no cambie al reiniciar el router.
        </div>
      </div>
    </div>
  </div>

  <!-- SECCIÓN 4: INSTALACIÓN EN TABLETS -->
  <div class="section-header">
    <span class="section-badge">Fase 3</span>
    <span class="section-title">Instalación y Vinculación de Tablets Android</span>
  </div>

  <p>En cada una de las 3 tablets (OMECO, BENECKE, RAUTE), sigue este procedimiento:</p>

  <div class="step-container">
    <div class="step-item">
      <div class="step-number">1</div>
      <div class="step-content">
        <strong>Transferir e Instalar el APK:</strong>
        <p>Copia el archivo <code>Coama_secaderos_LUMO.apk</code> a la tablet mediante cable USB, pendrive o descargándolo desde el navegador de la tablet apuntando a <code>http://IP_SERVIDOR:8080/supervisor</code>.</p>
        <p>Toca el archivo e instala. Si Android solicita permisos de <em>"Instalar aplicaciones desconocidas"</em>, actívalo.</p>
      </div>
    </div>

    <div class="step-item">
      <div class="step-number">2</div>
      <div class="step-content">
        <strong>Configurar la IP del Servidor en la Tablet:</strong>
        <p>Abre la aplicación <strong>LUMO Secaderos</strong>. En la pantalla inicial de selección:</p>
        <ul>
          <li>Toca el botón con forma de <strong>Engranaje ⚙️</strong> en la esquina superior derecha.</li>
          <li>Ingresa la URL del servidor con el puerto: <code>http://192.168.1.XX:8080</code> (reemplazando <code>192.168.1.XX</code> por la IP real del servidor).</li>
          <li>Toca <strong>"Guardar y Probar Conexión"</strong>. Debe aparecer el mensaje <em>"Conexión exitosa"</em> en verde.</li>
        </ul>
      </div>
    </div>

    <div class="step-item">
      <div class="step-number">3</div>
      <div class="step-content">
        <strong>Asignar el Secadero Correspondiente:</strong>
        <p>Selecciona el secadero que corresponde a la tablet física:</p>
        <ul>
          <li>Tablet 1: <strong>OMECO</strong> (Identificador: <code>tab-sec-omeco</code>)</li>
          <li>Tablet 2: <strong>BENECKE</strong> (Identificador: <code>tab-sec-benecke</code>)</li>
          <li>Tablet 3: <strong>RAUTE</strong> (Identificador: <code>tab-sec-raute</code>)</li>
        </ul>
      </div>
    </div>
  </div>

  <div class="footer">
    <div><span class="footer-brand">LUMO Data Solutions</span> &copy; 2026 - Manual de Despliegue COAMA Secaderos</div>
    <div>Página 2 de 4</div>
  </div>

  <div class="page-break"></div>

  <!-- ==================== PÁGINA 3 ==================== -->

  <!-- SECCIÓN 5: PUESTA EN MARCHA E INICIO AUTOMÁTICO -->
  <div class="section-header">
    <span class="section-badge">Fase 4</span>
    <span class="section-title">Puesta en Marcha e Inicio Automático con Windows</span>
  </div>

  <h3>Modos de Inicio del Sistema:</h3>
  <table style="margin-bottom: 14px;">
    <thead>
      <tr>
        <th style="width: 25%;">Archivo / Script</th>
        <th style="width: 35%;">Descripción</th>
        <th style="width: 40%;">Uso Recomendado</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td><code>run-system.bat</code></td>
        <td>Inicia la API y el portal web en consolas visibles con logs detallados.</td>
        <td><strong>Pruebas iniciales y diagnóstico:</strong> Permite ver en tiempo real cada evento recibido.</td>
      </tr>
      <tr>
        <td><code>Iniciar_Lumo_Secaderos.vbs</code></td>
        <td>Inicia todo en <strong>segundo plano silencioso</strong> (sin ventanas CMD que puedan cerrarse por error).</td>
        <td><strong>Producción diaria:</strong> Ideal para que el operador no cierre accidentalmente las ventanas.</td>
      </tr>
      <tr>
        <td><code>Detener_Servicios.bat</code></td>
        <td>Cierra limpiamente todos los procesos de Node.js en ejecución y libera puertos.</td>
        <td>Para reiniciar el sistema o aplicar cambios de configuración.</td>
      </tr>
    </tbody>
  </table>

  <h3>Configuración del Inicio Automático (Autostart con Windows):</h3>
  <p>Para que el sistema se inicie solo cada vez que se encienda o reinicie la PC de COAMA:</p>
  <div class="step-container">
    <div class="step-item">
      <div class="step-number">1</div>
      <div class="step-content">
        <strong>Ejecutar el Configurador:</strong>
        <p>Haz doble clic en <code>configurar-inicio-automatico.bat</code>. Creará un acceso directo en la carpeta de inicio de Windows (<code>shell:startup</code>) apuntando a <code>Iniciar_Lumo_Secaderos.vbs</code>.</p>
      </div>
    </div>
    <div class="step-item">
      <div class="step-number">2</div>
      <div class="step-content">
        <strong>Crear Acceso Directo en el Escritorio:</strong>
        <p>Haz doble clic en <code>Crear_Acceso_Directo_Escritorio.bat</code> para tener en el escritorio el ícono de acceso rápido al Portal Supervisor Web.</p>
      </div>
    </div>
  </div>

  <!-- SECCIÓN 6: ACCESO AL PORTAL SUPERVISOR Y REPORTES -->
  <div class="section-header">
    <span class="section-badge">Fase 5</span>
    <span class="section-title">Portal Supervisor, Reportes Excel y Sincronización</span>
  </div>

  <div class="checklist-grid">
    <div class="checklist-card">
      <div class="checklist-icon">🌐</div>
      <div class="checklist-text">
        <strong>Acceso al Portal Supervisor Web</strong>
        <span>Desde cualquier PC o celular conectado a la red de COAMA:<br><code>http://IP_SERVIDOR:8080/supervisor</code></span>
      </div>
    </div>
    <div class="checklist-card">
      <div class="checklist-icon">📊</div>
      <div class="checklist-text">
        <strong>Exportación para ERP / Excel</strong>
        <span>Descarga directa de planilla <code>.xlsx</code> con la cuadrícula horaria y consolidado por turnos desde el botón <strong>"Exportar Excel"</strong> en el encabezado.</span>
      </div>
    </div>
  </div>

  <div class="callout callout-info">
    <strong>☁️ Sincronización Continua en la Nube (Google Sheets & Looker Studio):</strong><br>
    El servidor sincroniza automáticamente cada evento en las pestañas <code>BD_TIEMPOS_MUERTOS</code> y <code>HOJA_TURNOS_SUPERVISOR</code> del Google Sheet oficial. El dashboard de Looker Studio se actualiza solo para la gerencia.
  </div>

  <div class="footer">
    <div><span class="footer-brand">LUMO Data Solutions</span> &copy; 2026 - Manual de Despliegue COAMA Secaderos</div>
    <div>Página 3 de 4</div>
  </div>

  <div class="page-break"></div>

  <!-- ==================== PÁGINA 4 ==================== -->

  <!-- SECCIÓN 7: GUÍA DE SOLUCIÓN DE PROBLEMAS (TROUBLESHOOTING) -->
  <div class="section-header">
    <span class="section-badge">Fase 6</span>
    <span class="section-title">Guía de Solución de Problemas (Lecciones de Campo)</span>
  </div>

  <table>
    <thead>
      <tr>
        <th style="width: 28%;">Problema Detectado</th>
        <th style="width: 32%;">Causa Raíz</th>
        <th style="width: 40%;">Solución Paso a Paso</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td class="problem-title">La Tablet no conecta al servidor ("Error de conexión")</td>
        <td>1. Windows tiene la red configurada en "Pública" (Firewall bloquea).<br>2. La IP configurada en la tablet cambió o es incorrecta.</td>
        <td>
          <ol class="solution-list">
            <li>Ejecuta <code>Habilitar_Acceso_Red_Local.bat</code> como Administrador.</li>
            <li>En la PC escribe <code>ipconfig</code> y verifica la IP real.</li>
            <li>En la tablet, toca el engranaje ⚙️ y pon <code>http://IP_REAL:8080</code>.</li>
          </ol>
        </td>
      </tr>
      <tr>
        <td class="problem-title">Error <code>column "ubicacion_obligatoria" does not exist</code> en PostgreSQL</td>
        <td>PostgreSQL se inició pero faltan aplicar migraciones de esquema posteriores.</td>
        <td>
          <ol class="solution-list">
            <li>En PowerShell corre: <code>npm run db:migrate</code>.</li>
            <li>O simplemente trabaja en <code>API_STORE=memory</code> en el archivo <code>.env</code> (altamente recomendado).</li>
          </ol>
        </td>
      </tr>
      <tr>
        <td class="problem-title">Error <code>password authentication failed</code> en PostgreSQL</td>
        <td>La contraseña en <code>.env</code> no coincide con la configurada en el instalador de Postgres.</td>
        <td>
          <ol class="solution-list">
            <li>Edita <code>.env</code>: para Docker usa <code>postgres://coama:coama_dev_password@127.0.0.1:5432/...</code>.</li>
            <li>Para Postgres nativo en Windows usa <code>postgres://postgres:TU_CLAVE@127.0.0.1:PUERTO/...</code>.</li>
          </ol>
        </td>
      </tr>
      <tr>
        <td class="problem-title">Error <code>EADDRINUSE</code> (Puerto 8080 ocupado)</td>
        <td>Un proceso anterior de Node quedó colgado en segundo plano.</td>
        <td>
          <ol class="solution-list">
            <li>Ejecuta <code>Detener_Servicios.bat</code>.</li>
            <li>O en PowerShell corre: <code>Stop-Process -Name node -Force</code>.</li>
            <li>Vuelve a iniciar con <code>start-services.bat</code>.</li>
          </ol>
        </td>
      </tr>
      <tr>
        <td class="problem-title">La Tablet se quedó sin WiFi durante una parada</td>
        <td>Caída de la señal inalámbrica en el sector de secaderos.</td>
        <td>
          <ol class="solution-list">
            <li><strong>No te preocupes:</strong> la tablet guarda todo en su base de datos interna local (Offline).</li>
            <li>Cuando la tablet vuelva a tener señal, sincronizará automáticamente todos los eventos con el servidor.</li>
          </ol>
        </td>
      </tr>
      <tr>
        <td class="problem-title">La PC Servidor se reinició o hubo corte de luz</td>
        <td>Reinicio normal de la máquina.</td>
        <td>
          <ol class="solution-list">
            <li>Si configuraste el inicio automático, el servidor arrancará solo.</li>
            <li>Recuperará el 100% de los datos desde <code>store_snapshot.json</code> en menos de 1 segundo.</li>
          </ol>
        </td>
      </tr>
    </tbody>
  </table>

  <!-- CHEAT SHEET DE COMANDOS RÁPIDOS -->
  <h3>Resumen de Comandos Rápidos de Emergencia (PowerShell):</h3>
  <div class="code-block"><span class="code-comment"># Ver estado de salud de la API (desde navegador o curl)</span>
<span class="code-cmd">curl</span> http://localhost:8080/health

<span class="code-comment"># Detener cualquier proceso de Node colgado</span>
<span class="code-cmd">Stop-Process</span> -Name node -Force

<span class="code-comment"># Migrar datos JSON a PostgreSQL en cualquier momento</span>
<span class="code-cmd">npm</span> run db:migrate

<span class="code-comment"># Cambiar red de Windows a Privada si las tablets se desconectan</span>
<span class="code-cmd">Set-NetConnectionProfile</span> -NetworkCategory Private</div>

  <div class="footer">
    <div><span class="footer-brand">LUMO Data Solutions</span> &copy; 2026 - Todos los derechos reservados | Documentación Oficial COAMA</div>
    <div>Página 4 de 4</div>
  </div>

</body>
</html>`;

const htmlFilePath = path.join(rootDir, 'Manual_Instalacion_LUMO_COAMA.html');
const pdfFilePath = path.join(rootDir, 'Manual_Instalacion_LUMO_COAMA.pdf');

fs.writeFileSync(htmlFilePath, htmlContent, 'utf-8');
console.log(`✓ Archivo HTML generado en: ${htmlFilePath}`);

// Edge executable paths on Windows
const candidateEdgePaths = [
  'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
  'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
  'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
];

let browserPath = candidateEdgePaths.find(p => fs.existsSync(p));

if (browserPath) {
  try {
    console.log(`... Generando PDF profesional con ${path.basename(browserPath)} Headless ...`);
    execSync(`"${browserPath}" --headless --disable-gpu --no-pdf-header-footer --print-to-pdf="${pdfFilePath}" "${htmlFilePath}"`);
    console.log(`✓ ARCHIVO PDF GENERADO CON ÉXITO: ${pdfFilePath}`);
  } catch (err) {
    console.error('Error generando PDF:', err.message);
  }
} else {
  console.log('Navegador no encontrado en rutas por defecto. Se conserva el archivo HTML listo para imprimir.');
}
