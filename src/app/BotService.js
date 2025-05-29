class BotService {
  constructor(teamsClient, messageHandler) {
    this.teamsClient = teamsClient;
    this.messageHandler = messageHandler;
    this.ultimasMensagensLidas = new Map();
    this.mensagensNaoRespondidas = [];
    this.chatAbertoAtual = null;
    this.ultimaMensagemEnviadaPeloBot = null;
    this.ativo = false;
    this.loopPrincipal = null;
    this.loopChatAberto = null;
  }

  setWindow(win) {
    this.win = win;
    global.win = win;
  }

  async init() {
    this.ultimasMensagensLidas.clear();
    this.page = this.teamsClient.page;
    await this.teamsClient.loginIfNeeded();

    console.log("✅ Bot iniciado. Monitorando apenas chats não lidos...");
    await this.verificarPendencias();

    this.ativo = true;

    this.loopPrincipal = setInterval(async () => {
      if (!this.ativo) return;
      try {
        const chatsNaoLidos = await this.teamsClient.buscarChatsNaoLidos();

        if (chatsNaoLidos.length > 0) {
          console.log(`✅ Chats não lidos encontrados: ${chatsNaoLidos.map(c => c.nome).join(", ")}`);
        }

        for (const chat of chatsNaoLidos) {
          try {
            const chatAberto = await this.teamsClient.abrirChat(chat.nome);
            await this.teamsClient.delay(3000);

            this.chatAbertoAtual = chat.nome;

            if (!chatAberto) {
              console.warn(`⚠️ Não foi possível abrir o chat: ${chat.nome}`);
              continue;
            }

            const ultimaMensagem = await this.teamsClient.getUltimaMensagem();
            if (!ultimaMensagem) continue;

            const { texto: mensagemAtual, autor } = ultimaMensagem;
            const ultimaLida = this.ultimasMensagensLidas.get(chat.nome) || "";
            const ehRespostaDoBot = mensagemAtual === this.ultimaMensagemEnviadaPeloBot;

            if (this.teamsClient.isMensagemDoBot(autor) || ehRespostaDoBot) {
              this.ultimasMensagensLidas.set(chat.nome, mensagemAtual);
              continue;
            }

            if (mensagemAtual && mensagemAtual.toLowerCase() !== ultimaLida.toLowerCase()) {
              const resposta = this.messageHandler.processar(mensagemAtual, chat.nome);
              console.log(`[${chat.nome}] Resposta do handler:`, resposta);

              if (resposta) {
                await this.teamsClient.enviarMensagem(resposta);
                this.ultimaMensagemEnviadaPeloBot = resposta;
              } else {
                this.mensagensNaoRespondidas.push({
                  nome: chat.nome,
                  mensagem: mensagemAtual,
                  autorOriginal: autor,
                  hora: new Date().toLocaleTimeString()
                });

                if (this.win) {
                  this.win.webContents.send("mensagem-nao-respondida", {
                    nome: chat.nome,
                    mensagem: mensagemAtual,
                    hora: new Date().toLocaleTimeString()
                  });
                }
              }

              this.ultimasMensagensLidas.set(chat.nome, mensagemAtual);
            }

            await this.teamsClient.delay(1500);
          } catch (erroInterno) {
            console.error(`❌ Erro ao processar o chat '${chat.nome}':`, erroInterno.message);
          }
        }
      } catch (error) {
        console.error("❌ Erro no loop principal do bot:", error.message);
      }
    }, 12000);

    this.loopChatAberto = setInterval(async () => {
      if (!this.ativo || !this.chatAbertoAtual) return;

      try {
        const ultimaMensagem = await this.teamsClient.getUltimaMensagem();
        if (!ultimaMensagem) return;

        const { texto: mensagemAtual, autor } = ultimaMensagem;
        const ultimaLida = this.ultimasMensagensLidas.get(this.chatAbertoAtual) || "";
        const ehRespostaDoBot = mensagemAtual === this.ultimaMensagemEnviadaPeloBot;

        if (this.teamsClient.isMensagemDoBot(autor) || ehRespostaDoBot) return;

        if (mensagemAtual && mensagemAtual.toLowerCase() !== ultimaLida.toLowerCase()) {
          const resposta = this.messageHandler.processar(mensagemAtual, this.chatAbertoAtual);
          console.log(`[${this.chatAbertoAtual}] (chat ativo) Nova mensagem: '${mensagemAtual}'`);

          if (resposta) {
            await this.teamsClient.enviarMensagem(resposta);
            this.ultimaMensagemEnviadaPeloBot = resposta;
          } else {
            this.mensagensNaoRespondidas.push({
              nome: this.chatAbertoAtual,
              mensagem: mensagemAtual,
              hora: new Date().toLocaleTimeString()
            });

            if (this.win) {
              this.win.webContents.send("mensagem-nao-respondida", {
                nome: this.chatAbertoAtual,
                mensagem: mensagemAtual,
                hora: new Date().toLocaleTimeString()
              });
            }
          }

          this.ultimasMensagensLidas.set(this.chatAbertoAtual, mensagemAtual);
        }
      } catch (err) {
        console.error(`❌ Erro ao monitorar chat ativo: ${err.message}`);
      }
    }, 5000);
  }

  parar() {
    console.log("🛑 Bot desligado manualmente. Parando monitoramento.");
    this.ativo = false;

    if (this.loopPrincipal) clearInterval(this.loopPrincipal);
    if (this.loopChatAberto) clearInterval(this.loopChatAberto);

    this.loopPrincipal = null;
    this.loopChatAberto = null;
  }

  async verificarPendencias() {
    console.log("🔁 Verificando pendências de mensagens...");

    const mensagensPendentes = [...this.mensagensNaoRespondidas];
    this.mensagensNaoRespondidas = [];

    for (const item of mensagensPendentes) {
      const { nome, mensagem, autorOriginal } = item;

      try {
        const chatAberto = await this.teamsClient.abrirChat(nome);
        if (!chatAberto) {
          console.warn(`⚠️ Não foi possível abrir o chat: ${nome}`);
          this.mensagensNaoRespondidas.push(item);
          continue;
        }

        await this.teamsClient.delay(3000);

        const mensagensRecentes = await this.teamsClient.getMensagensRecentes(10);

        let houveRespostaReal = false;

        for (const msg of mensagensRecentes) {
          const ehDoBot = this.teamsClient.isMensagemDoBot(msg.autor);
          const ehRepetida = msg.texto?.toLowerCase() === mensagem.toLowerCase();

          if (ehDoBot || ehRepetida) continue;

          if (!autorOriginal || msg.autor !== autorOriginal || !ehRepetida) {
            houveRespostaReal = true;
            break;
          }
        }

        if (houveRespostaReal) {
          console.log(`🧹 ${nome} respondeu. Removendo da interface.`);
          if (this.win) {
            this.win.webContents.send("remover-mensagem-pendente", { nome, mensagem });
          }
        } else {
          console.log(`🔄 ${nome} ainda não respondeu. Mantendo como pendente.`);
          this.mensagensNaoRespondidas.push(item);
        }
      } catch (erro) {
        console.error(`❌ Erro ao verificar pendência de ${nome}:`, erro.message);
        this.mensagensNaoRespondidas.push(item);
      }

      await this.teamsClient.delay(1000);
    }
  }
}

module.exports = {
  BotService
};
