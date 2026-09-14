@echo off
title Crear Acceso Directo en Escritorio - LUMO Secaderos
chcp 65001 > nul

echo ====================================================
echo   Creando Acceso Directo en el Escritorio...
echo ====================================================
echo.

set "SCRIPT_DIR=%~dp0"
if "%SCRIPT_DIR:~-1%"=="\" set "SCRIPT_DIR=%SCRIPT_DIR:~0,-1%"
cd /d "%SCRIPT_DIR%"

powershell -NoProfile -ExecutionPolicy Bypass -Command "$desktop = [Environment]::GetFolderPath('Desktop'); if (-not $desktop) { $desktop = [System.IO.Path]::Combine($env:USERPROFILE, 'Desktop') }; $shortcutPath = [System.IO.Path]::Combine($desktop, 'LUMO Secaderos.lnk'); $vbsPath = [System.IO.Path]::Combine('%SCRIPT_DIR%', 'Iniciar_Lumo_Secaderos.vbs'); $iconPath = [System.IO.Path]::Combine('%SCRIPT_DIR%', 'lumo_icon.ico'); $wscriptExe = Join-Path $env:SystemRoot 'System32\wscript.exe'; $ws = New-Object -ComObject WScript.Shell; $s = $ws.CreateShortcut($shortcutPath); $s.TargetPath = $wscriptExe; $s.Arguments = '\"' + $vbsPath + '\"'; $s.WorkingDirectory = '%SCRIPT_DIR%'; $s.Description = 'Sistema LUMO Secaderos COAMA'; if (Test-Path $iconPath) { $s.IconLocation = $iconPath + ',0' }; $s.Save(); Write-Host '¡ÉXITO! Acceso directo creado en:' $shortcutPath"

echo.
echo ====================================================
echo   Acceso directo creado en tu Escritorio.
echo ====================================================
echo.
pause
