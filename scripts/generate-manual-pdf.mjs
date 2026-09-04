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
  <title>Manual de Instalación y Despliegue - LUMO Secaderos COAMA</title>
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
      font-family: 'Montserrat', -apple-system, BlinkMacSystemFont, sans-serif;
      color: #1E293B;
      background-color: #FFFFFF;
      font-size: 9.5pt;
      line-height: 1.5;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }

    .page-break {
      page-break-after: always;
    }

    .avoid-break {
      break-inside: avoid;
      page-break-inside: avoid;
    }

    /* --- COVER / HEADER --- */
    .header-banner {
      background: linear-gradient(135deg, #0F172A 0%, #1E293B 100%);
      color: #FFFFFF;
      padding: 24px 28px;
      border-radius: 12px;
      border-bottom: 5px solid #EA580C;
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 24px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.1);
    }

    .header-titles h1 {
      font-size: 20pt;
      font-weight: 800;
      letter-spacing: -0.5px;
      color: #FFFFFF;
      text-transform: uppercase;
      margin-bottom: 4px;
    }

    .header-titles h1 span {
      color: #F97316;
    }

    .header-titles p {
      font-size: 10pt;
      font-weight: 500;
      color: #94A3B8;
    }

    .header-logos {
      display: flex;
      align-items: center;
      gap: 16px;
    }

    .header-logos img {
      max-height: 48px;
      object-fit: contain;
    }

    .meta-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 12px;
      margin-bottom: 24px;
    }

    .meta-card {
      background-color: #FFF7ED;
      border: 1px solid #FFEDD5;
      border-left: 4px solid #EA580C;
      padding: 10px 14px;
      border-radius: 8px;
    }

    .meta-card .label {
      font-size: 7.5pt;
      text-transform: uppercase;
      font-weight: 700;
      color: #C2410C;
      letter-spacing: 0.5px;
    }

    .meta-card .value {
      font-size: 9.5pt;
      font-weight: 700;
      color: #0F172A;
      margin-top: 2px;
    }

    /* --- SECTION STYLING --- */
    .section-header {
      display: flex;
      align-items: center;
      gap: 10px;
      margin-top: 22px;
      margin-bottom: 12px;
      border-bottom: 2px solid #FED7AA;
      padding-bottom: 6px;
    }

    .section-badge {
      background-color: #EA580C;
      color: #FFFFFF;
      font-weight: 800;
      font-size: 9pt;
      padding: 3px 9px;
      border-radius: 6px;
      text-transform: uppercase;
    }

    .section-title {
      font-size: 13pt;
      font-weight: 800;
      color: #0F172A;
    }

    h3 {
      font-size: 10.5pt;
      font-weight: 700;
      color: #C2410C;
      margin-top: 14px;
      margin-bottom: 6px;
    }

    p {
      margin-bottom: 8px;
      color: #334155;
    }

    ul, ol {
      margin-left: 18px;
      margin-bottom: 10px;
    }

    li {
      margin-bottom: 4px;
      color: #334155;
    }

    /* --- CODE BLOCKS & COMMANDS --- */
    .code-block {
      background-color: #0F172A;
      color: #F8FAFC;
      font-family: 'Consolas', 'Courier New', monospace;
      font-size: 8.5pt;
      padding: 12px 16px;
      border-radius: 8px;
      border-left: 4px solid #F97316;
      margin: 8px 0 12px 0;
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

    /* --- CALLOUT BOXES --- */
    .callout {
      border-radius: 8px;
      padding: 10px 14px;
      margin: 10px 0;
      font-size: 9pt;
    }

    .callout-warning {
      background-color: #FFF7ED;
      border: 1px solid #FDBA74;
      border-left: 5px solid #EA580C;
      color: #9A3412;
    }

    .callout-warning strong {
      color: #C2410C;
    }

    .callout-tip {
      background-color: #F0FDF4;
      border: 1px solid #86EFAC;
      border-left: 5px solid #16A34A;
      color: #14532D;
    }

    .callout-tip strong {
      color: #15803D;
    }

    .callout-important {
      background-color: #FEF2F2;
      border: 1px solid #FCA5A5;
      border-left: 5px solid #DC2626;
      color: #7F1D1D;
    }

    /* --- CHECKLIST ITEMS --- */
    .checklist-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 10px;
      margin: 10px 0;
    }

    .checklist-card {
      background: #F8FAFC;
      border: 1px solid #E2E8F0;
      border-radius: 8px;
      padding: 10px 12px;
      display: flex;
      align-items: flex-start;
      gap: 10px;
    }

    .checklist-icon {
      background-color: #EA580C;
      color: white;
      font-weight: 800;
      width: 22px;
      height: 22px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 8pt;
      flex-shrink: 0;
    }

    .checklist-text strong {
      display: block;
      color: #0F172A;
      font-size: 9pt;
    }

    .checklist-text span {
      font-size: 8pt;
      color: #64748B;
    }

    /* --- TABLES & TROUBLESHOOTING --- */
    table {
      width: 100%;
      border-collapse: collapse;
      margin: 12px 0;
      font-size: 8.5pt;
    }

    th {
      background-color: #0F172A;
      color: #FFFFFF;
      text-align: left;
      padding: 8px 10px;
      font-weight: 700;
      border: 1px solid #1E293B;
    }

    td {
      padding: 8px 10px;
      border: 1px solid #E2E8F0;
      vertical-align: top;
    }

    tr:nth-child(even) {
      background-color: #FFF7ED;
    }

    .problem-title {
      font-weight: 700;
      color: #C2410C;
    }

    .solution-list {
      margin-left: 14px;
      margin-bottom: 0;
    }

    .solution-list li {
      margin-bottom: 2px;
    }

    .footer {
      margin-top: 30px;
      border-top: 2px solid #E2E8F0;
      padding-top: 10px;
      display: flex;
      justify-content: space-between;
      font-size: 8pt;
      color: #94A3B8;
    }

    .footer-brand {
      font-weight: 700;
      color: #EA580C;
    }
  </style>
