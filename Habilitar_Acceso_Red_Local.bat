@echo off
title COAMA Secaderos - Configurador de Red y Firewall

:: Solicitar permisos de Administrador si no los tiene
net session >nul 2>&1
if %errorLevel% neq 0 (
    echo Solicitando permisos de administrador...
    powershell -Command "Start-Process '%~f0' -Verb runAs"
    exit /b
)

echo ======================================================
echo    CONFIGURANDO FIREWALL PARA ACCESO LOCAL COAMA
echo ======================================================
echo.

echo [1/3] Cambiando perfil de red a Privada...
powershell -NoProfile -Command "Set-NetConnectionProfile -NetworkCategory Private -ErrorAction SilentlyContinue"

echo [2/3] Configurando reglas de entrada en el Firewall...
netsh advfirewall firewall delete rule name="COAMA Portal (Puerto 5173)" >nul 2>&1
netsh advfirewall firewall delete rule name="COAMA API (Puerto 8080)" >nul 2>&1
netsh advfirewall firewall delete rule name="COAMA Tablet Web (Puerto 5174)" >nul 2>&1
netsh advfirewall firewall delete rule name="COAMA Node.js App" >nul 2>&1

netsh advfirewall firewall add rule name="COAMA API (Puerto 8080)" dir=in action=allow protocol=TCP localport=8080 profile=any >nul
netsh advfirewall firewall add rule name="COAMA Portal (Puerto 5173)" dir=in action=allow protocol=TCP localport=5173 profile=any >nul
netsh advfirewall firewall add rule name="COAMA Tablet Web (Puerto 5174)" dir=in action=allow protocol=TCP localport=5174 profile=any >nul
netsh advfirewall firewall add rule name="COAMA Node.js App" dir=in action=allow program="C:\Program Files\nodejs\node.exe" enable=yes profile=any >nul

echo [3/3] Obteniendo direccion IP local de esta maquina...
for /f "usebackq tokens=*" %%a in (`powershell -NoProfile -Command "(Get-NetIPAddress -AddressFamily IPv4 -InterfaceAlias 'Wi-Fi*','Ethernet*').IPAddress | Select-Object -First 1"`) do set "LOCAL_IP=%%a"

if "%LOCAL_IP%"=="" set "LOCAL_IP=127.0.0.1"

echo.
echo ======================================================
echo   REGLAS CONFIGURADAS Y RED PRIVADA ACTIVADA!
echo ======================================================
echo.
echo Tu IP en esta maquina es: %LOCAL_IP%
echo.
echo Direcciones para ingresar desde la Tablet o Celular:
echo   - Para la Tablet / APK:  http://%LOCAL_IP%:8080
echo   - Para el Portal Web:    http://%LOCAL_IP%:8080
echo   - Modo Desarrollo Vite:  http://%LOCAL_IP%:5173
echo.
echo Presiona cualquier tecla para cerrar esta ventana...
pause >nul
