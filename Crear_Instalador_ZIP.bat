@echo off
title Coama Secaderos - Empaquetador para Pendrive

echo ====================================================
echo   LUMO - PREPARANDO INSTALADOR LIMPIO PARA PENDRIVE
echo ====================================================
echo.
echo [1/3] Deteniendo procesos para desbloquear archivos...
powershell -NoProfile -Command "Stop-Process -Name node -Force -ErrorAction SilentlyContinue"

echo.
echo [2/3] Comprimiendo el proyecto (excluyendo node_modules pesados)...

powershell -NoProfile -Command "Set-Location '%~dp0\..'; if (Test-Path 'coama-secaderos-2-instalador.zip') { Remove-Item 'coama-secaderos-2-instalador.zip' -Force }; tar -a -c -f 'coama-secaderos-2-instalador.zip' --exclude='node_modules' --exclude='dist' --exclude='.git' 'coama-secaderos-2'"

echo.
echo [3/3] Empaquetado completado con exito!
echo ====================================================
echo   Archivo generado: coama-secaderos-2-instalador.zip
echo.
echo   INSTRUCCIONES:
echo   1. Copia 'coama-secaderos-2-instalador.zip' a tu pendrive.
echo   2. Llevalo a la PC nueva y descomprimelo (ej: en C:\).
echo   3. En la PC nueva, abre PowerShell en esa carpeta y ejecuta:
echo        npm install
echo ====================================================
echo.
pause
