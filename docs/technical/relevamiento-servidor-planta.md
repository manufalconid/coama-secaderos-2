# Relevamiento Técnico del Servidor Local en Planta - COAMA Secaderos

**Fecha de relevamiento remoto:** 31 de Agosto de 2026  
**Objetivo:** Diagnóstico de estado del equipo para despliegue de servidor local (PostgreSQL, Backend API, Portal Supervisor y Sincronización de Tablets).  
**Resultado general:** 🟢 **Apto y Listo para Instalación** (Sin bloqueos de BIOS ni permisos).

---

## 1. Ficha Técnica del Equipo

| Componente | Especificación Relevada | Estado / Observación |
| :--- | :--- | :--- |
| **Sistema Operativo** | Windows 10 Pro (64 bits) Build 19045 (22H2) | ✅ Compatible nativo con WSL 2 y Docker |
| **Permisos de Usuario** | Administrador Local (`Admin: True`) | ✅ Permisos totales para instalar servicios |
| **Procesador (CPU)** | Intel Core i5-2400 @ 3.10 GHz (4 núcleos) | ✅ Soporta virtualización VT-x / EPT |
| **Virtualización BIOS** | **HABILITADA** en Firmware | ✅ **No requiere entrar a BIOS físicamente** |
| **Memoria RAM** | 7.9 GB Total (~3.9 GB Libres) | ⚠️ Requiere limitar WSL2 a 3GB (ver ajuste) |
| **Almacenamiento C:** | 166.6 GB Libres | ✅ Espacio suficiente para Docker y Base |
| **Conexión a Internet** | Activa (`Internet: SI (OK)`) | ✅ Permite descargas y actualizaciones |

---

## 2. Configuración de Red e IPs

La placa de red Ethernet tiene asignación manual múltiple (multihoming industrial):

| Dirección IP | Máscara / Subred | Función / Destino |
| :--- | :--- | :--- |
| **`192.168.110.36`** | `/24` (`255.255.255.0`) | ⭐ **IP PRINCIPAL DEL SERVIDOR** (Red LAN / WiFi Tablets / Supervisor) |
| `10.1.1.36` | `/8` (`255.0.0.0`) | Red secundaria / Enlaces de planta / PLCs |
| `10.0.0.59` | `/8` (`255.0.0.0`) | Red secundaria / Enlaces de planta / PLCs |
| **DNS Server** | `192.168.110.2` | Router / Servidor de nombres corporativo |
| **Puertas de Enlace** | `192.168.110.2`, `10.0.0.1`, `10.0.0.2` | Salida a red |

### URLs de Acceso al Sistema en Planta:
- **API Backend (Tablets):** `http://192.168.110.36:8080`
- **Portal Supervisor Web:** `http://192.168.110.36:5173`
- **Consola Tablet Web:** `http://192.168.110.36:5174`
- **PostgreSQL Database:** `192.168.110.36:5432`

---

## 3. Estado de Puertos del Sistema

Todos los puertos requeridos para el stack de COAMA se encuentran **100% libres**:
- `8080` (API Backend Node): **LIBRE**
- `5432` (PostgreSQL 16): **LIBRE**
- `5173` (Supervisor Web Vite): **LIBRE**
- `5174` (Tablet Web Vite): **LIBRE**

---

## 4. Estado de Software Previo

La máquina está en estado base limpio (ningún paquete instalado previamente):
- `git`: No instalado
- `node` / `npm`: No instalado
- `docker`: No instalado
- `wsl`: Requiere activación de características en Windows

---

## 5. Recomendaciones de Configuración al Desplegar

### A. Limitar Consumo de Memoria de WSL 2
Para que la máquina (de 8 GB de RAM) no se sature, crear en `C:\Users\<usuario>\.wslconfig`:
```ini
[wsl2]
memory=3GB
processors=2
swap=2GB
```

### B. Reglas de Firewall de Windows
Ejecutar en PowerShell (Admin) al instalar:
```powershell
New-NetFirewallRule -DisplayName "COAMA - Backend API (8080)" -Direction Inbound -LocalPort 8080 -Protocol TCP -Action Allow
New-NetFirewallRule -DisplayName "COAMA - Supervisor Web (5173)" -Direction Inbound -LocalPort 5173 -Protocol TCP -Action Allow
New-NetFirewallRule -DisplayName "COAMA - Tablet Web (5174)" -Direction Inbound -LocalPort 5174 -Protocol TCP -Action Allow
```

### C. Prevención de Suspensión / Apagado
```cmd
powercfg /change standby-timeout-ac 0
powercfg /change hibernate-timeout-ac 0
powercfg -h off
```

---

## 6. Kit Offline para Llevar en Pendrive a Planta

1. `Node.js LTS v20.x` (`.msi` x64)
2. `Git for Windows` (`Git-64-bit.exe`)
3. `Docker Desktop Installer.exe`
4. `wsl_update_x64.msi` (Kernel update de WSL 2)
5. Imagen Docker exportada: `postgres16.tar` (`docker save -o postgres16.tar postgres:16`)
6. Código del proyecto con `node_modules` preinstalados o empaquetado ZIP.
