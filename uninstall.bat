@echo off
echo ========================================
echo    Bot Teams - Desinstalador
echo ========================================
echo.

echo Removendo atalho da area de trabalho...
if exist "%USERPROFILE%\Desktop\Bot Teams.lnk" del "%USERPROFILE%\Desktop\Bot Teams.lnk"

echo Removendo pasta de instalacao...
if exist "%USERPROFILE%\BotTeams" rmdir /s /q "%USERPROFILE%\BotTeams"

echo.
echo ========================================
echo    Desinstalacao concluida!
echo ========================================
echo.
echo O Bot Teams foi removido do sistema.
echo.
pause 