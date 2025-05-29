const iconv = require('iconv-lite');

class TeamsClient {
  constructor(page) {
    this.page = page;
    this.nomeDoUsuario = null;
  }

  async delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
  

  isMensagemDoBot(autor) {
    return (
      autor &&
      this.nomeDoUsuario &&
      autor.toLowerCase() === this.nomeDoUsuario.toLowerCase()
    );
  }

  async loginIfNeeded() {
    console.log("Aguardando login manual...");

    try {
      await Promise.race([
        this.page.waitForSelector('#i0116', { timeout: 30000 }),
        this.page.waitForSelector('[role="treeitem"][data-item-type="chat"]', { timeout: 30000 })
      ]);

      await this.delay(5000);
      console.log("Login concluído e interface carregada.");
    } catch (err) {
      console.error("Erro ao aguardar interface do Teams:", err.message);
      throw new Error("Falha no login ou interface não carregada corretamente.");
    }

    await this.delay(5000);
    try {
      const nomeUsuario = await this.page.evaluate(() => {
        const el = document.querySelector('[data-tid="user-display-name"]');
        return el?.innerText.trim() || null;
      });

      this.nomeDoUsuario = nomeUsuario;
      console.log("👤 Nome do usuário logado detectado:", nomeUsuario);
    } catch (err) {
      console.warn("⚠️ Não foi possível detectar o nome do usuário.");
    }
  }

  async getMensagensRecentes(limit = 10) {
    return await this.page.evaluate((limite) => {
      const mensagens = Array.from(document.querySelectorAll('[data-tid="chat-pane-message"]'));
      return mensagens.slice(-limite).map(msg => {
        const texto = msg.querySelector('[id^="content-"]')?.innerText.trim();
        const autor = msg.querySelector('[data-tid="message-author"]')?.innerText.trim();
        return { texto, autor };
      }).filter(m => m.texto && m.autor);
    }, limit);
  }

  // Em TeamsClient.js
  async getMensagensNaoLidas(chatNome, ultimaLida) {
    try {
      const mensagens = await this.page.evaluate(() => {
        const mensagens = Array.from(document.querySelectorAll('[data-tid="chat-pane-message"]'));
        return mensagens.map(msg => {
          const texto = msg.querySelector('[id^="content-"]')?.innerText.trim();
          const autor = msg.querySelector('[data-tid="message-author"]')?.innerText.trim();
          return { texto, autor };
        }).filter(m => m.texto && m.autor);
      });

      const novasMensagens = mensagens.filter(msg =>
        msg.texto.toLowerCase() !== ultimaLida.toLowerCase() &&
        !this.isMensagemDoBot(msg.autor)
      );

      return novasMensagens;
    } catch (error) {
      console.error("❌ Erro ao obter mensagens não lidas:", error.message);
      return [];
    }
  }

  async enviarMensagem(texto) {
    try {
      console.log("⌛ Aguardando campo de mensagem aparecer...");
      const campo = await this.page.waitForSelector('div[id^="new-message-"]', {
        timeout: 10000,
      });

      if (campo) {
        console.log("✅ Campo localizado com seletor: div[id^='new-message-']");
        await this.page.evaluate(el => el.scrollIntoView(), campo);
        await campo.focus();
        await this.delay(500);
        await this.page.keyboard.type(texto, { delay: 30 });
        await this.page.keyboard.press("Enter");

        console.log("✅ Mensagem enviada:", texto);
      } else {
        console.warn("❌ Campo de mensagem não encontrado");
        const debugInfo = await this.page.evaluate(() => {
          return [...document.querySelectorAll('[contenteditable="true"]')].map(el => ({
            text: el.innerText,
            html: el.outerHTML.slice(0, 300) + '...'
          }));
        });
        console.log("🔍 Campos 'contenteditable' encontrados:", debugInfo);
      }
    } catch (error) {
      console.error("❌ Erro ao enviar mensagem:", error.message);
    }
  }

