const iconv = require('iconv-lite');

function formatarLog(nivel, mensagem) {
  const timestamp = new Date().toLocaleString('pt-BR', { hour12: false });
  const prefixos = {
    INFO: 'ℹ️',
    WARN: '⚠️',
    ERROR: '❌',
    DEBUG: '🔍'
  };
  return `${prefixos[nivel] || 'ℹ️'} [${timestamp}] ${iconv.decode(Buffer.from(mensagem), 'utf8')}`;
}

class BotService {
  constructor(teamsClient, messageHandler) {
    this.teamsClient = teamsClient;
    this.messageHandler = messageHandler;
    this.ultimasMensagensLidas = new Map();
    this.mensagensNaoRespondidas = [];
  }

  setWindow(win) {
    this.win = win;
    global.win = win;
  }

  async init() {
    this.ultimasMensagensLidas.clear();
    this.page = this.teamsClient.page;
    await this.teamsClient.loginIfNeeded();

    console.log(formatarLog('INFO', 'Bot iniciado. Monitorando apenas chats não lidos...'));
    await this.verificarPendencias();

    setInterval(async () => {
      console.log(formatarLog('INFO', 'Iniciando nova iteração do bot'));
      try {
        const chatsNaoLidos = await this.teamsClient.buscarChatsNaoLidos();

        if (chatsNaoLidos.length === 0) {
          console.log(formatarLog('INFO', 'Nenhum chat não lido encontrado'));
        }

        for (const chat of chatsNaoLidos) {
          console.log(formatarLog('DEBUG', `Processando chat: ${chat.nome}`));
          try {
            const chatAberto = await this.teamsClient.abrirChat(chat.nome);
            await this.teamsClient.delay(3000);

            if (!chatAberto) {
              console.log(formatarLog('WARN', `Não foi possível abrir o chat: ${chat.nome}`));
              continue;
            }

            const novasMensagens = await this.teamsClient.getMensagensNaoLidas(chat.nome, this.ultimasMensagensLidas.get(chat.nome) || "");
            if (novasMensagens.length === 0) {
              console.log(formatarLog('INFO', `Nenhuma mensagem nova em: ${chat.nome}`));
              await this.teamsClient.voltarParaListaDeChats();
              continue;
            }

            for (const { texto: mensagemAtual, autor } of novasMensagens) {
              console.log(formatarLog('INFO', `[${chat.nome}] Nova mensagem extraída: ${mensagemAtual}`));
              console.log(formatarLog('DEBUG', `[${chat.nome}] Última registrada: ${this.ultimasMensagensLidas.get(chat.nome) || ""}`));

              const resposta = this.messageHandler.processar(mensagemAtual, chat.nome);
              console.log(formatarLog('DEBUG', `[${chat.nome}] Resposta do handler: ${resposta}`));

              if (resposta) {
                console.log(formatarLog('INFO', `[${chat.nome}] Enviando resposta programada: '${resposta}'`));
                await this.teamsClient.enviarMensagem(resposta);
                this.ultimasMensagensLidas.set(chat.nome, mensagemAtual);
              } else {
                if (this.teamsClient.isMensagemDoBot(autor)) {
                  console.log(formatarLog('INFO', `[${chat.nome}] Mensagem ignorada pois foi enviada pelo bot`));
                  this.ultimasMensagensLidas.set(chat.nome, mensagemAtual);
                  await this.teamsClient.voltarParaListaDeChats();
                  continue;
                }

                console.log(formatarLog('INFO', `[${chat.nome}] Mensagem não corresponde a nenhuma automação`));

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

                this.ultimasMensagensLidas.set(chat.nome, mensagemAtual);
              }
            }

            await this.teamsClient.voltarParaListaDeChats();
            await this.teamsClient.delay(1500);
          } catch (erroInterno) {
            console.log(formatarLog('ERROR', `Erro ao processar o chat '${chat.nome}': ${erroInterno.message}`));
            await this.teamsClient.voltarParaListaDeChats();
          }
        }
        console.log(formatarLog('INFO', 'Finalizando iteração do bot'));
      } catch (error) {
        console.log(formatarLog('ERROR', `Erro no loop principal do bot: ${error.message}`));
      }
    }, 12000);
  }

  async verificarPendencias() {
    console.log(formatarLog('INFO', 'Verificando pendências de mensagens...'));

    const mensagensPendentes = [...this.mensagensNaoRespondidas];
    this.mensagensNaoRespondidas = [];

    for (const item of mensagensPendentes) {
      const { nome, mensagem, autorOriginal } = item;

      try {
        const chatAberto = await this.teamsClient.abrirChat(nome);
        if (!chatAberto) {
          console.log(formatarLog('WARN', `Não foi possível abrir o chat: ${nome}`));
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
          console.log(formatarLog('INFO', `${nome} respondeu. Removendo da interface`));
          if (this.win) {
            this.win.webContents.send("remover-mensagem-pendente", { nome, mensagem });
          }
        } else {
          console.log(formatarLog('INFO', `${nome} ainda não respondeu. Mantendo como pendente`));
          this.mensagensNaoRespondidas.push(item);
        }

      } catch (erro) {
        console.log(formatarLog('ERROR', `Erro ao verificar pendência de ${nome}: ${erro.message}`));
        this.mensagensNaoRespondidas.push(item);
      }

      await this.teamsClient.delay(1000);
    }
  }
}

module.exports = {
  BotService
};