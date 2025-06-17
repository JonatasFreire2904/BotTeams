class MessageReader {
  constructor(browserService) {
    this.browser = browserService;
    this.browserService = browserService;
  }

  // async lerChatsNaoLidos() {
  //   const page = await this.browser.getPagina();
  //   return await page.evaluate(() => {
  //     const chats = [];
  //     const itens = document.querySelectorAll('[role="treeitem"][data-item-type="chat"]');

  //     itens.forEach(el => {
  //       const nomeEl = el.querySelector('[id^="title-chat-list-item_"]');
  //       if (!nomeEl) return;

  //       const nome = nomeEl.innerText?.trim();
  //       const style = window.getComputedStyle(nomeEl);
  //       const fontWeight = parseInt(style.fontWeight, 10);
  //       const emNegrito = fontWeight >= 600;

  //       if (emNegrito && nome) {
  //         chats.push({ nome });
  //       }
  //     });
  //     return chats;
  //   });
  // }
  async lerChatsNaoLidos() {
    const page = await this.browser.getPagina();
    return await page.evaluate(() => {
      const chats = [];
      const itens = document.querySelectorAll('[role="treeitem"][data-item-type="chat"]');

      itens.forEach(el => {
        const nomeEl = el.querySelector('[id^="title-chat-list-item_"]');
        if (!nomeEl) return;

        const nome = nomeEl?.textContent?.trim();
        if (!nome) return;

        // Verifica se o nome está em negrito
        const style = window.getComputedStyle(nomeEl);
        const fontWeight = parseInt(style.fontWeight, 10);
        const emNegrito = fontWeight >= 600;

        if (emNegrito) {
          chats.push({ nome });
        }
      });

      return chats;
    });
  }
  
  // async abrirChatPorNome(nome) {
  //   const page = await this.browser.getPagina();

  //   const chatFoiAberto = await page.evaluate(async (nomeAlvo) => {
  //     const chats = Array.from(document.querySelectorAll('li[role="treeitem"][data-item-type="chat"]'));

  //     for (const chat of chats) {
  //       const tituloEl = chat.querySelector('[id^="title-chat-list-item_"]');
  //       const titulo = tituloEl?.textContent?.trim();
  //       if (!titulo) continue;

  //       if (titulo.toLowerCase().includes(nomeAlvo.toLowerCase())) {
  //         tituloEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
  //         chat.click();
  //         return true;
  //       }
  //     }

  //     return false;
  //   }, nome);

  //   if (!chatFoiAberto) {
  //     console.warn(`⚠️ Não foi possível encontrar o chat com nome "${nome}"`);
  //   } else {
  //     console.log(`🖱️ Chat "${nome}" foi clicado com sucesso`);
  //   }

  //   // Aqui estava o erro — sem this.browserService definido
  //   await this.browserService.delay(4000);
  // }
  async abrirChatPorNome(nomeAlvo) {
    const page = await this.browser.getPagina();

    const chatFoiAberto = await page.evaluate((nomeAlvo) => {
      const normalizar = str => str.toLowerCase()
        .normalize('NFD')
        .replace(/\s+/g, ' ')
        .replace(/[\u0300-\u036f]/g, '');

      const alvo = normalizar(nomeAlvo);
      const chats = Array.from(document.querySelectorAll('[role="treeitem"][data-item-type="chat"]'));

      for (const chat of chats) {
        const tituloEl = chat.querySelector('[id^="title-chat-list-item_"]');
        if (!tituloEl) continue;

        const titulo = tituloEl.innerText?.trim();
        if (titulo && normalizar(titulo).includes(alvo)) {
          tituloEl.scrollIntoView({ behavior: 'instant', block: 'center' });
          tituloEl.click();
          return true;
        }
      }
      return false;
    }, nomeAlvo);

    if (!chatFoiAberto) {
      console.warn(`⚠️ Não foi possível encontrar o chat com nome "${nomeAlvo}"`);
    } else {
      console.log(`🖱️ Chat "${nomeAlvo}" foi clicado com sucesso`);
    }

    await this.browserService.delay(4000);

    return chatFoiAberto; // ✅ ESSENCIAL!
  }

  async getUltimaMensagem() {
    const page = await this.browser.getPagina();

    // Tenta detectar o nome do contato atualmente aberto
    const nomeContato = await page.evaluate(() => {
      const selecionado = document.querySelector('li[role="treeitem"][data-item-type="chat"][aria-selected="true"]');
      if (!selecionado) return null;
      const nomeElement = selecionado.querySelector('[id^="title-chat-list-item_"]');
      return nomeElement?.innerText.trim() || null;
    });

    const mensagem = await page.evaluate(() => {
      const mensagens = Array.from(document.querySelectorAll('[data-tid="chat-pane-message"]')).reverse();

      for (const msg of mensagens) {
        const ehDoBot = msg.closest('.fui-ChatMyMessage');
        if (ehDoBot) continue;

        const texto = msg.querySelector('[id^="content-"]')?.innerText?.trim();
        if (!texto) continue;

        const autor = msg.querySelector('[data-tid="message-author"]')?.innerText?.trim() || "CLIENTE";
        return { texto, autor };
      }

      return null;
    });

    return mensagem ? { ...mensagem, nomeContato } : null;
  }


  async lerMensagens() {
    const page = await this.browser.getPagina();
    return await page.evaluate(() => {
      const mensagens = [];
      const elementos = document.querySelectorAll(".message-body-content");

      elementos.forEach(el => {
        const texto = el.innerText.trim();
        const mensagemPai = el.closest(".message");
        const autorEl = mensagemPai?.querySelector(".sender-name");

        const ehMinhaMensagem = mensagemPai?.querySelector('.fui-ChatMyMessage__author') !== null;
        const autor = autorEl ? autorEl.innerText.trim() : (ehMinhaMensagem ? "Eu" : "Desconhecido");

        if (texto && !ehMinhaMensagem) {
          mensagens.push({ autor, texto });
        }
      });

      return mensagens;
    });
  }

}

module.exports = MessageReader;


