// const fs = require("fs");
// const path = require("path");
// const axios = require("axios");

// class LLMService {
//   constructor() {
//     this.apiUrl = "http://192.168.15.14:1234/v1/chat/completions"; // ✅ LM Studio endpoint
//     this.model = "local-model"; // ⚠️ Nome genérico exigido pela API
//     this.promptSistema = this._carregarPrompt();
//   }

//   _carregarPrompt() {
//     try {
//       const promptPath = path.join(__dirname, "../prompt.txt");
//       const texto = fs.readFileSync(promptPath, "utf8").trim();
//       console.log("📄 Prompt carregado com sucesso.");
//       return texto;
//     } catch (err) {
//       console.error("❌ Erro ao carregar prompt.txt:", err);
//       return "Você é um assistente simples e objetivo.";
//     }
//   }

//   carregarPromptAtualizado() {
//     this.promptSistema = this._carregarPrompt();
//   }

//   async gerarResposta(mensagemUsuario) {
//     const payload = {
//       model: this.model,
//       messages: [
//         { role: "system", content: this.promptSistema },
//         { role: "user", content: mensagemUsuario }
//       ],
//       temperature: 0.3,
//       top_p: 0.95,
//       max_tokens: 100,
//       stream: false
//     };

//     try {
//       const { data } = await axios.post(this.apiUrl, payload, {
//         headers: { "Content-Type": "application/json" },
//         timeout: 20_000
//       });

//       const resposta = data?.choices?.[0]?.message?.content?.trim();
//       if (!resposta) {
//         console.warn("⚠️ LLM retornou resposta vazia.");
//         return null;
//       }

//       return resposta;
//     } catch (error) {
//       console.error("❌ Erro ao chamar LLM:", error.message);
//       return null;
//     }
//   }
// }

// module.exports = LLMService;

const fs = require("fs");
const path = require("path");
const axios = require("axios");

class LLMService {
  constructor() {
    this.model = "local-model";
    this.promptSistema = this._carregarPrompt();
    this.apiUrl = this._carregarURL();
  }

  _carregarPrompt() {
    try {
      const promptPath = path.join(__dirname, "../prompt.txt");
      const texto = fs.readFileSync(promptPath, "utf8").trim();
      console.log("📄 Prompt carregado com sucesso.");
      return texto;
    } catch (err) {
      console.error("❌ Erro ao carregar prompt.txt:", err);
      return "Você é um assistente simples e objetivo.";
    }
  }

  _carregarURL() {
    try {
      const configPath = path.join(__dirname, "../llm_config.json");
      const { host } = JSON.parse(fs.readFileSync(configPath, "utf8"));
      if (!host) throw new Error("Campo 'host' vazio.");
      const url = `http://${host}:1234/v1/chat/completions`;
      console.log("🌐 URL carregada:", url);
      return url;
    } catch (e) {
      console.error("❌ Erro ao carregar IP do arquivo llm_config.json:", e.message);
      return "http://127.0.0.1:1234/v1/chat/completions"; // fallback local
    }
  }

  carregarPromptAtualizado() {
    this.promptSistema = this._carregarPrompt();
  }

  async gerarResposta(mensagemUsuario) {
    const payload = {
      model: this.model,
      messages: [
        { role: "system", content: this.promptSistema },
        { role: "user", content: mensagemUsuario }
      ],
      temperature: 0.3,
      top_p: 0.95,
      max_tokens: 100,
      stream: false
    };

    try {
      const { data } = await axios.post(this.apiUrl, payload, {
        headers: { "Content-Type": "application/json" },
        timeout: 20_000
      });

      const resposta = data?.choices?.[0]?.message?.content?.trim();
      if (!resposta) {
        console.warn("⚠️ LLM retornou resposta vazia.");
        return null;
      }

      return resposta;
    } catch (error) {
      console.error("❌ Erro ao chamar LLM:", error.message);
      return null;
    }
  }
}

module.exports = LLMService;
