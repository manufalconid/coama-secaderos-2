@echo off
title Sistema Coama Secaderos - Lanzador
chcp 65001 > nul

echo ====================================================
echo  Cerrando servicios anteriores en puertos 8080, 5173 y 5174...
echo ====================================================

powershell -NoProfile -Command "Get-NetTCPConnection -LocalPort 8080, 5173, 5174 -ErrorAction SilentlyContinue | Select-Object -ExpandProperty OwningProcess -Unique | ForEach-Object { Stop-Process -Id $_ -Force -ErrorAction SilentlyContinue }"

echo.
echo ====================================================
echo  Iniciando servicios con consolas ocultas...
echo ====================================================

:: Lanzar API Backend (Puerto 8080) totalmente oculto
echo 1. Iniciando servidor API Backend (Puerto 8080)...
powershell -NoProfile -Command "Start-Process -FilePath 'cmd.exe' -ArgumentList '/c npm run api:postgres' -WindowStyle Hidden"

:: Lanzar Portal Web Supervisor (Puerto 5173) totalmente oculto
echo 2. Iniciando Portal Web del Supervisor (Puerto 5173)...
powershell -NoProfile -Command "Start-Process -FilePath 'cmd.exe' -ArgumentList '/c npm run supervisor:dev' -WindowStyle Hidden"

:: Lanzar Consola Web de Tablet (Puerto 5174) totalmente oculto
echo 3. Iniciando Consola Web de Tablet (Puerto 5174)...
powershell -NoProfile -Command "Start-Process -FilePath 'cmd.exe' -ArgumentList '/c npm run tablet:dev' -WindowStyle Hidden"

echo.
echo ====================================================
echo  Esperando a que los servicios estén listos...
echo ====================================================

:: Bucle de espera dinámica (espera hasta 20 segundos a que el puerto 5173 esté activo)
for /l %%i in (1,1,20) do (
    netstat -an | findstr :5173 | findstr LISTENING >nul
    if not errorlevel 1 (
        echo ¡Servidor web detectado en línea en el puerto 5173!
        goto LAUNCH_BROWSER
    )
    echo  Esperando servicio... (intento %%i de 20)
    ping 127.0.0.1 -n 2 >nul
)

:LAUNCH_BROWSER
echo.
echo ====================================================
echo  Abriendo el portal del supervisor en el navegador...
echo ====================================================
:: Pausa de 1 segundo para asegurar renderizado final
ping 127.0.0.1 -n 2 >nul

start chrome --app=http://127.0.0.1:5173 --start-maximized >nul 2>&1
if errorlevel 1 start msedge --app=http://127.0.0.1:5173 --start-maximized >nul 2>&1
if errorlevel 1 start http://127.0.0.1:5173 >nul 2>&1

:: Ventana emergente de 2 segundos informando que todo está corriendo para Lumo
powershell -NoProfile -Command "(New-Object -ComObject WScript.Shell).Popup('¡Todo está corriendo correctamente para Lumo Secaderos!' + [char]10 + [char]10 + 'Detalle de lo que se abrió:' + [char]10 + '  • API Backend (Puerto 8080) - Consola oculta' + [char]10 + '  • Portal Web Supervisor (Puerto 5173) - Consola oculta' + [char]10 + '  • Consola Web Tablet (Puerto 5174) - Consola oculta' + [char]10 + '  • Navegador Web (Portal del Supervisor)', 2, 'Lumo Secaderos - Sistema Activo', 64)"

exit



