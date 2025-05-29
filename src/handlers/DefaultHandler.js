// src/handlers/DefaultHandler.js

class DefaultHandler {
  constructor() {
    this.regras = [
      {
        condicao: (msg) => msg.toLowerCase().includes("oi"),
        resposta: (nome) => {
          const nomeSanitizado = nome ? nome.split(" ")[0] : null;
          return nomeSanitizado ? `Olá ${nomeSanitizado}! Em que posso ajudar?` : "Olá! Em que posso ajudar?";
        }
      },
      {
        condicao: (msg) => msg.toLowerCase().includes("obrigado"),
        resposta: (nome) => {
          const nomeSanitizado = nome ? nome.split(" ")[0] : null;
          return nomeSanitizado ? `De nada, ${nomeSanitizado}! Qualquer coisa estou por aqui.` : "De nada! Qualquer coisa estou por aqui.";
        }
      }
    ];
  }

  processar(mensagem, nome) {
    for (let regra of this.regras) {
      if (regra.condicao(mensagem)) {
        return regra.resposta(nome);
      }
    }

    return null; 
  }
}

module.exports = {
  DefaultHandler
};