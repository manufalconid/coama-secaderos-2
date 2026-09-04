@echo off
title Configurar Inicio Automatico con Windows - COAMA Secaderos

echo ====================================================
echo  Configurando Inicio Automatico al prender la PC...
echo ====================================================
echo.

set "SCRIPT_DIR=%~dp0"
if "%SCRIPT_DIR:~-1%"=="\" set "SCRIPT_DIR=%SCRIPT_DIR:~0,-1%"

powershell -NoProfile -ExecutionPolicy Bypass -Command "$startup = [Environment]::GetFolderPath('Startup'); if (-not $startup) { $startup = [System.IO.Path]::Combine($env:APPDATA, 'Microsoft\Windows\Start Menu\Programs\Startup') }; $shortcutPath = [System.IO.Path]::Combine($startup, 'Iniciar Coama Secaderos.lnk'); $vbsPath = [System.IO.Path]::Combine('%SCRIPT_DIR%', 'Iniciar_Lumo_Secaderos.vbs'); $ws = New-Object -ComObject WScript.Shell; $s = $ws.CreateShortcut($shortcutPath); $s.TargetPath = 'wscript.exe'; $s.Arguments = '\"' + $vbsPath + '\"'; $s.WorkingDirectory = '%SCRIPT_DIR%'; $s.Description = 'Sistema Lumo Secaderos COAMA'; $s.IconLocation = '$env:SystemRoot\System32\shell32.dll, 220'; $s.Save(); Write-Host 'Acceso directo de inicio automatico creado con exito en:' $shortcutPath"

echo.
echo ====================================================
echo  Proceso finalizado.
echo ====================================================
echo.
pause
