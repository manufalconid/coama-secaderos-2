@echo off
set "SCRIPT_DIR=%~dp0"
if "%SCRIPT_DIR:~-1%"=="\" set "SCRIPT_DIR=%SCRIPT_DIR:~0,-1%"

powershell -NoProfile -Command "Start-Process -FilePath 'cmd.exe' -ArgumentList '/c npm run api:postgres' -WorkingDirectory '%SCRIPT_DIR%' -WindowStyle Hidden"
powershell -NoProfile -Command "Start-Process -FilePath 'cmd.exe' -ArgumentList '/c npm run supervisor:dev' -WorkingDirectory '%SCRIPT_DIR%' -WindowStyle Hidden"
powershell -NoProfile -Command "Start-Process -FilePath 'cmd.exe' -ArgumentList '/c npm run tablet:dev' -WorkingDirectory '%SCRIPT_DIR%' -WindowStyle Hidden"

powershell -NoProfile -Command "(New-Object -ComObject WScript.Shell).Popup('Servicios de Lumo Secaderos activos!', 2, 'Lumo Secaderos', 64)"

exit
