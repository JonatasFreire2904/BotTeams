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
        //       const mensagensAbertas = await this.reader.getMensagensRecentes();
        //       if (mensagensAbertas.length > 0) {
        //         // // const ultimaAberta = mensagensAbertas.at(-1);
        //         // const ultimaAberta = mensagensAbertas.reverse().find((msg) => {
        //         //   const chatKey = normalizeChatKey(msg.nomeContato);
        //         //   const chave = `${chatKey}::${msg.autor}::${msg.texto}`;
        //         //   return (
        //         //     !this.lidas.has(chave) && msg.timestamp >= this.timestampInicio
        //         //   );
        //         const ultimaAberta = [...mensagensAbertas].reverse().find((msg) => {
        //           if (!msg.nomeContato || !msg.texto || !msg.autor) return false;
        //           const chatKey = normalizeChatKey(msg.nomeContato);

        //           const ultimaSalva = this.ultimaMensagemPorChat.get(chatKey);
        //           const mudou =
        //             !ultimaSalva || ultimaSalva.timestamp !== msg.timestamp;

        //           const ehRecente = msg.timestamp >= this.timestampInicio;

        //           // 🚨 Aqui permite processar mesmo se o chat já estava aberto
        //           return ehRecente && mudou;
        //         });

        //         // });

        //         if (ultimaAberta) {
        //           const { nomeContato, timestamp } = ultimaAberta;
        //           const chatKey = normalizeChatKey(nomeContato);

        //             // Verifica se já passou 10 segundos desde a última resposta
        // await this.browserService.delay(10000);
        // const mensagensAtualizadas = await this.reader.getMensagensRecentes();
        // const nova = mensagensAtualizadas.at(-1);

        //           this.ultimaMensagemPorChat.set(chatKey, {
        //             texto: ultimaAberta.texto,
        //             timestamp: ultimaAberta.timestamp,
        //           });
        //           console.log(
        //             `📥 Verificando mensagem aberta de ${nomeContato} - Timestamp: ${timestamp}, Início bot: ${this.timestampInicio}`
        //           );
        //         } else {
        //           console.log(
        //             `ℹ️ Nenhuma mensagem recente encontrada no chat aberto.`
        //           );
        //         }

        //         if (
        //           ultimaAberta &&
        //           ultimaAberta.nomeContato &&
        //           ultimaAberta.timestamp &&
        //           ultimaAberta.timestamp >= this.timestampInicio
        //         ) {
        //           const chatKey = normalizeChatKey(ultimaAberta.nomeContato);

        //           if (chatsProcessadosNesteCiclo.has(chatKey)) {
        //             return;
        //           }

        //           const chave = `${chatKey}::${ultimaAberta.autor}::${ultimaAberta.texto}::${ultimaAberta.timestamp}`;

        //           if (!this.lidas.has(chave)) {
        //             this.ultimaMensagemPorChat.set(chatKey, {
        //               texto: ultimaAberta.texto,
        //               timestamp: ultimaAberta.timestamp,
        //             });

        //             const resposta = await this.processor.gerarResposta(
        //               ultimaAberta.texto,
        //               ultimaAberta.autor
        //             );
        //             if (resposta) {
        //               const sucesso = await this.sender.responder(
        //                 ultimaAberta,
        //                 resposta
        //               );
        //               if (sucesso) {
        //                 this._registrarResposta(chatKey);
        //                 console.log(
        //                   `✅ Resposta enviada para ${chatKey}: "${resposta}"`
        //                 );
        //               }
        //             }
        //           }
        //         } else {
        //           console.log(
        //             `⏩ Ignorando mensagem antiga (chat aberto): ${ultimaAberta?.timestamp}`
        //           );
        //         }
        //       }
        //       if (this.respostasPorUsuario.size > 0) {
        //         const resumo = [...this.respostasPorUsuario.entries()]
        //           .map(([nome, qtd]) => `${nome} (${qtd})`)
        //           .join(", ");
        //         console.log(`📊 Resumo de respostas: ${resumo}`);
        //       }

        const mensagensAbertas = await this.reader.getMensagensRecentes();
        if (mensagensAbertas.length > 0) {
          const ultimaAberta = [...mensagensAbertas].reverse().find((msg) => {
            if (!msg.nomeContato || !msg.texto || !msg.autor) return false;
            const chatKey = normalizeChatKey(msg.nomeContato);

            const ultimaSalva = this.ultimaMensagemPorChat.get(chatKey);
            const mudou =
              !ultimaSalva || ultimaSalva.timestamp !== msg.timestamp;

            const ehRecente = msg.timestamp >= this.timestampInicio;

            return ehRecente && mudou;
          });

          if (ultimaAberta) {
            const { nomeContato, timestamp } = ultimaAberta;
            const chatKey = normalizeChatKey(nomeContato);

            // ⏳ Aguarda 10 segundos para dar tempo do Teams carregar
            console.log(
              `⏳ Aguardando 10 segundos para revalidar o chat aberto...`
            );
            await this.browserService.delay(10000);

            // 🔁 Recarrega as mensagens após o delay
            const mensagensAtualizadas =
              await this.reader.getMensagensRecentes();
            const ultimaNova = mensagensAtualizadas.at(-1);

            if (!ultimaNova || !ultimaNova.texto) {
              console.log(
                `⚠️ Nenhuma mensagem nova encontrada após recarregar o chat.`
              );
              return;
            }

            const novoChatKey = normalizeChatKey(ultimaNova.nomeContato);

            // 🟣 Verifica se a última mensagem já foi processada
            const ultimaSalva = this.ultimaMensagemPorChat.get(novoChatKey);
            const mensagemJaProcessada =
              ultimaSalva && ultimaSalva.timestamp === ultimaNova.timestamp;

            if (mensagemJaProcessada) {
              console.log(
                `⏩ Última mensagem já foi processada em ${novoChatKey}. Ignorando.`
              );
              return;
            }

            const ehDoBot = ultimaNova.autor.toLowerCase().includes("você");
            if (ehDoBot) {
              console.log(
                `✅ Última mensagem no chat aberto já é do bot. Nada a fazer.`
              );
              return; // Não responde se a última já foi o bot
            }

            // 🔥 Verifica se essa nova mensagem já foi processada
            const chave = `${chatKey}::${ultimaNova.autor}::${ultimaNova.texto}::${ultimaNova.timestamp}`;
            if (this.lidas.has(chave)) {
              console.log(
                `ℹ️ Mensagem já processada no chat aberto. Ignorando.`
              );
              return;
            }

            // 🧠 Gera resposta para a mensagem nova
            console.log(
              `📥 Última mensagem no chat aberto é do usuário. Respondendo...`
            );
            const resposta = await this.processor.gerarResposta(
              ultimaNova.texto,
              ultimaNova.autor
            );

            if (resposta) {
              const sucesso = await this.sender.responder(ultimaNova, resposta);
              if (sucesso) {
                this.lidas.add(chave);
                this._registrarResposta(chatKey);
                this.ultimaMensagemPorChat.set(chatKey, {
                  texto: ultimaNova.texto,
                  timestamp: ultimaNova.timestamp,
                });
                console.log(
                  `✅ Resposta enviada para ${chatKey}: "${resposta}"`
                );
              }
            }
          } else {
            console.log(
              `ℹ️ Nenhuma mensagem recente encontrada no chat aberto.`
            );
          }
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
