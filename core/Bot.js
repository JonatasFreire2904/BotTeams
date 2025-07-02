const BrowserService = require("../services/BrowserService");
const MessageReader = require("../modules/MessageReader");
const MessageProcessor = require("../modules/MessageProcessor");
const ResponseSender = require("../modules/ResponseSender");

function normalizeChatKey(nome) {
  if (!nome) return "";
  return nome
    .toLowerCase()
    .replace(/\s+/g, " ")
    .replace(/\(externo\)/g, "")
    .replace(/\| microsoft teams.*/i, "")
    .trim();
}

class Bot {
  constructor() {
    this.browserService = new BrowserService();
    this.reader = new MessageReader(this.browserService);
    this.processor = new MessageProcessor();
    this.sender = new ResponseSender(this.browserService);
    this.lidas = new Set(); // Para rastrear mensagens já processadas
    this.respostasPorUsuario = new Map();
    this.ultimaMensagemPorChat = new Map(); // Novo: para rastrear últimas mensagens por chat
    this.emExecucao = false;
    this._intervalId = null;
  }

  async monitorarMensagens() {
    this.timestampInicio = Date.now(); // salva quando o bot foi ligado
    if (this._intervalId) clearInterval(this._intervalId);
    console.log("🟢 Bot iniciado.");
    this.respostasPorUsuario.clear();
    this.lidas.clear(); // Limpa o rastreamento de mensagens lidas ao iniciar
    this.processor.carregarPromptAtualizado();

    this._intervalId = setInterval(async () => {
      if (this.emExecucao) return;
      this.emExecucao = true;

      const chatsProcessadosNesteCiclo = new Set();

      try {
        this.processor.carregarPromptAtualizado();
        // Handle unread chats only
        const chatsNaoLidos = await this.reader.lerChatsNaoLidos();
        for (const chat of chatsNaoLidos) {
          const chatKey = normalizeChatKey(chat.nome);

          console.log(`🔔 Novo chat com mensagem: ${chat.nome}`);
          const foiAberto = await this.reader.abrirChatPorNome(chat.nome);
          if (!foiAberto) continue;
          await this.browserService.delay(1000); // Ajustado para 1000ms
          // const ultima = await this.reader.getUltimaMensagem();
          // if (!ultima || !ultima.texto) continue;

          const ultima = await this.reader.getUltimaMensagem();
          if (!ultima || !ultima.texto) continue;

          // ⏱️ VERIFICA SE É ANTES DE LIGAR O BOT
          const ehAntiga =
            ultima.timestamp && ultima.timestamp < this.timestampInicio;
          if (ehAntiga) {
            console.log(`⏩ Ignorando mensagem antiga (${ultima.timestamp})`);
            continue;
          }

          //  chatKey = normalizeChatKey(chat.nome);
          const chave = `${chatKey}::${ultima.autor}::${ultima.texto}::${ultima.timestamp}`;

          if (this.lidas.has(chave)) continue;
          this.lidas.add(chave);

          chatsProcessadosNesteCiclo.add(chatKey);

          const resposta = await this.processor.gerarResposta(
            ultima.texto,
            ultima.autor
          );
          if (resposta) {
            const sucesso = await this.sender.responder(ultima, resposta);
            if (sucesso) {
              this._registrarResposta(chatKey);
              console.log(`✅ Resposta enviada para ${chatKey}: "${resposta}"`);
            }
          }
        }
        // Handle currently open chat
        const mensagensAbertas = await this.reader.getMensagensRecentes();
        if (mensagensAbertas.length > 0) {
          // // const ultimaAberta = mensagensAbertas.at(-1);
          // const ultimaAberta = mensagensAbertas.reverse().find((msg) => {
          //   const chatKey = normalizeChatKey(msg.nomeContato);
          //   const chave = `${chatKey}::${msg.autor}::${msg.texto}`;
          //   return (
          //     !this.lidas.has(chave) && msg.timestamp >= this.timestampInicio
          //   );
          const ultimaAberta = [...mensagensAbertas].reverse().find((msg) => {
            if (!msg.nomeContato || !msg.texto || !msg.autor) return false;
            const chatKey = normalizeChatKey(msg.nomeContato);

            const ultimaSalva = this.ultimaMensagemPorChat.get(chatKey);

            const mudou =
              !ultimaSalva ||
              ultimaSalva.texto !== msg.texto ||
              ultimaSalva.timestamp !== msg.timestamp;

            const ehRecente = msg.timestamp >= this.timestampInicio;

            return mudou && ehRecente;
          });

          // });

          if (ultimaAberta) {
            const { nomeContato, timestamp } = ultimaAberta;
            console.log(
              `📥 Verificando mensagem aberta de ${nomeContato} - Timestamp: ${timestamp}, Início bot: ${this.timestampInicio}`
            );
          } else {
            console.log(
              `ℹ️ Nenhuma mensagem recente encontrada no chat aberto.`
            );
          }

          if (
            ultimaAberta &&
            ultimaAberta.nomeContato &&
            ultimaAberta.timestamp &&
            ultimaAberta.timestamp >= this.timestampInicio
          ) {
            const chatKey = normalizeChatKey(ultimaAberta.nomeContato);

            if (chatsProcessadosNesteCiclo.has(chatKey)) {
              return;
            }

            const chave = `${chatKey}::${ultimaAberta.autor}::${ultimaAberta.texto}::${ultimaAberta.timestamp}`;

            if (!this.lidas.has(chave)) {
              this.ultimaMensagemPorChat.set(chatKey, {
                texto: ultimaAberta.texto,
                timestamp: ultimaAberta.timestamp,
              });

              const resposta = await this.processor.gerarResposta(
                ultimaAberta.texto,
                ultimaAberta.autor
              );
              if (resposta) {
                const sucesso = await this.sender.responder(
                  ultimaAberta,
                  resposta
                );
                if (sucesso) {
                  this._registrarResposta(chatKey);
                  console.log(
                    `✅ Resposta enviada para ${chatKey}: "${resposta}"`
                  );
                }
              }
            }
          } else {
            console.log(
              `⏩ Ignorando mensagem antiga (chat aberto): ${ultimaAberta?.timestamp}`
            );
          }
        }
        if (this.respostasPorUsuario.size > 0) {
          const resumo = [...this.respostasPorUsuario.entries()]
            .map(([nome, qtd]) => `${nome} (${qtd})`)
            .join(", ");
          console.log(`📊 Resumo de respostas: ${resumo}`);
        }
      } catch (e) {
        console.error("❌ Erro no ciclo de leitura:", e);
      } finally {
        this.emExecucao = false;
      }
    }, 4000);
  }

  pararMonitoramento() {
    if (this._intervalId) {
      clearInterval(this._intervalId);
      this._intervalId = null;
      console.log("⛔ Bot pausado.");
    }
  }

  _registrarResposta(nome) {
    const atual = this.respostasPorUsuario.get(nome) || 0;
    this.respostasPorUsuario.set(nome, atual + 1);
  }

  getResumoRespostas() {
    return [...this.respostasPorUsuario.entries()].map(
      ([nome, qtd]) => `${nome} (${qtd})`
    );
  }

  limparResumo() {
    this.respostasPorUsuario.clear();
  }
}

module.exports = { Bot };
