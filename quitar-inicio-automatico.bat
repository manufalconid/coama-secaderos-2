@echo off
title Desactivar Inicio Automático con Windows - COAMA Secaderos
chcp 65001 > nul

echo ====================================================
echo  Desactivando Inicio Automático de Windows...
echo ====================================================
echo.

set "STARTUP_FOLDER=%APPDATA%\Microsoft\Windows\Start Menu\Programs\Startup"
set "SHORTCUT=%STARTUP_FOLDER%\Iniciar Coama Secaderos.lnk"

if exist "%SHORTCUT%" (
    del /f /q "%SHORTCUT%"
    echo ¡ÉXITO! El inicio automático ha sido deshabilitado.
) else (
    echo No se encontró ninguna automatización de inicio previamente configurada.
)

echo.
pause
