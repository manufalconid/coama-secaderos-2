# Guía de Instalación Paso a Paso - Lumo Secaderos COAMA (v2.0)

Esta guía detalla el proceso completo para instalar y configurar el sistema **Lumo Secaderos (Versión 2.0)** en una PC de prueba (entorno local/hogar) y posteriormente en la PC de planta.

---

## 1. Resumen de Arquitectura del Sistema

El sistema está diseñado bajo una arquitectura **Local-First**, lo que significa que la operación crítica en las tablets no depende de una conexión a internet activa:

1. **Tablets Android (APK o Web)**:
   - Ejecutan la app nativa (APK), guardan los datos localmente en una base de datos SQLite y sincronizan con el servidor local cuando detectan red.
   - Para desarrollo y pruebas en PC/navegador, también se levanta una versión web de la tablet en el puerto `5174`.
2. **Servidor Local (PC Central)**:
   - **Base de Datos**: PostgreSQL 16 (ejecutándose en Docker).
   - **Servidor API**: Node.js (puerto `8080`), recibe y procesa eventos de las tablets.
   - **Portal del Supervisor**: Aplicación React + Vite (puerto `5173`), para monitoreo, edición de paradas y administración de maestros.
3. **Integraciones**: Bot de Telegram para notificaciones automáticas y Google Sheets + Looker Studio para reportes y analítica en la nube.

---

## 2. Prerrequisitos de Software y Red

### En la PC Servidora (Windows)
* **Node.js (versión 20 o superior)**: Entorno de ejecución para el servidor backend y el portal frontend.
* **Docker Desktop**: Necesario para levantar la base de datos PostgreSQL de forma rápida y aislada.
* **Acceso de Administrador**: Para configurar reglas de Firewall (puertos 8080, 5173, 5174) y variables de entorno.

### En la Tablet Android / Navegador de Prueba
* Un dispositivo o emulador Android (versión 8.0 o superior).
* El archivo instalador APK (`Coama_secaderos_LUMO_v1.0.9.apk` o `Coama_secaderos_LUMO.apk`).
* Para probar la tablet desde otra PC/Notebook en la casa sin instalar la APK, se puede usar un navegador web en el puerto `5174`.

### Infraestructura de Red (¡Muy Importante!)
* Tanto la PC Servidora como la Tablet **deben estar conectadas a la misma red local (Wi-Fi o LAN)**.
* **Evitar redes de invitados ("Guest Networks")** o redes corporativas con aislamiento de AP activado, ya que estas previenen que los dispositivos conectados se comuniquen entre sí.

---

## 3. Instalación y Configuración del Servidor

