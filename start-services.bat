@echo off
chcp 65001 > nul

:: Verificar si los servicios ya están escuchando en puerto 5173
netstat -an | findstr :5173 | findstr LISTENING >nul
if %errorlevel% equ 0 goto DONE

:: Limpiar puertos 8080, 5173 y 5174 si estaban atascados
powershell -NoProfile -Command "Get-NetTCPConnection -LocalPort 8080, 5173, 5174 -ErrorAction SilentlyContinue | Select-Object -ExpandProperty OwningProcess -Unique | ForEach-Object { Stop-Process -Id $_ -Force -ErrorAction SilentlyContinue }"

:: Lanzar procesos independientes con ventanas totalmente ocultas
powershell -NoProfile -Command "Start-Process -FilePath 'cmd.exe' -ArgumentList '/c npm run api:postgres' -WindowStyle Hidden"
powershell -NoProfile -Command "Start-Process -FilePath 'cmd.exe' -ArgumentList '/c npm run supervisor:dev' -WindowStyle Hidden"
powershell -NoProfile -Command "Start-Process -FilePath 'cmd.exe' -ArgumentList '/c npm run tablet:dev' -WindowStyle Hidden"

:: Esperar dinámicamente hasta que el servidor web responda (máx 10s)
for /l %%i in (1,1,20) do (
    netstat -an | findstr :5173 | findstr LISTENING >nul
    if not errorlevel 1 goto DONE
    ping 127.0.0.1 -n 1 -w 500 >nul
)

:DONE
powershell -NoProfile -Command "(New-Object -ComObject WScript.Shell).Popup('¡Servicios de Lumo Secaderos activos!' + [char]10 + [char]10 + 'Detalle de lo que se abrió:' + [char]10 + '  • API Backend (Puerto 8080) - Consola oculta' + [char]10 + '  • Portal Web Supervisor (Puerto 5173) - Consola oculta' + [char]10 + '  • Consola Web Tablet (Puerto 5174) - Consola oculta', 2, 'Lumo Secaderos - Servicios Activos', 64)"

exit

