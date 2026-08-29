# COAMA Secaderos - Contexto vivo del proyecto

Ultima actualizacion: 2026-08-28
Responsable de actualizacion: Antigravity / Manu
Estado general: primer incremento técnico completado, robustez de importación/exportación de parámetros y fallback de base de datos activo.


Este archivo es el punto de entrada rapido para continuar el proyecto desde Codex, Antigravity u otro entorno. Debe mantenerse corto, actual y accionable. La documentacion detallada sigue viviendo en `README.md`, `Prompt_Maestro_Proyecto_COAMA.md` y `docs/`.

## Concepto de la app

COAMA necesita digitalizar el registro de tiempos muertos de secaderos. Hoy los operarios registran paradas en papel, supervision consolida la informacion y luego se carga o analiza manualmente. La app busca eliminar doble carga, reducir errores, acelerar la disponibilidad de datos y dejar una base confiable para supervision, ERP y analitica.

La solucion se disena como sistema local-first:

```text
Operario -> tablet -> SQLite local -> API local -> PostgreSQL -> portal supervisor / ERP / Google Sheets -> Looker Studio
```

La operacion critica no debe depender de internet. Cada tablet registra primero en local y sincroniza despues contra el servidor local cuando haya conexion. PostgreSQL es la fuente oficial. Google Sheets, Looker Studio, Excel, CSV o ERP son salidas derivadas.

## Usuarios principales

- Operario de secadero: registra inicio y fin de una parada desde una tablet asignada al secadero.
- Supervisor: consulta eventos, filtra, descarga, revisa propuestas manuales y administra maestros.
- Sistemas / responsable tecnico: instala, configura, respalda y mantiene el servidor local.
- ERP / analitica: consume datos exportados o sincronizados desde la base central.

## Alcance confirmado

- Una tablet Android por secadero.
- Cada tablet queda configurada con `tablet_id` y `secadero_id`.
- La app de tablet permite iniciar y finalizar tiempos muertos.
- Cada evento usa UUID generado en tablet para sincronizacion idempotente.
- La app debe funcionar sin conexion y persistir datos tras cierre o reinicio.
- El servidor local recibe, valida y consolida eventos.
- PostgreSQL es la fuente oficial.
- El portal supervisor permite consultar, filtrar y descargar eventos.
- Razones y origenes de parada son datos maestros administrables con relacion jerarquica.
- Una parada tiene un origen principal asociado.
- El operario puede proponer razones manuales si no existen en el maestro.
- Correcciones y anulaciones requieren permisos, motivo y auditoria.
- La integracion ERP se definira por contrato, inicialmente orientada a archivo diario `.txt` o `.csv`.
- Google Sheets sera copia analitica para Looker Studio, no base transaccional.

## Fuera de alcance por ahora

- Dashboard completo en Looker Studio hasta confirmar alcance.
- Alertas al celular personal del supervisor.
- Integracion ERP definitiva sin contrato de campos, formato y circuito.
- Uso de Google Sheets como fuente oficial.
- Exponer PostgreSQL directamente a internet.
- Borrado fisico de eventos operativos o maestros historicamente usados.

## Arquitectura actual

Estructura principal del repo:

```text
apps/
  api/              API local Node
  supervisor-web/   portal web de supervisor
  tablet/           futura app tablet
packages/
  shared-types/     contratos/esquemas compartidos
  validation/       validaciones compartidas
database/
  migrations/       migraciones PostgreSQL
  seeds/            datos de desarrollo
docs/
  functional/       alcance, backlog, preguntas abiertas
  technical/        notas tecnicas
  decisions/        ADRs
scripts/            validaciones ejecutables
```

Stack actual o previsto:

- API: Node.js puro por ahora.
- Portal supervisor: React/Vite.
- Tablet: React + TypeScript + Capacitor, pendiente de implementar.
- Base central: PostgreSQL.
- Base tablet: SQLite, pendiente de implementar.
- Despliegue local: Docker Compose.

## Estado tecnico actual

Implementado:

- Esqueleto de monorepo.
- `docker-compose.yml` con PostgreSQL local.
- Migraciones PostgreSQL (inicial y vinculacion directa de razones a origenes).
- Seed de desarrollo actualizado para maestros jerarquicos unificados.
- Contrato de evento sincronizable.
- Validacion compartida de eventos (restringida a propuestas manuales de razones unicamente).
- API con almacenamiento en memoria y soporte PostgreSQL.
- Endpoints de administracion de razones, origenes y propuestas manuales homologables.
- Endpoints administrativos de listado y edicion de paradas del supervisor (`GET /admin/eventos`, `PATCH /admin/eventos/:id`).
- Portal supervisor premium con:
  - Vista de Operacion optimizada con métricas de pérdida acumulada del turno.
  - Alertas & Eventos con filtros dinamicos por secadero y tabla dividida por transicion (Inicio/Fin de parada).
  - Modal de edicion interactivo para el supervisor (modificacion de fecha/hora, razon y origen).
  - Gestion de Maestros simplificada a 2 tablas (Razones y Origenes) con configuracion de Origen Padre y buscador/filtro integrado.
  - Integración de Bot de Telegram con alertas en tiempo real y botón de prueba interactivo.
