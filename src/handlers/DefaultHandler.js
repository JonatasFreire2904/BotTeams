// // src/handlers/DefaultHandler.js

// class DefaultHandler {
//   constructor() {
//     this.regras = [
//       {
//         condicao: (msg) => msg.toLowerCase().includes("oi"),
//         resposta: (nome) => {
//           const nomeSanitizado = nome ? nome.split(" ")[0] : null;
//           return nomeSanitizado ? `Olá ${nomeSanitizado}! Em que posso ajudar?` : "Olá! Em que posso ajudar?";
//         }
//       },
//       {
//         condicao: (msg) => msg.toLowerCase().includes("obrigado"),
//         resposta: (nome) => {
//           const nomeSanitizado = nome ? nome.split(" ")[0] : null;
//           return nomeSanitizado ? `De nada, ${nomeSanitizado}! Qualquer coisa estou por aqui.` : "De nada! Qualquer coisa estou por aqui.";
//         }
//       }
//     ];
//   }

//   processar(mensagem, nome) {
//     for (let regra of this.regras) {
//       if (regra.condicao(mensagem)) {
//         return regra.resposta(nome);
//       }
//     }

//     return null; 
//   }
// }

// module.exports = {
//   DefaultHandler
// };
class DefaultHandler {
  constructor() {
    this.respostas = new Map([
      ["oi", "Olá! Em que posso ajudar?"],
      ["preciso de ajuda", "Claro, estou aqui para ajudar! Qual é o seu problema?"],
      ["estou confuso", "Desculpe pela confusão! Posso explicar melhor. Sobre o que você está confuso?"],
      ["obrigado", "De nada! Estou aqui se precisar de mais ajuda."]
    ]);
  }

  processar(mensagem, contato) {
    const mensagemLower = mensagem.toLowerCase().trim();
    console.log(`[${contato}] Processando mensagem: "${mensagemLower}"`);

    // Verificar se a mensagem tem uma resposta mapeada
    for (let [chave, resposta] of this.respostas) {
      if (mensagemLower.includes(chave)) {
        console.log(`[${contato}] Encontrada correspondência: "${chave}" -> "${resposta}"`);
        return resposta;
      }
    }

    // Não retornar resposta genérica, deixar como pendência
    console.log(`[${contato}] Nenhuma correspondência encontrada. Deixando como pendência.`);
    return undefined;
  }
}

module.exports = {
  DefaultHandler
};