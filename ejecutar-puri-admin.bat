@echo off
title Puri Admin - Sistema Administrativo
color 0A

echo ========================================
echo   INICIANDO PURI ADMIN
echo ========================================
echo.

REM Cerrar cualquier proceso usando el puerto 4200
echo Verificando puerto 4200...
for /f "tokens=5" %%a in ('netstat -aon ^| find ":4200" ^| find "LISTENING"') do (
    echo Cerrando proceso anterior en puerto 4200...
    taskkill /F /PID %%a >nul 2>&1
)

REM Verificar si serve está instalado
call serve --version >nul 2>&1
if errorlevel 1 (
    echo Instalando 'serve' globalmente...
    call npm install -g serve
)

echo.
echo Iniciando servidor local...
echo.

cd /d "%~dp0"

REM Abrir el navegador después de 3 segundos en segundo plano
start "" cmd /c "timeout /t 3 /nobreak >nul && start http://localhost:4200"

echo ========================================
echo   APLICACION LISTA
echo ========================================
echo.
echo La aplicacion se abrira automaticamente en:
echo.
echo    http://localhost:4200
echo.
echo ========================================
echo.
echo IMPORTANTE: Para cerrar el servidor,
echo cierra esta ventana o presiona Ctrl+C
echo.

REM Iniciar el servidor
call serve -s dist/puri-frontend/browser -l 4200

pause