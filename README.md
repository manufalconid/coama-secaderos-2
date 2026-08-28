# COAMA - Tiempos muertos de secaderos (v2.0)

Sistema local-first para registrar tiempos muertos desde tablets Android, consolidar en servidor local y disponibilizar datos para supervisión, ERP y analítica.

## Mejoras de la Versión 2.0 (LUMO)
- **Estructura Modular:** Los componentes de React de la tablet y de la web del supervisor fueron extraídos de archivos monolíticos gigantes a pequeños módulos de propósito único.
- **Git Control Completo:** Control total sobre las migraciones y esquemas de base de datos (`database/migrations`).
- **Limpieza de Proyecto:** Exclusión automática de logs, reportes locales y archivos Excel temporales mediante `.gitignore` calibrado.

## Instalación e Inicio Rápido
1. Instalar dependencias en el raíz:
   ```bash
   npm install
   ```
2. Levantar la base de datos PostgreSQL local:
   ```bash
   docker compose up -d postgres
   ```
3. Ejecutar validaciones de sincronización local:
   ```bash
   npm run validate:sync:postgres
   ```
4. Levantar la API:
   ```bash
   npm run api:postgres
   ```
5. Levantar el portal de supervisor:
   ```bash
   npm run supervisor:dev
   ```
