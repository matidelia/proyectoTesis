@echo off
echo ========================================================
echo Iniciando el Buscador de Mercado Libre (Proyecto de Tesis)
echo ========================================================
echo.
echo Iniciando el servidor (espera unos segundos)...
echo.

:: Iniciar el servidor en segundo plano
start "Servidor Next.js" cmd /k "npm run dev"

:: Esperar 6 segundos para darle tiempo al servidor a prender
timeout /t 6 /nobreak > NUL

:: Abrir el navegador
start http://localhost:3000

exit
