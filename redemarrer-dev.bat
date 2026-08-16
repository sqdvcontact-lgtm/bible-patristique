@echo off
REM ============================================================================
REM  Redemarrage PROPRE du serveur de developpement Corpus Scriptura.
REM
REM  A lancer d'un double-clic quand le serveur de dev tombe en erreur
REM  (« Jest worker … child process exceptions » ou « Invalid array length »
REM  dans les chunks .next). Ces erreurs viennent d'un worker Turbopack tue
REM  faute de memoire, qui laisse le cache .next corrompu. Ce script :
REM    1. arrete le process qui ecoute sur le port 3000 ;
REM    2. purge le cache .next (le vrai coupable) ;
REM    3. relance « npm run dev ».
REM
REM  Remede DURABLE : liberer de la RAM (fermer des onglets Chrome, ChatGPT…)
REM  et exclure C:\Corpus Scriptura de Windows Defender.
REM ============================================================================

cd /d "%~dp0"

echo.
echo [1/3] Arret du serveur eventuel sur le port 3000...
for /f "tokens=5" %%p in ('netstat -ano ^| findstr ":3000 " ^| findstr LISTENING') do taskkill /PID %%p /T /F >nul 2>&1

echo [2/3] Purge du cache .next...
if exist ".next" rmdir /s /q ".next"

echo [3/3] Relance du serveur de developpement...
echo.
call npm run dev
