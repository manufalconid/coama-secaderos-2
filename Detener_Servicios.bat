@echo off
title Coama Secaderos - Detener Procesos

echo ====================================================
echo   LUMO - DETENIENDO TODOS LOS SERVICIOS Y PROCESOS
echo ====================================================
echo.
echo 1. Cerrando procesos en puertos 8080, 5173 y 5174...

powershell -NoProfile -Command "Get-NetTCPConnection -LocalPort 8080, 5173, 5174 -ErrorAction SilentlyContinue | Select-Object -ExpandProperty OwningProcess -Unique | ForEach-Object { Stop-Process -Id $_ -Force -ErrorAction SilentlyContinue }"

echo 2. Deteniendo cualquier proceso remanente de Node.js...
powershell -NoProfile -Command "Stop-Process -Name node -Force -ErrorAction SilentlyContinue"

echo.
echo ====================================================
echo   Servicios detenidos con exito.
echo   Los archivos ya no estan bloqueados.
echo ====================================================
echo.
pause
