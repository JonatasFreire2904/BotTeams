@echo off
echo ========================================
echo    Bot Teams - Instalador
echo ========================================
echo.

echo Criando pasta de instalacao...
if not exist "%USERPROFILE%\BotTeams" mkdir "%USERPROFILE%\BotTeams"

echo Copiando arquivos...
copy "dist\teams-bot.exe" "%USERPROFILE%\BotTeams\"
copy "img\*" "%USERPROFILE%\BotTeams\img\"

echo Criando atalho na area de trabalho...
powershell "$WshShell = New-Object -comObject WScript.Shell; $Shortcut = $WshShell.CreateShortcut('%USERPROFILE%\Desktop\Bot Teams.lnk'); $Shortcut.TargetPath = '%USERPROFILE%\BotTeams\teams-bot.exe'; $Shortcut.WorkingDirectory = '%USERPROFILE%\BotTeams'; $Shortcut.Save()"

echo.
echo ========================================
echo    Instalacao concluida!
echo ========================================
echo.
echo O Bot Teams foi instalado em:
echo %USERPROFILE%\BotTeams
echo.
echo Um atalho foi criado na area de trabalho.
echo.
echo Para usar o bot:
echo 1. Clique duas vezes no atalho "Bot Teams"
echo 2. Aguarde a interface abrir no navegador
echo 3. Configure o IP do LLM e o prompt
echo 4. Clique em "Fazer Login" para conectar ao Teams
echo 5. Ative o bot usando o switch
echo.
pause 