</head>
<body>

  <!-- HEADER BANNER -->
  <div class="header-banner">
    <div class="header-titles">
      <h1>LUMO <span>SECADEROS</span></h1>
      <p>Manual Oficial de Instalación en Campo & Guía de Diagnóstico</p>
    </div>
    <div class="header-logos">
      ${coamaLogoBase64 ? `<img src="${coamaLogoBase64}" alt="COAMA Logo" />` : ''}
      ${lumoLogoBase64 ? `<img src="${lumoLogoBase64}" alt="Lumo Logo" />` : ''}
    </div>
  </div>

  <!-- META GRID -->
  <div class="meta-grid">
    <div class="meta-card">
      <div class="label">Proyecto</div>
      <div class="value">COAMA - Secaderos</div>
    </div>
    <div class="meta-card">
      <div class="label">Fecha Puesta en Campo</div>
      <div class="value">04 de Septiembre, 2026</div>
    </div>
    <div class="meta-card">
      <div class="label">Versión del Sistema</div>
      <div class="value">v1.1.0 (PostgreSQL)</div>
    </div>
    <div class="meta-card">
      <div class="label">Desarrollado Por</div>
      <div class="value">Lumo Data Solutions</div>
    </div>
  </div>

  <!-- RESUMEN / CHECKLIST PENDRIVE -->
  <div class="section-header">
    <span class="section-badge">Paso 0</span>
    <span class="section-title">Checklist Previo: Preparación del Pendrive</span>
  </div>

  <p>Antes de acudir a la PC del servidor en la planta, verifica contar con los siguientes 4 elementos en la raíz de tu pendrive USB:</p>

  <div class="checklist-grid">
    <div class="checklist-card">
      <div class="checklist-icon">1</div>
      <div class="checklist-text">
        <strong>coama-secaderos-2-instalador.zip</strong>
        <span>Código fuente limpio pre-empaquetado listo para extraer.</span>
      </div>
    </div>
    <div class="checklist-card">
      <div class="checklist-icon">2</div>
      <div class="checklist-text">
        <strong>Coama_secaderos_LUMO_v1.1.0.apk</strong>
        <span>Aplicación compilada para las tablets Android de secaderos.</span>
      </div>
    </div>
    <div class="checklist-card">
      <div class="checklist-icon">3</div>
      <div class="checklist-text">
        <strong>Instalador Node.js v20.x.x LTS</strong>
        <span><code>node-v20.x.x-x64.msi</code> ejecutable oficial.</span>
      </div>
    </div>
    <div class="checklist-card">
      <div class="checklist-icon">4</div>
      <div class="checklist-text">
        <strong>Instalador Docker Desktop</strong>
        <span><code>Docker Desktop Installer.exe</code> (con soporte WSL 2).</span>
      </div>
    </div>
  </div>

  <div class="callout callout-tip">
    <strong>💡 Tip de Eficiencia:</strong> Si la PC de la planta no posee conexión a Internet o es limitada, lleva también en el pendrive el instalador offline de Google Chrome o Microsoft Edge.
  </div>

  <!-- PASO 1: ENTORNO EN PC -->
  <div class="section-header">
    <span class="section-badge">Paso 1</span>
    <span class="section-title">Instalación de Prerrequisitos en la PC Servidor</span>
  </div>

  <h3>A. Verificar Virtualización de CPU (BIOS)</h3>
  <ol>
    <li>Presiona <code>Ctrl + Shift + Esc</code> para abrir el <strong>Administrador de Tareas</strong> de Windows.</li>
    <li>Ve a la pestaña <strong>Rendimiento</strong> &rarr; <strong>CPU</strong>.</li>
    <li>Verifica en el rincón inferior derecho: <strong>Virtualización debe figurar como "Habilitado"</strong>.</li>
  </ol>
  <div class="callout callout-warning">
    <strong>⚠️ Si dice "Deshabilitado":</strong> Debes reiniciar la PC, presionar <code>F2</code>, <code>F12</code> o <code>Del</code> para ingresar a la BIOS del equipo y habilitar <strong>Intel VT-x / Virtualization Technology</strong> o <strong>AMD-V / SVM Mode</strong>.
  </div>

  <h3>B. Habilitar Características de Windows (WSL 2 / Hyper-V)</h3>
  <p>Abre <strong>PowerShell como Administrador</strong> (clic derecho &rarr; <i>Ejecutar como Administrador</i>) y ejecuta:</p>

  <div class="code-block"><span class="code-comment"># 1. Habilitar Hypervisor en el arranque de Windows</span>
