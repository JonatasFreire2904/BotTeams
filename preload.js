const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("electronAPI", {
  iniciarBot: () => ipcRenderer.send("iniciar-bot"),
  pararBot: () => ipcRenderer.send("parar-bot"),
  loginManual: () => ipcRenderer.send("login-manual"),

  onLoginStatus: (callback) => ipcRenderer.on("login-status", callback),

  // ✅ Envia pedido para limpar mensagens da interface
  verificarMensagensPendentes: () => ipcRenderer.send("verificar-mensagens-pendentes"),

  // ✅ Recebe mensagens não respondidas
  onMensagemNaoRespondida: (callback) =>
    ipcRenderer.on("mensagem-nao-respondida", callback),

  // ✅ NOVO: recebe confirmação para remover item da interface
  onRemoverMensagemPendente: (callback) =>
    ipcRenderer.on("remover-mensagem-pendente", callback)
});
