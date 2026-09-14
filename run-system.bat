@echo off
title Sistema LUMO Secaderos - Lanzador
chcp 65001 > nul
set "SCRIPT_DIR=%~dp0"
if "%SCRIPT_DIR:~-1%"=="\" set "SCRIPT_DIR=%SCRIPT_DIR:~0,-1%"
cd /d "%SCRIPT_DIR%"

echo ====================================================
echo   LUMO SECADEROS - INICIANDO TODOS LOS SERVICIOS
echo ====================================================
echo.

echo 1. Cerrando procesos anteriores en puertos 8080, 5173 y 5174...
powershell -NoProfile -Command "Get-NetTCPConnection -LocalPort 8080, 5173, 5174 -ErrorAction SilentlyContinue | Select-Object -ExpandProperty OwningProcess -Unique | ForEach-Object { Stop-Process -Id $_ -Force -ErrorAction SilentlyContinue }"

echo 2. Iniciando Servidor API Backend (Puerto 8080)...
powershell -NoProfile -Command "Start-Process -FilePath 'cmd.exe' -ArgumentList '/c npm run api' -WorkingDirectory '%SCRIPT_DIR%' -WindowStyle Hidden"

echo 3. Iniciando Portal Web Supervisor (Puerto 5173)...
powershell -NoProfile -Command "Start-Process -FilePath 'cmd.exe' -ArgumentList '/c npm run supervisor:dev' -WorkingDirectory '%SCRIPT_DIR%' -WindowStyle Hidden"

echo 4. Iniciando Consola Web Tablet (Puerto 5174)...
powershell -NoProfile -Command "Start-Process -FilePath 'cmd.exe' -ArgumentList '/c npm run tablet:dev' -WorkingDirectory '%SCRIPT_DIR%' -WindowStyle Hidden"

echo.
echo ====================================================
echo   Esperando a que los servicios estén listos...
echo ====================================================

for /l %%i in (1,1,15) do (
    netstat -an | findstr :8080 | findstr LISTENING >nul
    if not errorlevel 1 (
        echo ¡Servidor activo detectado en el puerto 8080!
        goto LAUNCH_BROWSER
    )
    echo  Esperando servicios... (intento %%i de 15)
    ping 127.0.0.1 -n 2 >nul
)

:LAUNCH_BROWSER
echo.
echo ====================================================
echo   Abriendo el portal en el navegador...
echo ====================================================
set "APP_URL=http://localhost:8080"
netstat -an | findstr :5173 | findstr LISTENING >nul
if not errorlevel 1 set "APP_URL=http://localhost:5173"

start "" chrome --app=%APP_URL% --start-maximized >nul 2>&1
if errorlevel 1 start "" msedge --app=%APP_URL% --start-maximized >nul 2>&1
if errorlevel 1 start "" %APP_URL% >nul 2>&1

powershell -NoProfile -Command "(New-Object -ComObject WScript.Shell).Popup('¡Todo está corriendo correctamente para LUMO Secaderos!' + [char]10 + [char]10 + '• API Backend (Puerto 8080)' + [char]10 + '• Portal Web Supervisor: ' + '%APP_URL%' + [char]10 + '• Consola Web Tablet (Puerto 5174)', 3, 'LUMO Secaderos - Activo', 64)"

exit
