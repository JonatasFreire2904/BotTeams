const BrowserService = require("../services/BrowserService");
const MessageReader = require("../modules/MessageReader");
const MessageProcessor = require("../modules/MessageProcessor");
const ResponseSender = require("../modules/ResponseSender");

function normalizeChatKey(nome) {
  return nome.toLowerCase().replace(/\s+/g, ' ').replace(/\(externo\)/g, '').replace(/\| microsoft teams.*/i, '').trim();
}

class Bot {
  constructor() {
    this.browserService = new BrowserService();
    this.reader = new MessageReader(this.browserService);
    this.processor = new MessageProcessor();
    this.sender = new ResponseSender(this.browserService);
    this.lidas = new Set(); // Para rastrear mensagens já processadas
    this.respostasPorUsuario = new Map();
    this.emExecucao = false;
    this._intervalId = null;
  }

  async monitorarMensagens() {
    if (this._intervalId) clearInterval(this._intervalId);
    console.log("🟢 Bot iniciado.");
    this.respostasPorUsuario.clear();
    this.lidas.clear(); // Limpa o rastreamento de mensagens lidas ao iniciar
    this.processor.carregarPromptAtualizado();

    this._intervalId = setInterval(async () => {
      if (this.emExecucao) return;
      this.emExecucao = true;

      try {
        this.processor.carregarPromptAtualizado();
        // Handle unread chats only
        const chatsNaoLidos = await this.reader.lerChatsNaoLidos();
        for (const chat of chatsNaoLidos) {
          console.log(`🔔 Novo chat com mensagem: ${chat.nome}`);
          const foiAberto = await this.reader.abrirChatPorNome(chat.nome);
          if (!foiAberto) continue;
          await this.browserService.delay(1000); // Ajustado para 1000ms
          const ultima = await this.reader.getUltimaMensagem();
          if (!ultima || !ultima.texto) continue;

          const chatKey = normalizeChatKey(chat.nome);
          const chave = `${chatKey}::${ultima.autor}::${ultima.texto}`;
          if (this.lidas.has(chave)) continue;
          this.lidas.add(chave);

          const resposta = await this.processor.gerarResposta(ultima.texto, ultima.autor);
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
          const ultimaAberta = mensagensAbertas.at(-1);
          if (ultimaAberta && ultimaAberta.nomeContato) {
            const chatKey = normalizeChatKey(ultimaAberta.nomeContato);
            const chave = `${chatKey}::${ultimaAberta.autor}::${ultimaAberta.texto}`;
            if (!this.lidas.has(chave)) { // Verifica se já foi lida
              this.lidas.add(chave);
              const resposta = await this.processor.gerarResposta(ultimaAberta.texto, ultimaAberta.autor);
              if (resposta) {
                const sucesso = await this.sender.responder(ultimaAberta, resposta);
                if (sucesso) {
                  this._registrarResposta(chatKey);
                  console.log(`✅ Resposta enviada para ${chatKey}: "${resposta}"`);
                }
              }
            }
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