- Scripts de validacion actualizados:
  - `npm run check`
  - `npm run validate:sync` (ajustado a las semillas en memoria)
  - `npm run validate:master-data`
  - `npm run validate:sync:postgres`
- Unificación y alineación del puerto API a 8080 en toda la infraestructura de desarrollo, proxies y diagnóstico.
- Configuración automática de tablet_id en la persistencia local de la tablet al consultar el catálogo.
- Carga y descarga de la planilla Excel de parámetros completamente robusta, implementada sin pérdida de registros históricos en PostgreSQL y en memoria (vía Upsert y soft-delete/deactivación de parámetros ausentes).
- Detección automática y fallback elegante a modo memoria en el backend si el servidor PostgreSQL no está disponible.
- Solución al problema de reinicio del input de archivos en la carga de la planilla de parámetros en el portal frontend (Vite).
- Compilación automatizada y exitosa del instalador APK para Android (`Coama_secaderos_LUMO_v1.0.5.apk`) con incremento de versión a `1.0.5` y solución de advertencias de empaquetado en Capacitor/Vite.
- Reestructuración de las exportaciones para el ERP de COAMA (vía script CLI `export-erp.mjs` y botón web del portal de supervisor), configurando exactamente las 14 columnas requeridas de forma unificada.

Pendiente:

- App tablet offline-first.
- SQLite local y cola real de sincronizacion en tablet.
- Autenticacion y permisos definitivos.
- Correccion/anulacion completa con auditoria.
- Exportador ERP definitivo.
- Sincronizacion real a Google Sheets.
- Backups, restauracion y documentacion de despliegue en planta.
- Matriz completa de pruebas para piloto.

## Comandos utiles

Validacion estatica basica:

```powershell
npm run check
```

Validar sincronizacion en memoria:

```powershell
npm run validate:sync
```

Validar maestros:

```powershell
npm run validate:master-data
```

Levantar PostgreSQL:

```powershell
docker compose up -d postgres
```

Validar sincronizacion contra PostgreSQL:

```powershell
npm run validate:sync:postgres
```

Levantar API en memoria:

```powershell
npm run api
```

Levantar API con PostgreSQL:

```powershell
npm run api:postgres
```

Levantar portal supervisor:

```powershell
npm run supervisor:dev
```

## Proximo paso recomendado

Prioridad inmediata:

1. Definir el primer flujo real de tablet: configurar tablet/secadero, iniciar parada, cerrar parada, ver pendientes y sincronizar.
2. Crear la app tablet offline-first con persistencia local en SQLite.
3. Avanzar con el exportador ERP diario (.csv) según los requisitos formales de negocio.

No avanzar con reglas industriales definitivas sin validar las preguntas abiertas de negocio.

## Preguntas abiertas criticas

- Planilla real de papel y ejemplos completados.
- Catalogo real de categorias, razones, origenes y codigos ERP.
- Regla formal de inicio y fin de parada.
- Si puede existir mas de una parada simultanea por secadero.
- Que ocurre con cambio de turno durante una parada abierta.
- Como se identifica el operario en tablet.
- Campos exactos y formato final que necesita el ERP.
- Infraestructura final de la PC dedicada en planta.
- Alcance exacto del dashboard de Looker Studio.

La lista completa esta en `docs/functional/open-questions.md`.

## Reglas para continuar el proyecto

- Inspeccionar el repo antes de editar.
- Mantener cambios pequenos, verificables y documentados.
- No guardar secretos, tokens ni credenciales en Git.
- Usar migraciones para cambios de base.
- Mantener PostgreSQL como fuente oficial.
- No convertir Google Sheets en base operativa.
- No borrar eventos historicos; anular o versionar.
- Actualizar este archivo cuando cambie el estado, el alcance o el proximo paso.

## Como actualizar este archivo

Cuando se complete una tarea importante:

1. Cambiar `Ultima actualizacion`.
2. Actualizar `Estado general` si corresponde.
3. Mover items entre `Implementado` y `Pendiente`.
4. Ajustar `Proximo paso recomendado`.
5. Agregar nuevas preguntas abiertas o quitar las resueltas.
6. Si hubo una decision tecnica relevante, crear o actualizar un ADR en `docs/decisions/` y enlazarla desde aca si hace falta.

## Referencias del repo

- `README.md`: comandos y estado resumido.
- `Prompt_Maestro_Proyecto_COAMA.md`: vision completa y reglas de trabajo.
- `docs/functional/scope.md`: alcance confirmado, supuesto y fuera de alcance.
- `docs/functional/backlog.md`: hitos y estimacion inicial.
- `docs/functional/open-questions.md`: preguntas pendientes.
- `docs/decisions/ADR-001-architecture.md`: arquitectura local-first.
- `docs/technical/first-increment.md`: criterios del primer incremento tecnico.