  async buscarChatsNaoLidos() {
    try {
      await this.page.waitForSelector('[role="list"]', { timeout: 10000 });
      const chats = await this.page.evaluate(() => {
        const chatsEncontrados = new Set(); // Usar Set para evitar duplicatas
        document.querySelectorAll('[role="treeitem"]').forEach(element => {
          const temNotificacao = element.querySelector('.notification-badge, .activity-badge, [data-tid="activity-badge-indicator"]');
          const nomeElement = element.querySelector('[id^="title-chat-list-item_"]');
          if (nomeElement) {
            const nome = nomeElement.innerText.trim();
            const style = window.getComputedStyle(nomeElement);
            const temNegrito = style.fontWeight === '700' || style.fontWeight === 'bold';
            if (temNotificacao || temNegrito) {
              chatsEncontrados.add(JSON.stringify({ nome, temNaoLido: true }));
            }
          }
        });
        return Array.from(chatsEncontrados).map(item => JSON.parse(item));
      });

      console.log(formatarLog('INFO', `Chats não lidos encontrados: ${chats.length}`));
      console.log(formatarLog('DEBUG', `Nomes dos chats: ${chats.map(c => c.nome).join(", ")}`));
      return chats;
    } catch (error) {
      console.log(formatarLog('ERROR', `Erro ao buscar chats: ${error.message}`));
      return [];
    }
  }

  async abrirChat(nomeContato) {
    try {
      const sucesso = await this.page.evaluate((nome) => {
        const elementos = Array.from(document.querySelectorAll('[role="treeitem"][data-item-type="chat"]'));
        const alvo = elementos.find(el => {
          const nomeElement = el.querySelector('[id^="title-chat-list-item_"]');
          return nomeElement && nomeElement.innerText.toLowerCase().includes(nome.toLowerCase());
        });
        if (alvo) {
          alvo.click();
          return true;
        }
        return false;
      }, nomeContato);

      if (sucesso) {
        console.log(`✅ Chat aberto: ${nomeContato}`);
        await this.delay(5000);
      } else {
        console.warn(`❌ Chat não encontrado: ${nomeContato}`);
      }

      return sucesso;
    } catch (error) {
      console.error("❌ Erro ao abrir chat:", error.message);
      return false;
    }
  }

  async logChatsRaw() {
    try {
      const chats = await this.page.evaluate(() => {
        return Array.from(document.querySelectorAll('[role="treeitem"][data-item-type="chat"]')).map(el => ({
          nome: el.querySelector('[id^="title-chat-list-item_"]')?.innerText || el.innerText,
          html: el.innerHTML
        }));
      });

      console.log("📋 Lista de chats encontrados:", chats.length);
      chats.forEach(chat => console.log(`- ${chat.nome}`));
      return chats;
    } catch (error) {
      console.error("❌ Erro ao listar chats:", error.message);
      return [];
    }
  }

  async listarTodosOsChatsVisiveis() {
    try {
      await this.page.waitForSelector('[role="treeitem"][data-item-type="chat"]', { timeout: 10000 });
      const nomes = await this.page.evaluate(() => {
        const chats = Array.from(document.querySelectorAll('[role="treeitem"][data-item-type="chat"]'));
        return chats.map(el => {
          const nomeElement = el.querySelector('[id^="title-chat-list-item_"]');
          return nomeElement ? nomeElement.innerText.trim() : null;
        }).filter(Boolean);
      });

      console.log("✅ Chats visíveis detectados:", nomes);
      return nomes;
    } catch (error) {
      console.error("❌ Erro ao listar chats visíveis:", error.message);
      return [];
    }
  }

  async voltarParaListaDeChats() {
    try {
      await this.page.evaluate(() => {
        const listaChats = document.querySelector('[role="list"]');
        if (listaChats) {
          listaChats.click();
          return true;
        }
        return false;
      });
      console.log("✅ Retornou à lista de chats");
      await this.delay(1000);
    } catch (error) {
      console.error("❌ Erro ao retornar à lista de chats:", error.message);
    }
  }
}

module.exports = {
  TeamsClient
};