<span class="code-cmd">bcdedit /set hypervisorlaunchtype auto</span>

<span class="code-comment"># 2. Habilitar Plataforma de Máquina Virtual, WSL y Hyper-V</span>
<span class="code-cmd">dism.exe /online /enable-feature /featurename:VirtualMachinePlatform /all /norestart</span>
<span class="code-cmd">dism.exe /online /enable-feature /featurename:Microsoft-Windows-Subsystem-Linux /all /norestart</span>
<span class="code-cmd">dism.exe /online /enable-feature /featurename:Hyper-V /all /norestart</span>

<span class="code-comment"># 3. Actualizar el Kernel de WSL a la última versión</span>
<span class="code-cmd">wsl --update</span></div>

  <div class="callout callout-important">
    <strong>🚨 OBLIGATORIO:</strong> Reiniciar la PC en este punto para que Windows configure las características de virtualización.
  </div>

  <h3>C. Instalación de Node.js v20+</h3>
  <ol>
    <li>Ejecuta <code>node-v20.x.x-x64.msi</code> desde tu pendrive.</li>
    <li>Acepta los términos y mantén activada la opción por defecto <strong>"Add to PATH"</strong>.</li>
    <li>Al finalizar, abre PowerShell y confirma con los comandos: <code>node -v</code> y <code>npm -v</code>.</li>
  </ol>

  <h3>D. Instalación y Verificación de Docker Desktop</h3>
  <ol>
    <li>Ejecuta <code>Docker Desktop Installer.exe</code>.</li>
    <li>Asegúrate de dejar marcada la casilla <strong>"Use WSL 2 instead of Hyper-V"</strong>.</li>
    <li>Una vez instalado, abre Docker Desktop desde el menú Inicio.</li>
    <li>Espera hasta que el icono de la ballena en la barra de tareas cambie a color <strong>VERDE</strong> (<i>Docker Desktop is running</i>).</li>
    <li>Verifica en PowerShell: <code>docker --version</code> y <code>docker compose version</code>.</li>
  </ol>

  <div class="page-break"></div>

  <!-- PASO 2: DESPLIEGUE DEL SISTEMA -->
  <div class="section-header">
    <span class="section-badge">Paso 2</span>
    <span class="section-title">Despliegue y Configuración del Sistema LUMO</span>
  </div>

  <h3>A. Extraer el Proyecto e Instalar Dependencias</h3>
  <ol>
    <li>Copia <code>coama-secaderos-2-instalador.zip</code> al disco local C:\ y descompress en <code>C:\coama-secaderos-2</code>.</li>
    <li>Abre PowerShell en esa carpeta y ejecuta:</li>
  </ol>
  <div class="code-block"><span class="code-cmd">cd C:\coama-secaderos-2</span>
