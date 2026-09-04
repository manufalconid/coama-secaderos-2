@echo off
title Crear Acceso Directo en Escritorio - LUMO Secaderos

echo ====================================================
echo  Creando Acceso Directo en el Escritorio...
echo ====================================================
echo.

set "SCRIPT_DIR=%~dp0"
if "%SCRIPT_DIR:~-1%"=="\" set "SCRIPT_DIR=%SCRIPT_DIR:~0,-1%"

powershell -NoProfile -ExecutionPolicy Bypass -Command "$desktop = [Environment]::GetFolderPath('Desktop'); if (-not $desktop) { $desktop = [System.IO.Path]::Combine($env:USERPROFILE, 'Desktop') }; $shortcutPath = [System.IO.Path]::Combine($desktop, 'Lumo Secaderos.lnk'); $vbsPath = [System.IO.Path]::Combine('%SCRIPT_DIR%', 'Iniciar_Lumo_Secaderos.vbs'); $ws = New-Object -ComObject WScript.Shell; $s = $ws.CreateShortcut($shortcutPath); $s.TargetPath = 'wscript.exe'; $s.Arguments = '\"' + $vbsPath + '\"'; $s.WorkingDirectory = '%SCRIPT_DIR%'; $s.Description = 'Sistema Lumo Secaderos COAMA'; $s.IconLocation = '$env:SystemRoot\System32\shell32.dll, 220'; $s.Save(); Write-Host 'Acceso directo creado con exito en:' $shortcutPath"

echo.
echo ====================================================
echo  Proceso finalizado.
echo ====================================================
echo.
pause
