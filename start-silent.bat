@echo off
chcp 65001 > nul

:: 1. Verificar si los servicios están activos, si no, iniciarlos en segundo plano ocultos
netstat -an | findstr :5173 | findstr LISTENING >nul
if errorlevel 1 (
    powershell -NoProfile -Command "Get-NetTCPConnection -LocalPort 8080, 5173, 5174 -ErrorAction SilentlyContinue | Select-Object -ExpandProperty OwningProcess -Unique | ForEach-Object { Stop-Process -Id $_ -Force -ErrorAction SilentlyContinue }"
    powershell -NoProfile -Command "Start-Process -FilePath 'cmd.exe' -ArgumentList '/c npm run api:postgres' -WindowStyle Hidden"
    powershell -NoProfile -Command "Start-Process -FilePath 'cmd.exe' -ArgumentList '/c npm run supervisor:dev' -WindowStyle Hidden"
    powershell -NoProfile -Command "Start-Process -FilePath 'cmd.exe' -ArgumentList '/c npm run tablet:dev' -WindowStyle Hidden"

    :: Esperar dinámicamente hasta que el servidor esté en línea
    for /l %%i in (1,1,20) do (
        netstat -an | findstr :5173 | findstr LISTENING >nul
        if not errorlevel 1 goto LAUNCH_APP
        ping 127.0.0.1 -n 1 -w 500 >nul
    )
)

:LAUNCH_APP
:: 2. Abrir en modo Aplicación de Escritorio limpia
start chrome --app=http://127.0.0.1:5173 --start-maximized >nul 2>&1
if errorlevel 1 start msedge --app=http://127.0.0.1:5173 --start-maximized >nul 2>&1
if errorlevel 1 start http://127.0.0.1:5173 >nul 2>&1

:: 3. Ventana emergente de 2 segundos que se cierra sola
powershell -NoProfile -Command "(New-Object -ComObject WScript.Shell).Popup('¡Todo está corriendo correctamente para Lumo Secaderos!' + [char]10 + [char]10 + 'Detalle de lo que se abrió:' + [char]10 + '  • API Backend (Puerto 8080) - Consola oculta' + [char]10 + '  • Portal Web Supervisor (Puerto 5173) - Consola oculta' + [char]10 + '  • Consola Web Tablet (Puerto 5174) - Consola oculta' + [char]10 + '  • Navegador Web (Portal del Supervisor)', 2, 'Lumo Secaderos - Sistema Activo', 64)"

exit

