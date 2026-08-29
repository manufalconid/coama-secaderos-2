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
*   **Columnas**: Comienza con `evento_id` (para permitir la detección de cambios e incrementalidad de filas), seguido del resto de las columnas del reporte de paradas.
*   **Decimales**: Todos los campos de horas y minutos utilizan la coma (`,`) como separador decimal.

### C. turnos
*   **Comportamiento**: Registro diario y dinámico. Agrupa la vigencia de los turnos de manera diaria según la fecha de registro y la línea/secadero.
*   **Columnas**: `fecha`, `linea`, `turno_id`, `nombre`, `hora_inicio`, `hora_fin`, `horas_totales`, `horas_descanso`, `horas_programadas` (totales - descanso, formateado con comas).

---

## 3. Integración con Telegram y Prevención de Duplicados

*   **Evitar Alertas Duplicadas**: 
    1. Cuando las tablets reintentan sincronizar eventos repetidos o con la misma versión que ya está consolidada en la base de datos, el backend devuelve un estado `"no-change"`.
    2. Cuando un evento ya estaba cerrado en la base de datos (es decir, `wasClosed = true` en el Store) y llega una sincronización o corrección posterior con versión superior (`status: "updated"`), el servidor evita duplicar la notificación de Telegram (`✅Fin de detención`) validando que `!wasClosed`. Sin embargo, el servidor **sí sincroniza e impacta siempre los cambios en tiempo real** a las filas de Google Sheets (crudos y procesados) para mantener los reportes actualizados.
    3. **Ignorar eventos duplicados de fin (finEvent)**: La tablet crea y envía dos objetos separados al cerrar un evento: el evento original actualizado a cerrado y un nuevo evento (`finEvent`) con un ID de evento diferente y la propiedad `inicio_evento_id` apuntando al evento original. El servidor ignora/salta en tiempo real cualquier evento recibido que contenga `inicio_evento_id` para evitar segundas alertas redundantes de Telegram e inserciones duplicadas de filas en Google Sheets.
*   **Filtrado en API y Portal**: En `POST /sync/events` y en la edición desde el portal (`PATCH /admin/eventos/:id`), el servidor siempre ejecuta el guardado incremental en Google Sheets (tanto para inserciones como para cualquier actualización o edición de campo). Para evitar duplicidad de alertas en Telegram, solo se dispara la notificación si `!wasClosed` y si no contiene `inicio_evento_id`.

---

## 4. Botón de Exportación Manual

*   En la pestaña de **Análisis** del portal de supervisor, el botón "Exportar a Google Sheets" llama por POST al endpoint `/api/admin/sheets/sync`, el cual ejecuta la función `exportAllToSheets()` para limpiar y reescribir por completo el historial de eventos en Sheets sin duplicados.
