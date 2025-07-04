# Bot Teams - Monitor de Mensagens

Bot para monitorar e responder automaticamente mensagens do Microsoft Teams.

## Instalação

### Para Desenvolvedores:
```bash
npm install
npm run build
```

### Para Usuários Finais:
1. Execute o arquivo `install.bat` como administrador
2. O bot será instalado em `%USERPROFILE%\BotTeams`
3. Um atalho será criado na área de trabalho

## Como Usar

1. **Iniciar o Bot:**
   - Clique duas vezes no atalho "Bot Teams" na área de trabalho
   - Aguarde a interface abrir no navegador (http://localhost:3000)

2. **Configurar:**
   - **IP do LLM:** Digite o IP do servidor LLM (ex: c)
   - **Prompt:** Configure o prompt que o bot deve usar para responder

3. **Conectar ao Teams:**
   - Clique em "Fazer Login"
   - Faça login no Microsoft Teams quando solicitado

4. **Ativar o Bot:**
   - Use o switch para ligar/desligar o bot
   - O bot começará a monitorar mensagens automaticamente

## Funcionalidades

- ✅ Monitoramento automático de mensagens do Teams
- ✅ Respostas automáticas usando LLM
- ✅ Interface web amigável
- ✅ Controle de ligar/desligar
- ✅ Log de mensagens monitoradas
- ✅ Configuração de prompt personalizado

## Requisitos

- Windows 10 ou superior
- Microsoft Teams instalado
- Acesso à internet
- Servidor LLM configurado

## Solução de Problemas

**Erro ao abrir o navegador:**
- Verifique se o Teams está instalado
- Certifique-se de que a porta 3000 não está em uso

**Bot não responde:**
- Verifique se o IP do LLM está correto
- Confirme se o servidor LLM está rodando

**Interface não abre:**
- Verifique se o antivírus não está bloqueando
- Execute como administrador se necessário

## Suporte

Para suporte técnico, entre em contato com a equipe de TI. 