@echo off
set "SCRIPT_DIR=%~dp0"
if "%SCRIPT_DIR:~-1%"=="\" set "SCRIPT_DIR=%SCRIPT_DIR:~0,-1%"

:: 1. Verificar si los servicios están activos, si no, iniciarlos en segundo plano ocultos
netstat -an | findstr :5173 | findstr LISTENING >nul
if errorlevel 1 (
    powershell -NoProfile -Command "Stop-Process -Name node -Force -ErrorAction SilentlyContinue"
    powershell -NoProfile -Command "Start-Process -FilePath 'cmd.exe' -ArgumentList '/c npm run api:postgres' -WorkingDirectory '%SCRIPT_DIR%' -WindowStyle Hidden"
    powershell -NoProfile -Command "Start-Process -FilePath 'cmd.exe' -ArgumentList '/c npm run supervisor:dev' -WorkingDirectory '%SCRIPT_DIR%' -WindowStyle Hidden"
    powershell -NoProfile -Command "Start-Process -FilePath 'cmd.exe' -ArgumentList '/c npm run tablet:dev' -WorkingDirectory '%SCRIPT_DIR%' -WindowStyle Hidden"

    :: Esperar dinámicamente hasta que el servidor esté en línea
    for /l %%i in (1,1,20) do (
        netstat -an | findstr :5173 | findstr LISTENING >nul
        if not errorlevel 1 goto LAUNCH_APP
        ping 127.0.0.1 -n 2 -w 500 >nul
    )
)

:LAUNCH_APP
:: 2. Abrir en modo Aplicación de Escritorio limpia
start chrome --app=http://127.0.0.1:5173 --start-maximized >nul 2>&1
if errorlevel 1 start msedge --app=http://127.0.0.1:5173 --start-maximized >nul 2>&1
if errorlevel 1 start http://127.0.0.1:5173 >nul 2>&1

:: 3. Ventana emergente de 2 segundos que se cierra sola
powershell -NoProfile -Command "(New-Object -ComObject WScript.Shell).Popup('Lumo Secaderos iniciado correctamente!', 2, 'Lumo Secaderos', 64)"

exit