<span class="code-cmd">npm install</span></div>

  <h3>B. Configuración de Variables de Entorno (<code>.env</code>)</h3>
  <p>Confirma que el archivo <code>.env</code> exista en la raíz de <code>C:\coama-secaderos-2</code> con los siguientes parámetros:</p>
  <div class="code-block">API_HOST=0.0.0.0
API_PORT=8080
API_STORE=postgres
DATABASE_URL=postgres://coama:coama_dev_password@127.0.0.1:5432/coama_tiempos_muertos

# Credenciales Telegram Bot
TELEGRAM_BOT_TOKEN=8896313489:AAHy1RPy6nndrr2m7a5nkh7dRnGdnsGrO5U
TELEGRAM_CHAT_ID=-5157803919</div>

  <div class="callout callout-warning">
    <strong>⚠️ Importante:</strong> El parámetro <code>API_HOST=0.0.0.0</code> es indispensable para permitir que el servidor reciba conexiones de las tablets a través de la red local.
  </div>

  <h3>C. Levantar Base de Datos PostgreSQL</h3>
  <div class="code-block"><span class="code-comment"># Levantar el contenedor PostgreSQL con Docker Compose</span>
<span class="code-cmd">docker compose up -d postgres</span>

<span class="code-comment"># Validar migraciones e inicialización de esquemas</span>
<span class="code-cmd">npm run validate:sync:postgres</span></div>

  <h3>D. Habilitar Reglas en el Firewall de Windows (¡CRÍTICO!)</h3>
  <p>Para permitir que las tablets Android accedan a la API en el puerto 8080 y los supervisores al portal en el puerto 5173, ejecuta en <strong>PowerShell Administrador</strong>:</p>
  <div class="code-block"><span class="code-cmd">New-NetFirewallRule -DisplayName "COAMA Secaderos API (8080)" -Direction Inbound -LocalPort 8080 -Protocol TCP -Action Allow</span>
