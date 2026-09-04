# Especificación Técnica de Exportación a ERP (CSV)
**Sistema de Registro de Tiempos Muertos — COAMA Secaderos**

---

## 1. Objetivo y Alcance

Este documento define la especificación técnica oficial para el archivo de exportación `.csv` destinado a la integración con el sistema ERP de **COAMA SudAmérica**. 

El archivo consolida las paradas operativas ocurridas en los secaderos (**OMECO, BENEKE, RAUTE**), garantizando total compatibilidad con Microsoft Excel en español (configuración regional de Argentina / Latinoamérica) y con los importadores automatizados del ERP.

---

## 2. Formato del Archivo y Parámetros Globales

| Parámetro | Valor Especificado | Justificación Técnica |
| :--- | :--- | :--- |
| **Tipo de Archivo** | Archivo de texto plano delimitado (`.csv`) | Estándar universal de intercambio de datos tabulares. |
| **Separador de Campos** | Punto y coma (`;`) | Estándar para sistemas y hojas de cálculo con configuración regional en español donde la coma es el separador decimal. |
| **Codificación de Caracteres** | **UTF-8 con BOM** (`\ufeff`) | Esencial para que Microsoft Excel en Windows reconozca automáticamente acentos, tildes y caracteres en español (`Ó`, `É`, `Ñ`, etc.) sin distorsión. |
| **Fin de Línea** | Estilo Windows **CRLF** (`\r\n`) | Compatibilidad nativa con servidores y terminales Windows. |
| **Nombres de Archivo Oficiales** | `COAMA_Exportacion_ERP.csv`<br>`LUMO_SECADEROS_PARADAS_YYYY-MM-DD.csv` | Nombre unificado fijo y nombre versionado por fecha diaria. |
| **Ubicación de Salida** | Carpeta `output to erp/` en la raíz del proyecto. | Directorio predeterminado de entrega de reportes. |

---

## 3. Reglas de Tratamiento de Caracteres y Formato

### A. Tratamiento de Textos y Caracteres Especiales
1. **Punto y coma (`;`) en textos:**  
   Cualquier caracter de punto y coma dentro de observaciones o textos libres es sustituido automáticamente por una coma (`,`). Esto previene la fragmentación no deseada de columnas.
2. **Saltos de línea (`\r`, `\n`) en textos:**  
   Los retornos de carro o saltos de línea dentro de campos de texto se reemplazan por un espacio en blanco (`' '`), asegurando que cada registro mantenga la integridad estricta de una única fila física.
3. **Comillas dobles (`"`):**  
   Si un campo contiene comillas dobles, se escapan duplicándolas (`""`) y el campo completo se envuelve entre comillas dobles según el estándar RFC 4180.
4. **Campos vacíos o nulos:**
   - **`observacion`:** Cuando no existen observaciones escritas por el operario, se exporta el valor por defecto **`-.-`**.
   - **`ubicacion`:** Cuando la parada no posee una ubicación física asignada, el campo se deja vacío (representado como `;;` sin espacios adicionales).
5. **Normalización a Mayúsculas:**  
   Campos categóricos (`linea`, `categoria`, `tiempo_muerto`, `observacion`, `ubicacion`) se emiten en mayúsculas sostenidas para estandarizar la búsqueda e indexación en el ERP.

### B. Reglas de Formato Numérico y Decimal
1. **Separador decimal:** Se utiliza estrictamente la **coma (`,`)** como separador decimal. El punto (`.`) **no debe utilizarse** como decimal en este archivo.
2. **Enteros limpios:** Los valores enteros (como `12` para las horas de turno, o `0` cuando una duración redondea a cero) no llevan ceros decimales innecesarios (se exporta `12` y no `12.00`).
3. **Horas calculadas (`tiempo_muerto_en_horas`):**  
   Se calcula como `tiempo_parada_segundos / 3600`. Se redondea a **2 decimales** utilizando coma (ej. `0,01`, `0,04`, `0,50`). Si el resultado es cero absoluto, se exporta **`0`**.
4. **Minutos calculados (`tiempo_muerto_en_minutos`):**  
   Se calcula como `tiempo_parada_segundos / 60`. Se redondea a **1 decimal** utilizando coma (ej. `0,4`, `0,1`, `2,1`, `30,0`). Si el resultado es cero absoluto, se exporta **`0`**.

### C. Regla de Deduplicación de Paradas
El sistema móvil genera dos objetos transaccionales al completar un evento: el evento de inicio actualizado y un registro de fin (`finEvent` con `inicio_evento_id`).  
**Regla estricta:** La exportación al ERP filtra y descarta cualquier registro redundante con `inicio_evento_id` y procesa exclusivamente eventos con `estado_evento === "cerrado"`. Esto garantiza que cada parada ocurra **exactamente una sola vez** en el reporte.

---

## 4. Tabla de Especificación de Campos (13 Columnas Exactas)

El orden de las 13 columnas es inalterable:

| # | Columna Excel | Nombre del Campo | Origen del Dato | Tipo de Dato | Formato Requerido | Ejemplo |
| :-: | :-: | :--- | :--- | :--- | :--- | :--- |
| **1** | **A** | `fecha_de_registro` | Fecha local de registro del evento (Buenos Aires). | Texto (Fecha) | `YYYY-MM-DD` (10 caracteres) | `2026-08-28` |
| **2** | **B** | `linea` | Secadero donde ocurrió la detención. | Texto (ID) | Alfanumérico en mayúsculas | `OMECO`, `BENEKE`, `RAUTE` |
| **3** | **C** | `turno_hora_desde` | Hora de inicio del turno operativo activo. | Texto (Hora) | `HH:MM:SS` (8 caracteres) | `06:00:00` |
| **4** | **D** | `turno_hora_hasta` | Hora de fin del turno operativo activo. | Texto (Hora) | `HH:MM:SS` (8 caracteres) | `18:00:00` |
| **5** | **E** | `tiempo_de_turno_en_horas_programadas` | Horas totales de trabajo disponibles del turno. | Numérico | Entero o decimal con coma | `12` |
| **6** | **F** | `categoria` | Origen / Categoría principal de la parada. | Texto | Alfanumérico en mayúsculas | `ELECTRICO`, `MECANICO`, `PROCESO`, `LOGISTICA`, `OPERATIVO`, `EXTERNO` |
| **7** | **G** | `tiempo_muerto` | Causa de la parada (motivo del maestro o texto manual). | Texto | Alfanumérico en mayúsculas | `CARGADOR`, `SECADERO TRANCADO`, `PARADA`, `CADENA`, `CALDERA` |
| **8** | **H** | `observacion` | Detalle o aclaración escrita por el operario. | Texto | Alfanumérico (`-.-` si no hay texto) | `TOMA DE RODAMIENTO`, `-.-` |
| **9** | **I** | `ubicacion` | Identificador físico de la falla en el secadero. | Texto | Alfanumérico (o vacío si no aplica) | `N1P1`, `N6P2`, `""` |
| **10** | **J** | `tiempo_muerto_hora_desde` | Fecha y hora exacta de inicio capturada en tablet. | Texto (ISO) | `YYYY-MM-DDTHH:MM:SS.mmmZ` | `2026-08-28T14:57:27.729Z` |
| **11** | **K** | `tiempo_muerto_hora_hasta` | Fecha y hora exacta de fin capturada en tablet. | Texto (ISO) | `YYYY-MM-DDTHH:MM:SS.mmmZ` | `2026-08-28T14:57:51.591Z` |
| **12** | **L** | `tiempo_muerto_en_horas` | Duración total en horas (`segundos / 3600`). | Numérico | 2 decimales con coma (o `0`) | `0,01`, `0`, `0,04`, `0,03` |
| **13** | **M** | `tiempo_muerto_en_minutos` | Duración total en minutos (`segundos / 60`). | Numérico | 1 decimal con coma (o `0`) | `0,4`, `0,1`, `2,1`, `1,9` |

---

## 5. Muestra del Archivo CSV Generado

A continuación se muestra el contenido literal de un archivo exportado válido:

```csv
fecha_de_registro;linea;turno_hora_desde;turno_hora_hasta;tiempo_de_turno_en_horas_programadas;categoria;tiempo_muerto;observacion;ubicacion;tiempo_muerto_hora_desde;tiempo_muerto_hora_hasta;tiempo_muerto_en_horas;tiempo_muerto_en_minutos
2026-08-28;OMECO;06:00:00;18:00:00;12;ELECTRICO;CARGADOR;-.-;;2026-08-28T14:57:27.729Z;2026-08-28T14:57:51.591Z;0,01;0,4
2026-08-28;OMECO;06:00:00;18:00:00;12;MECANICO;CARGADOR;-.-;;2026-08-28T14:58:12.621Z;2026-08-28T14:58:18.271Z;0;0,1
2026-08-28;OMECO;06:00:00;18:00:00;12;PROCESO;SECADERO TRANCADO;-.-;N1P1;2026-08-28T15:00:01.402Z;2026-08-28T15:00:21.105Z;0,01;0,3
2026-08-28;OMECO;06:00:00;18:00:00;12;LOGISTICA;PRUEBA;-.-;;2026-08-28T15:01:55.904Z;2026-08-28T15:02:07.421Z;0;0,2
2026-08-28;OMECO;06:00:00;18:00:00;12;MECANICO;CADENA;-.-;;2026-08-28T15:04:42.121Z;2026-08-28T15:05:03.001Z;0,01;0,3
2026-08-28;OMECO;06:00:00;18:00:00;12;OPERATIVO;CALDERA;-.-;;2026-08-28T15:06:30.764Z;2026-08-28T15:06:38.981Z;0;0,1
2026-08-28;OMECO;06:00:00;18:00:00;12;PROCESO;SECADERO TRANCADO;-.-;N6P2;2026-08-28T15:09:07.003Z;2026-08-28T15:09:42.588Z;0,01;0,6
2026-08-28;OMECO;06:00:00;18:00:00;12;EXTERNO;CORTE DE ENERGIA;-.-;;2026-08-28T15:19:44.130Z;2026-08-28T15:21:52.562Z;0,04;2,1
```

---

## 6. Canales de Generación y Consumo

El sistema ofrece tres métodos equivalentes para generar este reporte con la misma estructura:

1. **Archivo por Lotes (CLI en Servidor o Escritorio):**
   - Ejecutar el acceso directo `Exportar_Para_ERP.bat` o el comando:
     ```bash
     npm run export:erp
     ```
   - Escribe el archivo en la carpeta local `output to erp/`.
2. **Descarga Interactiva desde el Portal Web:**
   - En el portal de supervisión (`http://localhost:5173`), ingresar a la pestaña **Análisis** y hacer clic en **"Descargar CSV ERP"**.
   - Descarga automáticamente en el navegador el archivo `COAMA_Exportacion_ERP.csv`.
3. **Consumo Directo vía API HTTP (Integración Automática del ERP):**
   - La API del sistema expone el endpoint:
     ```http
     GET http://<IP_SERVIDOR>:8080/export/erp
     ```
   - Devuelve el contenido del archivo con cabeceras `Content-Type: text/csv; charset=utf-8` y `Content-Disposition: attachment; filename="COAMA_Exportacion_ERP.csv"`, permitiendo que scripts de tareas programadas del ERP (PowerShell, Python o cURL) automaticen la recolección sin intervención manual.
