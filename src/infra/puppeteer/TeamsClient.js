class TeamsClient {
  constructor(page) {
    this.page = page;
    this.nomeDoUsuario = null;
  }

  async delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  isMensagemDoBot(autor) {
    const ehBot =
      autor &&
      this.nomeDoUsuario &&
      autor.toLowerCase() === this.nomeDoUsuario.toLowerCase();

    console.log("🔍 Verificando se é do bot:");
    console.log("   → Autor da mensagem:", autor);
    console.log("   → Nome do bot (logado):", this.nomeDoUsuario);
    console.log("   → Resultado:", ehBot ? "✅ É do bot" : "❌ Não é do bot");

    return ehBot;
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

  async getUltimaMensagem() {
    return await this.page.evaluate(() => {
      const mensagens = Array.from(document.querySelectorAll('[data-tid="chat-pane-message"]'));
      if (!mensagens.length) return null;

      const ultimaMsg = mensagens.reverse().find(msg => msg.getAttribute("data-last-visible") === "true");
      if (!ultimaMsg) return null;

      const conteudo = ultimaMsg.querySelector('[id^="content-"]');
      const texto = conteudo?.innerText.trim() || null;

      const autor = ultimaMsg.querySelector('[data-tid="message-author"]')?.innerText.trim();

      return {
        texto,
        autor
      };
    });
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
        const chatsEncontrados = [];
        document.querySelectorAll('[role="treeitem"]').forEach(element => {
          const temNotificacao = element.querySelector('.notification-badge, .activity-badge, [data-tid="activity-badge-indicator"]');
          const nomeElement = element.querySelector('[id^="title-chat-list-item_"]');
          if (nomeElement) {
            const nome = nomeElement.innerText.trim();
            const style = window.getComputedStyle(nomeElement);
            const temNegrito = style.fontWeight === '700' || style.fontWeight === 'bold';
            if (temNotificacao || temNegrito) {
              chatsEncontrados.push({ nome, temNaoLido: true });
            }
          }
        });
        return chatsEncontrados;
      });

      console.log("✅ Chats não lidos encontrados:", chats.length);
      console.log(chats.map(c => c.nome));
      return chats;
    } catch (error) {
      console.error("❌ Erro ao buscar chats:", error.message);
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
}

module.exports = {
  TeamsClient
};