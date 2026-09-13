@echo off
chcp 65001 >nul
title Limpieza de Datos de Prueba - COAMA Secaderos
cd /d "%~dp0"

echo ==============================================================================
echo  COAMA SECADEROS - LIMPIEZA DE DATOS OPERATIVOS DE PRUEBA
echo ==============================================================================
echo.
echo Este proceso vaciara los eventos/paradas de prueba locales y de base de datos
echo para dejar el sistema listo para los datos reales de operacion.
echo.
echo [!] GOOGLE SHEETS NO SERA MODIFICADO NI BORRADO.
echo [!] Los catalogos, razones, origenes y turnos se conservaran intactos.
echo.
pause

node --env-file-if-exists=.env scripts/reset-operational-data.mjs

echo.
echo Presione cualquier tecla para salir...
pause >nul
