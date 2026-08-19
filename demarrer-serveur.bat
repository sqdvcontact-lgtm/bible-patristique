@echo off
REM ============================================================================
REM  Lancement du serveur de developpement Corpus Scriptura (icone du bureau).
REM
REM  Double-clic : libere le port 3000 s'il est occupe, demarre « npm run dev »
REM  puis ouvre http://localhost:3000 dans le navigateur.
REM
REM  Si le serveur part en erreur (cache .next corrompu apres un worker tue
REM  faute de memoire), utiliser redemarrer-dev.bat, qui purge .next en plus.
REM ============================================================================

cd /d "%~dp0"
title Corpus Scriptura - serveur de developpement

echo.
echo [1/2] Liberation du port 3000 si besoin...
for /f "tokens=5" %%p in ('netstat -ano ^| findstr ":3000 " ^| findstr LISTENING') do taskkill /PID %%p /T /F >nul 2>&1

echo [2/2] Demarrage du serveur...
start "" cmd /c "timeout /t 12 >nul & start "" http://localhost:3000"
echo.
call npm run dev
