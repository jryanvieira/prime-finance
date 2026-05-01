@echo off
echo Desligando o projeto Dash-Fin...

echo.
echo Parando processo do Backend (Porta 8080)...
FOR /F "tokens=5" %%T IN ('netstat -a -n -o ^| findstr :8080') DO (
    TaskKill.exe /F /PID %%T 2>NUL
)

echo.
echo Parando processo do Frontend (Porta 3000)...
FOR /F "tokens=5" %%T IN ('netstat -a -n -o ^| findstr :3000') DO (
    TaskKill.exe /F /PID %%T 2>NUL
)

echo.
echo Projeto desligado com sucesso!
