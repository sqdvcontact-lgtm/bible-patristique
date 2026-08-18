@echo off
title Redemarrer La Gueule
echo Arret du serveur La Gueule (port 4599)...
for /f "tokens=5" %%p in ('netstat -ano ^| findstr ":4599" ^| findstr "LISTENING"') do taskkill /F /PID %%p >nul 2>&1
cd /d "%~dp0"
echo Demarrage (Opus 5, abonnement)...
powershell -NoProfile -Command "$env:LG_AI_PROVIDER='claude-local'; $env:LG_AI_MODEL_VISION='claude-opus-5'; $env:LG_AI_MODEL_CONTROLE='claude-sonnet-5'; $env:LG_AI_MODEL_DIAGNOSTIC='claude-haiku-4-5-20251001'; $env:ANTHROPIC_API_KEY=$null; Start-Process -FilePath node -ArgumentList 'bin\gueule.mjs','serve' -WorkingDirectory (Get-Location) -WindowStyle Hidden"
echo.
echo Fait. Recharge l'atelier dans le navigateur : Ctrl+Maj+R.
timeout /t 4 >nul