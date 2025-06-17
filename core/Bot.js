const BrowserService = require("../services/BrowserService");
const MessageReader = require("../modules/MessageReader");
const MessageProcessor = require("../modules/MessageProcessor");
const ResponseSender = require("../modules/ResponseSender");

class Bot {
  constructor() {
    this.browserService = new BrowserService();
    this.reader = new MessageReader(this.browserService);
    this.processor = new MessageProcessor();
    this.sender = new ResponseSender(this.browserService);
    this.lidas = new Set();
    this.respostasPorUsuario = new Map();
    this.emExecucao = false;
    this._intervalId = null;
  }

  async monitorarMensagens() {
    if (this._intervalId) clearInterval(this._intervalId); // limpa se já estiver rodando

    console.log("🟢 Bot iniciado.");

    this.respostasPorUsuario.clear();

    this._intervalId = setInterval(async () => {
      if (this.emExecucao) return;
      this.emExecucao = true;

      try {
        const chatsComNovas = await this.reader.lerChatsNaoLidos();
        for (const chat of chatsComNovas) {
          console.log(`🔔 Novo chat com mensagem: ${chat.nome}`);

          const foiAberto = await this.reader.abrirChatPorNome(chat.nome);
          if (!foiAberto) continue;

          await this.browserService.delay(3000);
          const ultima = await this.reader.getUltimaMensagem();
          if (!ultima || !ultima.texto) continue;

          const chave = `${chat.nome}::${ultima.autor}::${ultima.texto}`;
          if (this.lidas.has(chave)) continue;
          this.lidas.add(chave);

          const resposta = await this.processor.gerarResposta(
            ultima.texto,
            ultima.autor
          );
          if (resposta) {
            const sucesso = await this.sender.responder(ultima, resposta);
            if (sucesso) {
              console.log(
                `✅ Resposta enviada para ${chat.nome}: "${resposta}"`
              );
              this._registrarResposta(chat.nome);
            } else {
              console.warn(`⚠️ Falha ao responder para ${chat.nome}`);
            }
          } else {
            console.log(`⚠️ Nenhuma resposta gerada para: ${ultima.texto}`);
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
