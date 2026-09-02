@echo off
title Lumo Secaderos - Exportador ERP Sianetwork
chcp 65001 >nul
echo ===================================================
echo   LUMO DATA SOLUTIONS - EXPORTACION DE PARADAS
echo ===================================================
echo.
npm run export:erp
echo.
echo Presione cualquier tecla para cerrar esta ventana...
pause >nul
