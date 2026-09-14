@echo off
chcp 65001 > nul
set "SCRIPT_DIR=%~dp0"
if "%SCRIPT_DIR:~-1%"=="\" set "SCRIPT_DIR=%SCRIPT_DIR:~0,-1%"
cd /d "%SCRIPT_DIR%"

:: 1. Detener procesos huérfanos anteriores
powershell -NoProfile -Command "Get-NetTCPConnection -LocalPort 8080, 5173, 5174 -ErrorAction SilentlyContinue | Select-Object -ExpandProperty OwningProcess -Unique | ForEach-Object { Stop-Process -Id $_ -Force -ErrorAction SilentlyContinue }"

:: 2. Iniciar API Backend (Puerto 8080 - incluye portal supervisor en producción)
powershell -NoProfile -Command "Start-Process -FilePath 'cmd.exe' -ArgumentList '/c npm run api' -WorkingDirectory '%SCRIPT_DIR%' -WindowStyle Hidden"

:: 3. Iniciar Portal Web Supervisor Dev (Puerto 5173)
powershell -NoProfile -Command "Start-Process -FilePath 'cmd.exe' -ArgumentList '/c npm run supervisor:dev' -WorkingDirectory '%SCRIPT_DIR%' -WindowStyle Hidden"

:: 4. Iniciar Consola Tablet Dev (Puerto 5174)
powershell -NoProfile -Command "Start-Process -FilePath 'cmd.exe' -ArgumentList '/c npm run tablet:dev' -WorkingDirectory '%SCRIPT_DIR%' -WindowStyle Hidden"

:: 5. Esperar dinámicamente hasta que el puerto 8080 esté activo (máximo 15 segundos)
for /l %%i in (1,1,15) do (
    netstat -an | findstr :8080 | findstr LISTENING >nul
    if not errorlevel 1 goto LAUNCH_APP
    ping 127.0.0.1 -n 2 >nul
)

:LAUNCH_APP
:: 6. Abrir en modo Aplicación de Escritorio limpia (preferir 5173 si está o 8080)
set "APP_URL=http://localhost:8080"
netstat -an | findstr :5173 | findstr LISTENING >nul
if not errorlevel 1 set "APP_URL=http://localhost:5173"

start "" chrome --app=%APP_URL% --start-maximized >nul 2>&1
if errorlevel 1 start "" msedge --app=%APP_URL% --start-maximized >nul 2>&1
if errorlevel 1 start "" %APP_URL% >nul 2>&1

:: 7. Notificación emergente informativa de 3 segundos
powershell -NoProfile -Command "(New-Object -ComObject WScript.Shell).Popup('¡LUMO Secaderos está activo y funcionando!' + [char]10 + [char]10 + '• Servidor API y Portal: ' + '%APP_URL%' + [char]10 + '• Puerto API Backend: 8080', 3, 'LUMO Secaderos', 64)"

exit
