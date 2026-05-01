@echo off
echo =========================================
echo       Iniciando Projeto Dash-Fin
echo =========================================
echo.

echo Atualizando o projeto (desligando instancias anteriores se existirem)...
call stop.bat

echo.
echo Iniciando Backend em nova janela...
start "Dash-Fin Backend" cmd /c "cd backend && title Dash-Fin Backend && FOR /F ""tokens=1,2 delims=="" %%A IN (.env) DO set ""%%A=%%B"" && echo Iniciando Servidor Go na porta 8080... && go run ./cmd/api"

echo.
echo Iniciando Frontend em nova janela...
start "Dash-Fin Frontend" cmd /c "cd frontend && title Dash-Fin Frontend && echo Iniciando Next.js na porta 3000... && npm run dev"

echo.
echo =========================================
echo Projeto iniciado com sucesso!
echo Frontend: http://localhost:3000
echo Backend: http://localhost:8080
echo =========================================
echo Pressione qualquer tecla para fechar este terminal.
pause >nul
