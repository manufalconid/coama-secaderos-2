@echo off
title Sistema Coama Secaderos - Lanzador
chcp 65001 > nul

echo ====================================================
echo  Cerrando servicios anteriores en puertos 8080, 5173 y 5174...
echo ====================================================

:: Puerto 8080 (API Backend)
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :8080 ^| findstr LISTENING') do (
    echo Matando proceso en puerto 8080 (PID: %%a)...
    taskkill /f /pid %%a >nul 2>&1
)

:: Puerto 5173 (Supervisor Web)
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :5173 ^| findstr LISTENING') do (
    echo Matando proceso en puerto 5173 (PID: %%a)...
    taskkill /f /pid %%a >nul 2>&1
)

:: Puerto 5174 (Tablet Web)
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :5174 ^| findstr LISTENING') do (
    echo Matando proceso en puerto 5174 (PID: %%a)...
    taskkill /f /pid %%a >nul 2>&1
)

echo.
echo ====================================================
echo  Iniciando los servicios en segundo plano...
echo ====================================================

:: Lanzar API Backend
echo 1. Iniciando servidor API Backend (Puerto 8080)...
start /min "Coama API Backend" cmd /c "npm run api:postgres"

:: Esperar 2 segundos
timeout /t 2 /nobreak > nul

:: Lanzar Portal Web Supervisor
echo 2. Iniciando Portal Web del Supervisor (Puerto 5173)...
start /min "Coama Supervisor Web" cmd /c "npm run supervisor:dev"

:: Lanzar Consola de Tablet
echo 3. Iniciando Consola Web de Tablet (Puerto 5174)...
start /min "Coama Tablet Web" cmd /c "npm run tablet:dev"

:: Esperar 2 segundos para que Vite levante
timeout /t 2 /nobreak > nul

echo.
echo ====================================================
echo  Abriendo el portal del supervisor en el navegador...
echo ====================================================
start http://127.0.0.1:5173

echo.
echo Â¡Sistema listo y lanzado!
echo Puedes cerrar esta ventana sin detener los servicios en segundo plano.
echo Para cerrarlos definitivamente en el futuro, vuelve a correr este archivo.
echo.
pause

