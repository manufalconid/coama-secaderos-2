@echo off
title Desactivar Inicio Automático con Windows - LUMO Secaderos
chcp 65001 > nul

echo ====================================================
echo   Desactivando Inicio Automático de Windows...
echo ====================================================
echo.

powershell -NoProfile -ExecutionPolicy Bypass -Command "$startup = [Environment]::GetFolderPath('Startup'); if (-not $startup) { $startup = [System.IO.Path]::Combine($env:APPDATA, 'Microsoft\Windows\Start Menu\Programs\Startup') }; $s1 = [System.IO.Path]::Combine($startup, 'Iniciar LUMO Secaderos.lnk'); $s2 = [System.IO.Path]::Combine($startup, 'Iniciar Coama Secaderos.lnk'); if (Test-Path $s1) { Remove-Item $s1 -Force; Write-Host 'Eliminado:' $s1 }; if (Test-Path $s2) { Remove-Item $s2 -Force; Write-Host 'Eliminado:' $s2 }; Write-Host '¡Inicio automático deshabilitado con éxito!'"

echo.
echo ====================================================
echo   Proceso finalizado.
echo ====================================================
echo.
pause
