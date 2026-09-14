@echo off
title Configurar Inicio Automático con Windows - LUMO Secaderos
chcp 65001 > nul

echo ====================================================
echo   Configurando Inicio Automático al encender la PC...
echo ====================================================
echo.

set "SCRIPT_DIR=%~dp0"
if "%SCRIPT_DIR:~-1%"=="\" set "SCRIPT_DIR=%SCRIPT_DIR:~0,-1%"
cd /d "%SCRIPT_DIR%"

powershell -NoProfile -ExecutionPolicy Bypass -Command "$startup = [Environment]::GetFolderPath('Startup'); if (-not $startup) { $startup = [System.IO.Path]::Combine($env:APPDATA, 'Microsoft\Windows\Start Menu\Programs\Startup') }; $shortcutPath = [System.IO.Path]::Combine($startup, 'Iniciar LUMO Secaderos.lnk'); $vbsPath = [System.IO.Path]::Combine('%SCRIPT_DIR%', 'Iniciar_Lumo_Secaderos.vbs'); $iconPath = [System.IO.Path]::Combine('%SCRIPT_DIR%', 'lumo_icon.ico'); $wscriptExe = Join-Path $env:SystemRoot 'System32\wscript.exe'; $ws = New-Object -ComObject WScript.Shell; $s = $ws.CreateShortcut($shortcutPath); $s.TargetPath = $wscriptExe; $s.Arguments = '\"' + $vbsPath + '\"'; $s.WorkingDirectory = '%SCRIPT_DIR%'; $s.Description = 'LUMO Secaderos COAMA'; if (Test-Path $iconPath) { $s.IconLocation = $iconPath + ',0' }; $s.Save(); Write-Host '¡ÉXITO! Acceso directo creado en:' $shortcutPath"

echo.
echo ====================================================
echo   Configuración completada.
echo   El sistema iniciará automáticamente con Windows.
echo ====================================================
echo.
pause
