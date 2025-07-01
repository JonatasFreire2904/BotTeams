const LLMService = require("../services/LLMService");

class MessageProcessor {
  constructor() {
    this.llmService = new LLMService();
  }

  carregarPromptAtualizado() {
    this.llmService.carregarPromptAtualizado();
  }

  async gerarResposta(mensagem, autor) {
    try {
      console.log(`🧠 Gerando resposta com LLM para: "${mensagem}"`);
      const bruta = await this.llmService.gerarResposta(mensagem);
      if (!bruta) return null;

      // Remove prefixos como "LM:", "IA:", "Resposta:"
      const resposta = bruta.replace(/^(LM|IA|BOT|Resposta)[:：]?\s*/i, '').trim();

      // Validação contra regras do prompt
      if (
        resposta.split(/\s+/).length > 10 || // mais de 10 palavras
        /(?:IA|modelo|inteligência artificial|sou uma IA|sou um modelo|assistente|language model)/i.test(resposta)
      ) {
        console.warn(`⛔ Resposta inválida detectada e bloqueada: "${resposta}"`);
        return null;
      }

      return resposta;
    } catch (err) {
      console.error("❌ Erro ao processar mensagem com LLM:", err);
      return null;
    }
  }
}

module.exports = MessageProcessor;