<span class="code-cmd">New-NetFirewallRule -DisplayName "COAMA Secaderos Web Supervisor (5173)" -Direction Inbound -LocalPort 5173 -Protocol TCP -Action Allow</span></div>

  <h3>E. Configurar Inicio Automático al Encender la PC</h3>
  <ol>
    <li>Dentro de la carpeta <code>C:\coama-secaderos-2</code>, haz doble clic en <code>configurar-inicio-automatico.bat</code>.</li>
    <li>Aparecerá el mensaje: <i>"ÉXITO: Automatización configurada correctamente"</i>. A partir de ahora, al iniciar Windows, todos los servicios y portales arrancarán en segundo plano sin intervención humana.</li>
  </ol>

  <!-- PASO 3: RED LOCAL Y TABLETS -->
  <div class="section-header">
    <span class="section-badge">Paso 3</span>
    <span class="section-title">Configuración de Red Local y Tablets Android</span>
  </div>

  <h3>A. Obtener la IP Local de la PC Servidor</h3>
  <ol>
    <li>En PowerShell ejecuta: <code>ipconfig</code>.</li>
    <li>Anota la <strong>Dirección IPv4</strong> de la placa de red (ejemplo: <code>192.168.1.150</code>).</li>
    <li><i>Recomendación IT:</i> Solicita al Administrador de Red de la empresa realizar una <strong>reserva de IP estática (DHCP Lease)</strong> para que la IP del servidor no cambie al reiniciar el router.</li>
  </ol>

  <h3>B. Instalación y Vinculación en Tablets</h3>
  <ol>
    <li>Transfiere e instala <code>Coama_secaderos_LUMO_v1.1.0.apk</code> en cada tablet Android.</li>
    <li>Abre la aplicación <strong>Lumo Secaderos</strong> y presiona el botón de <strong>Engranaje / Configuración</strong>.</li>
    <li>Configura los campos:
      <ul>
        <li><strong>URL de Servidor API:</strong> <code>http://192.168.1.150:8080</code> (usando la IP del servidor).</li>
        <li><strong>ID Secadero:</strong> Asigna el secadero físico (ej: <code>Secadero 1</code>).</li>
        <li><strong>ID Tablet:</strong> Identificador único (ej: <code>tablet_secadero_1</code>).</li>
      </ul>
    </li>
    <li>Presiona <strong>Guardar y Probar Conexión</strong>. Confirmar aviso verde de conexión exitosa.</li>
  </ol>

  <div class="page-break"></div>

  <!-- PASO 4: PRUEBAS EN CAMPO -->
  <div class="section-header">
    <span class="section-badge">Paso 4</span>
    <span class="section-title">Protocolo de Pruebas en Campo</span>
  </div>

  <ol>
    <li><strong>Apertura del Portal Web:</strong> En la PC Servidor, abre el navegador en <code>http://localhost:5173</code>.</li>
    <li><strong>Prueba de Transmisión en Vivo:</strong> Inicia una parada en la Tablet 1. Verifica la actualización inmediata en el portal web y la llegada de la notificación al <strong>Bot de Telegram</strong>.</li>
    <li><strong>Prueba Offline-First:</strong> Desactiva la Wi-Fi de la Tablet, registra el fin de la parada, reactiva la Wi-Fi y verifica que el evento se sincronice automáticamente sin pérdida de información.</li>
  </ol>

  <!-- MATRIZ DE TROUBLESHOOTING -->
  <div class="section-header">
    <span class="section-badge">Paso 5</span>
    <span class="section-title">Matriz de Solución de Problemas (Troubleshooting)</span>
  </div>

  <table>
    <thead>
      <tr>
        <th style="width: 28%;">Problema / Falla</th>
        <th style="width: 32%;">Causa Raíz Posible</th>
        <th style="width: 40%;">Solución Paso a Paso</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td class="problem-title">Docker Desktop no inicia o da error de WSL 2</td>
        <td>Falta actualizar el kernel de WSL o la virtualización está desactivada en la BIOS.</td>
        <td>
          <ol class="solution-list">
            <li>Ejecuta <code>wsl --update</code> en PowerShell como Administrador.</li>
            <li>Reinicia la PC.</li>
            <li>Si persiste, ingresa a la BIOS y habilita Intel VT-x / AMD-V.</li>
          </ol>
        </td>
      </tr>
      <tr>
        <td class="problem-title">La Tablet muestra "Error de Conexión" o "Timeout"</td>
        <td>
          1. IP del servidor incorrecta.<br>
          2. Firewall de Windows bloqueando puerto 8080.<br>
          3. Tablet en red Wi-Fi distinta.
        </td>
        <td>
          <ol class="solution-list">
            <li>Verifica la IP real ejecutando <code>ipconfig</code>.</li>
            <li>Vuelve a ejecutar las reglas de Firewall del Paso 2.D.</li>
            <li>Asegúrate de que la tablet esté conectada a la misma red Wi-Fi de la planta y no a red de invitados o datos móviles.</li>
          </ol>
        </td>
      </tr>
      <tr>
        <td class="problem-title">Error <code>EADDRINUSE</code> (Puerto 8080 o 5173 ocupado)</td>
        <td>Un proceso anterior de Node quedó colgado en segundo plano.</td>
        <td>
          <ol class="solution-list">
            <li>Ejecuta el script <code>Detener_Servicios.bat</code> ubicado en la carpeta del proyecto.</li>
            <li>O ejecuta en PowerShell: <code>Stop-Process -Name node -Force</code>.</li>
          </ol>
        </td>
      </tr>
      <tr>
        <td class="problem-title">PostgreSQL no arranca en Docker (Puerto 5432 ocupado)</td>
        <td>Hay una instancia local previa de PostgreSQL instalada en Windows.</td>
        <td>
          <ol class="solution-list">
            <li>Abre <code>services.msc</code> en Windows.</li>
            <li>Busca el servicio <code>postgresql-x64...</code>, haz clic derecho &rarr; <i>Detener</i>.</li>
            <li>Ejecuta <code>docker compose up -d postgres</code>.</li>
          </ol>
        </td>
      </tr>
      <tr>
        <td class="problem-title">No se abren los portales al encender la PC</td>
        <td>El acceso directo del inicio automático no fue creado correctamente.</td>
        <td>
          <ol class="solution-list">
            <li>Vuelve a ejecutar <code>configurar-inicio-automatico.bat</code>.</li>
            <li>Para iniciar manualmente en cualquier momento, ejecuta <code>run-system.bat</code>.</li>
          </ol>
        </td>
      </tr>
      <tr>
        <td class="problem-title">No llegan los mensajes al Bot de Telegram</td>
        <td>La PC servidor no posee salida a Internet (solo red local).</td>
        <td>
          <ol class="solution-list">
            <li>El envío de Telegram requiere salida a Internet en el servidor. Revisa con la gente de IT que la PC tenga acceso WAN a api.telegram.org.</li>
          </ol>
        </td>
      </tr>
    </tbody>
  </table>

  <!-- FOOTER -->
  <div class="footer">
    <div><span class="footer-brand">LUMO Data Solutions</span> &copy; 2026 - Todos los derechos reservados</div>
    <div>Documentación Técnica de Campo | COAMA Secaderos</div>
  </div>

</body>
</html>`;

const htmlFilePath = path.join(rootDir, 'Manual_Instalacion_LUMO_COAMA.html');
const pdfFilePath = path.join(rootDir, 'Manual_Instalacion_LUMO_COAMA.pdf');

fs.writeFileSync(htmlFilePath, htmlContent, 'utf-8');
console.log(`✓ Archivo HTML generado en: ${htmlFilePath}`);

// Edge executable path on Windows
const edgePath = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';

if (fs.existsSync(edgePath)) {
  try {
    console.log('... Generando PDF profesional con Microsoft Edge Headless ...');
    execSync(`"${edgePath}" --headless --disable-gpu --no-pdf-header-footer --print-to-pdf="${pdfFilePath}" "${htmlFilePath}"`);
    console.log(`✓ ARCHIVO PDF GENERADO CON ÉXITO: ${pdfFilePath}`);
  } catch (err) {
    console.error('Error generando PDF con Edge:', err.message);
  }
} else {
  console.log('Microsoft Edge no encontrado en la ruta por defecto. Se conserva el archivo HTML listo para imprimir.');
}
