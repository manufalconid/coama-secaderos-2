# COAMA Secaderos - Guía del Proyecto y Reglas de Trabajo

Este archivo contiene el contexto del proyecto, la arquitectura, la configuración de integración y las decisiones técnicas tomadas. Antigravity cargará este archivo automáticamente al iniciar cualquier conversación en este espacio de trabajo.

---

## 1. Estructura y Arquitectura del Monorepo

*   **`apps/api/`**: Servidor backend en Node.js (con soporte para base de datos Postgres o en memoria `API_STORE=memory`).
    *   `src/server.mjs`: Servidor principal, endpoints de sincronización y ruteo.
    *   `src/sheets-sync.mjs`: Lógica de sincronización aditiva e histórica a Google Sheets.
    *   `src/store.mjs` y `postgres-store.mjs`: Controladores de persistencia y base de datos.
*   **`apps/supervisor-web/`**: Portal web del supervisor (React + Vite).
    *   `src/components/AnalisisView.jsx`: Vista de análisis donde se encuentra el botón de exportación manual a Sheets.

---

## 2. Integración con Google Sheets

La planilla de Google Sheets utilizada tiene el ID `1ClFiLfrXfx1N_EehFHvXahuBvc3BqRjnylZ0k2Q5QMk` y se divide en tres pestañas críticas:

### A. registros_crudos_tablet
*   **Comportamiento**: Transaccional aditivo. Cada parada se divide en dos registros:
    1.  Un registro con `estado_evento: "abierto"` al iniciar la parada (campos de fin vacíos).
    2.  Un registro con `estado_evento: "cerrado"` al finalizar la parada (con fecha/hora fin y duración cargadas).
*   **Columnas en orden exacto**:
    `evento_id`, `tablet_id`, `secadero_id`, `fecha_registro`, `linea`, `fecha_hora_inicio`, `hora_registro`, `fecha_hora_fin`, `duracion_minutos`, `estado_evento`, `tipo_registro`, `categoria`, `tiempo muerto`, `observacion`, `ubicacion`, `version`, `tipo_turno`
*   **Conversión**: La duración se reporta en minutos (`duracion_minutos`), formateada con **coma (`,`) como separador decimal** (ej. `30,0`).
*   **Traducción**: Las columnas `categoria` y `tiempo muerto` muestran nombres legibles traducidos (ej. `MECÁNICO`, `ATASCAMIENTO`) en lugar de IDs crudos.

### B. registros_procesados
*   **Comportamiento**: Contiene únicamente las paradas cerradas y consolidadas.
*   **Decimales**: Todos los campos de horas y minutos utilizan la coma (`,`) como separador decimal.

### C. turnos
*   **Comportamiento**: Registro diario y dinámico. Agrupa la vigencia de los turnos de manera diaria según la fecha de registro y la línea/secadero.
*   **Columnas**: `fecha`, `linea`, `turno_id`, `nombre`, `hora_inicio`, `hora_fin`, `horas_totales`, `horas_descanso`, `horas_programadas` (totales - descanso, formateado con comas).

---

## 3. Integración con Telegram y Prevención de Duplicados

*   **Evitar Alertas Duplicadas**: 
    1. Cuando las tablets reintentan sincronizar eventos repetidos o con la misma versión que ya está consolidada en la base de datos, el backend devuelve un estado `"no-change"`.
    2. Cuando un evento ya estaba cerrado en la base de datos (es decir, `wasClosed = true` en el Store) y llega una sincronización o corrección posterior con versión superior (`status: "updated"`), el servidor evita duplicar la notificación de Telegram (`✅Fin de detención`) y la inserción en la pestaña de `registros_procesados` validando que `!wasClosed`.
*   **Filtrado en API**: En `POST /sync/events`, el servidor solo procesa el envío a Google Sheets y notificaciones de Telegram para estados `"inserted"` o `"updated"`. El estado `"no-change"` o las actualizaciones de eventos que ya estaban cerrados se filtran de forma segura para evitar alertas redundantes.

---

## 4. Botón de Exportación Manual

*   En la pestaña de **Análisis** del portal de supervisor, el botón "Exportar a Google Sheets" llama por POST al endpoint `/api/admin/sheets/sync`, el cual ejecuta la función `exportAllToSheets()` para limpiar y reescribir por completo el historial de eventos en Sheets sin duplicados.