### Paso 1: Instalar Node.js
1. Descarga el instalador de **Node.js v20.x o superior (LTS)** desde la página oficial: [https://nodejs.org/](https://nodejs.org/)
2. Ejecuta el instalador `.msi` en Windows. Acepta las opciones por defecto (asegúrate de que la casilla "Add to PATH" esté activada).
3. Una vez finalizada la instalación, abre una terminal de **PowerShell** y verifica que esté correctamente instalado ejecutando:
   ```powershell
   node -v
   npm -v
   ```
   Ambos comandos deben retornar las versiones instaladas (por ejemplo: `v20.11.0` y `10.2.4`).

### Paso 2: Instalar Docker Desktop (Para Base de Datos PostgreSQL)
1. Descarga **Docker Desktop para Windows** desde: [https://www.docker.com/products/docker-desktop/](https://www.docker.com/products/docker-desktop/)
2. Ejecuta el instalador. Selecciona el motor recomendado **WSL2** (Windows Subsystem for Linux v2). Si no tienes WSL2 instalado, el propio instalador de Docker te guiará para activarlo (puede requerir reiniciar la PC).
3. Asegúrate de iniciar la aplicación "Docker Desktop" y verificar que el icono del motor en la barra de tareas de Windows se muestre en **verde (Running)**.
4. Abre una terminal y verifica el estado de docker con:
   ```powershell
   docker --version
   docker compose version
   ```

### Paso 3: Copiar y Preparar los Archivos del Proyecto (Vía Pendrive / Red)
> [!IMPORTANT]
> **No copies la carpeta directamente a mano arrastrándola al pendrive**, ya que las carpetas `node_modules` contienen más de 30.000 archivitos diminutos que congelan la velocidad de copia del pendrive en Windows.

1. **En la PC de origen**, haz doble clic en el archivo `Crear_Instalador_ZIP.bat` (ubicado en la raíz del proyecto o dentro de `coama-secaderos-2`).
   * *Este script detendrá cualquier proceso en uso para desbloquear archivos y comprimirá todo el proyecto en un único archivo limpio llamado `coama-secaderos-2-instalador.zip` (excluyendo automáticamente los `node_modules` pesados).*
2. **Copia el archivo `coama-secaderos-2-instalador.zip` a tu pendrive** (se copiará en apenas unos segundos).
3. **En la PC nueva**, conecta el pendrive y descomprime el archivo ZIP en la ubicación que desees (por ejemplo: `C:\coama-secaderos-2`).
4. Abre esa carpeta descomprimida en una terminal de **PowerShell**.

### Paso 4: Instalar dependencias de Node
1. En la raíz de `coama-secaderos-2`, ejecuta el comando para instalar todas las librerías necesarias de forma automática:
   ```powershell
   npm install
   ```
   *Nota: Esto descargará las carpetas `node_modules` requeridas para la API, el portal supervisor y la app de tablet.*

### Paso 5: Levantar e Inicializar la Base de Datos PostgreSQL
1. Levanta el contenedor de la base de datos ejecutando en la raíz de `coama-secaderos-2`:
   ```powershell
   docker compose up -d postgres
   ```
   *Este comando descargará la imagen de PostgreSQL 16 (la primera vez) y levantará la base de datos llamada `coama_tiempos_muertos` en el puerto `5432`.*
2. **Aplicar Migraciones y Carga Inicial de Datos (Semillas)**:
   Para crear las tablas de la base de datos (secaderos, eventos, turnos, razones) e inyectar el catálogo inicial de datos maestros, ejecuta:
   ```powershell
   npm run validate:sync:postgres
   ```
   *Este comando aplicará secuencialmente los 11 archivos de migración SQL en `database/migrations/` y cargará el archivo de semillas `database/seeds/dev_seed.sql`.*

### Paso 6: Configurar Variables de Entorno (.env)
El proyecto ya cuenta con un archivo `.env` pre-configurado en `coama-secaderos-2`. 
* **DATABASE_URL** está configurado para la base de datos Docker local.
* **TELEGRAM_BOT_TOKEN** y **TELEGRAM_CHAT_ID** están configurados con el bot oficial de alertas.
* **GOOGLE_SHEET_ID** y **GOOGLE_SERVICE_ACCOUNT_KEY** ya contienen las credenciales de servicio para sincronizar a la nube de COAMA.

Asegúrate de que el archivo `.env` contenga la siguiente línea para activar la persistencia en PostgreSQL:
```ini
API_STORE=postgres
```

### Paso 7: Iniciar los Servidores del Sistema
Para simplificar la ejecución, el proyecto cuenta con un script preparado para matar procesos huérfanos y levantar todos los servidores simultáneamente:

1. Haz doble clic sobre el archivo `run-system.bat` en la raíz de `coama-secaderos-2`.
2. El script realizará las siguientes acciones:
   - Liberará los puertos `8080`, `5173` y `5174` (si es que quedaron procesos anteriores colgados).
   - Levantará el servidor API Backend en segundo plano (`npm run api:postgres`).
   - Levantará el Portal Supervisor React en segundo plano (`npm run supervisor:dev`).
   - Levantará el servidor Web de la Tablet en segundo plano (`npm run tablet:dev`).
   - Abrirá automáticamente tu navegador web en `http://127.0.0.1:5173`.
3. Verás una terminal de control que dice *"¡Sistema listo y lanzado! Puedes cerrar esta ventana..."*. Déjala abierta durante tus pruebas. Para apagar todo, simplemente vuelve a ejecutar el archivo `run-system.bat`.

---

## 4. Configuración e Instalación en la Tablet Android

Las tablets se conectan al servidor enviando peticiones HTTP al puerto de la API (`8080`).

### Paso 1: Determinar la IP Local de la PC Servidora
1. En la PC donde ejecutaste los servidores, abre una terminal de PowerShell y escribe:
   ```powershell
   ipconfig
   ```
2. Busca tu adaptador de red activo (Ethernet o Wi-Fi) y anota la **Dirección IPv4**.
   *Ejemplo: `192.168.1.15` o `192.168.10.15`*. Esta dirección es la que usará la tablet para comunicarse.

### Paso 2: Transferir e Instalar el APK en la Tablet
1. En la raíz de `coama-secaderos-2`, localiza el archivo compilado `Coama_secaderos_LUMO_v1.0.9.apk` o `Coama_secaderos_LUMO.apk`.
2. Pásalo a la tablet a través de alguna de estas formas:
   - Conectando la tablet por cable USB a la PC y copiando el archivo.
   - Subiéndolo a Google Drive o enviándolo por Telegram/WhatsApp web y descargándolo en la tablet.
3. En la tablet, abre el administrador de archivos y ejecuta el archivo `.apk` descargado.
4. Si la tablet te avisa sobre "Instalación de fuentes desconocidas", concede los permisos correspondientes para continuar la instalación.

### Paso 3: Configurar la URL de Conexión en la Tablet
1. Abre la aplicación **Lumo Secaderos** instalada en la tablet.
2. Ingresa a la pantalla de **Ajustes** (ícono de engranaje).
3. Configura los siguientes campos:
   - **URL del Servidor / API**: Ingresa la dirección IP de la PC servidora con el puerto `8080`.
     *Ejemplo: `http://192.168.1.15:8080`* (reemplaza `192.168.1.15` por la IP real que obtuviste en el Paso 1).
   - **Secadero ID**: Selecciona o escribe el identificador del secadero asignado a esta tablet (por ejemplo: `sec-omeco`, `sec-benecke` o `sec-raute`).
   - **Tablet ID**: Escribe el identificador de la tablet física (por ejemplo: `tab-sec-omeco`).
4. Guarda la configuración. Si la conexión es exitosa, la tablet debería descargar el catálogo maestro de razones y origen de paradas.

#### Método de Prueba Rápido sin APK (En PC/Notebook):
Si quieres probar el flujo de la tablet desde otra PC de tu casa sin instalar la app en una tablet física:
1. Abre el navegador de tu otra PC e ingresa a `http://<IP_DEL_SERVIDOR>:5174`
2. Configura los Ajustes con la misma URL del servidor (`http://<IP_DEL_SERVIDOR>:8080`) y selecciona un secadero. ¡La interfaz simulará exactamente a la tablet física!

---

## 5. Pruebas de Funcionamiento Iniciales

Realiza estas pruebas básicas para confirmar que todo funciona correctamente:

1. **Iniciar Parada en Tablet (Física o Web)**:
   - En la interfaz de la tablet, presiona el botón para iniciar una parada (tiempo muerto).
   - Selecciona un origen y una razón. Escribe un comentario de prueba.
   - Presiona confirmar.
2. **Revisar en el Portal del Supervisor**:
   - Entra al portal desde la PC (`http://127.0.0.1:5173`).
   - Ve a la pestaña de **Operación** o **Alertas y Eventos**.
   - Deberías ver reflejada inmediatamente la parada que acabas de abrir en la tablet para ese secadero (con una tarjeta roja/naranja parpadeando indicando "Abierta").
3. **Recibir Alerta de Telegram**:
   - Verifica si se envió el mensaje automático del bot al grupo de Telegram configurado.
4. **Finalizar Parada en la Tablet**:
   - En la interfaz de la tablet, marca la parada como finalizada.
   - Verifica en el Portal del Supervisor que ahora se muestre como una parada cerrada y con su duración calculada.

---

## 6. Posibles Problemas y Soluciones (Troubleshooting)

### A. La tablet no se conecta al servidor (Error de Red / Time Out)
* **Causa 1**: El Firewall de Windows está bloqueando los puertos.
  * **Solución**: Debes crear una regla de entrada en el Firewall de la PC servidora:
    1. Abre el menú Inicio de Windows, escribe `Firewall de Windows Defender con seguridad avanzada` y ábrelo.
    2. Haz clic en **Reglas de entrada** (columna izquierda) y luego en **Nueva regla...** (columna derecha).
    3. Elige tipo: **Puerto**. Siguiente.
    4. Selecciona **TCP** y en Puertos locales específicos escribe: `8080, 5173, 5174`. Siguiente.
    5. Selecciona **Permitir la conexión**. Siguiente.
    6. Marca las tres casillas (Dominio, Privada, Pública). Siguiente.
    7. Asigna un nombre como `Lumo API y Portales (8080, 5173, 5174)` y presiona **Finalizar**.
* **Causa 2**: La tablet y el servidor están en redes distintas o la red tiene aislamiento de AP ("AP Isolation").
  * **Solución**: Asegúrate de que ambos estén en la misma red Wi-Fi. Prueba si puedes acceder a la API desde el navegador de la tablet ingresando a `http://<IP_DEL_SERVIDOR>:8080/health`. Si la página carga un JSON que dice `{ "ok": true }`, la red funciona bien.
* **Causa 3**: La IP de la PC servidora cambió.
  * **Solución**: Si el router de tu casa/planta tiene configuración dinámica (DHCP), la IP de la PC podría cambiar tras un reinicio. Configura una **IP estática** para la PC servidora en los ajustes del router o en la configuración de adaptador de red de Windows.

### B. Error al iniciar docker o PostgreSQL
* **Causa**: Docker Desktop no está iniciado, o hay un conflicto de puertos.
  * **Solución**: Abre Docker Desktop y asegúrate de que esté ejecutándose. Si tienes instalado otro motor de base de datos como PostgreSQL directo en Windows (que consuma el puerto `5432`), debes detenerlo primero desde `servicios.msc` en Windows para evitar conflictos.

### C. Al ejecutar `npm install` da errores
* **Causa**: La versión de Node.js es muy vieja o existen bloqueos de red durante la instalación de paquetes.
  * **Solución**: Actualiza Node.js a la última versión LTS y vuelve a intentar desde una consola con permisos de Administrador.
