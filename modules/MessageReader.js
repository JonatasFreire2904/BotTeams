class MessageReader {
  constructor(browserService) {
    this.browser = browserService;
    this.browserService = browserService;
  }

  async lerChatsNaoLidos() {
    const page = await this.browser.getPagina();
    return await page.evaluate(() => {
      const chats = [];
      const itens = document.querySelectorAll(
        '[role="treeitem"][data-item-type="chat"]'
      );

      itens.forEach((el) => {
        const nomeEl = el.querySelector('[id^="title-chat-list-item_"]');
        if (!nomeEl) return;

        const nome = nomeEl?.textContent?.trim();
        if (!nome) return;

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

  // async getUltimaMensagem() {
  //   const page = await this.browser.getPagina();

  //   const nomeContato = await page.evaluate(() => {
  //     const selecionado = document.querySelector(
  //       'li[role="treeitem"][data-item-type="chat"][aria-selected="true"]'
  //     );
  //     if (!selecionado) return null;
  //     const nomeElement = selecionado.querySelector(
  //       '[id^="title-chat-list-item_"]'
  //     );
  //     return nomeElement?.innerText.trim() || null;
  //   });

  //   const mensagem = await page.evaluate(() => {
  //     const mensagens = Array.from(
  //       document.querySelectorAll('[data-tid="chat-pane-message"]')
  //     ).reverse();
  //     for (const msg of mensagens) {
  //       const ehDoBot = msg.closest(".fui-ChatMyMessage");
  //       if (ehDoBot) continue;

  //       const texto = msg.querySelector('[id^="content-"]')?.innerText?.trim();
  //       if (!texto) continue;

  //       const autor =
  //         msg.querySelector('[data-tid="message-author"]')?.innerText?.trim() ||
  //         "CLIENTE";
  //       const hora =
  //         msg
  //           .querySelector('[data-tid="message-timestamp"]')
  //           ?.getAttribute("aria-label") || null;

  //       return { texto, autor, hora };
  //     }
  //     if (mensagem) {
  //       const timestamp = converterTextoHoraParaTimestamp(mensagem.hora);
  //       return { ...mensagem, nomeContato, timestamp };
  //     }
  //   });

  //   return mensagem ? { ...mensagem, nomeContato } : null;
  // }

  async getUltimaMensagem() {
    const page = await this.browser.getPagina();

    // 1. Obtém nome do contato fora do contexto do navegador
    const nomeContato = await page.evaluate(() => {
      const selecionado = document.querySelector(
        'li[role="treeitem"][data-item-type="chat"][aria-selected="true"]'
      );
      if (!selecionado) return null;
      const nomeElement = selecionado.querySelector(
        '[id^="title-chat-list-item_"]'
      );
      return nomeElement?.innerText.trim() || null;
    });

    // 2. Coleta os dados da última mensagem (sem timestamp ainda)
    const mensagem = await page.evaluate(() => {
      const mensagens = Array.from(
        document.querySelectorAll('[data-tid="chat-pane-message"]')
      ).reverse();
      for (const msg of mensagens) {
        const ehDoBot = msg.closest(".fui-ChatMyMessage");
        if (ehDoBot) continue;

        const texto = msg.querySelector('[id^="content-"]')?.innerText?.trim();
        if (!texto) continue;

        const autor =
          msg.querySelector('[data-tid="message-author"]')?.innerText?.trim() ||
          "CLIENTE";
        const hora = msg
          .querySelector('[data-tid="message-timestamp"]')
          ?.getAttribute("aria-label")
          ?.trim();

        return { texto, autor, hora };
      }
      return null;
    });

    if (!mensagem) return null;

    // 3. Agora sim: calcula o timestamp no Node.js (fora do browser)
    const timestamp = this.converterTextoHoraParaTimestamp(mensagem.hora);

    return { ...mensagem, nomeContato, timestamp };
  }

  async abrirChatPorNome(nomeAlvo) {
    const page = await this.browser.getPagina();

    const chatFoiAberto = await page.evaluate((nomeAlvo) => {
      const normalizar = (str) =>
        str
          .toLowerCase()
          .normalize("NFD")
          .replace(/\s+/g, " ")
          .replace(/[\u0300-\u036f]/g, "");

      const alvo = normalizar(nomeAlvo);
      const chats = Array.from(
        document.querySelectorAll('[role="treeitem"][data-item-type="chat"]')
      );

      for (const chat of chats) {
        const tituloEl = chat.querySelector('[id^="title-chat-list-item_"]');
        if (!tituloEl) continue;

        const titulo = tituloEl.innerText?.trim();
        if (titulo && normalizar(titulo).includes(alvo)) {
          tituloEl.scrollIntoView({ behavior: "instant", block: "center" });
          tituloEl.click();
          return true;
        }
      }
      return false;
    }, nomeAlvo);

    if (!chatFoiAberto) {
      console.warn(
        `⚠️ Não foi possível encontrar o chat com nome "${nomeAlvo}"`
      );
    } else {
      console.log(`🖱️ Chat "${nomeAlvo}" foi clicado com sucesso`);
    }

    await this.browserService.delay(4000);
    return chatFoiAberto;
  }

  async getMensagensRecentes(max = 2000) {
    const page = await this.browser.getPagina();

    // Captura o nome do contato ANTES de entrar no page.evaluate
    const nomeContato = await page.evaluate(() => {
      const selecionado = document.querySelector(
        'li[role="treeitem"][data-item-type="chat"][aria-selected="true"]'
      );
      if (!selecionado) return null;
      const nomeElement = selecionado.querySelector(
        '[id^="title-chat-list-item_"]'
      );
      return nomeElement?.innerText.trim() || null;
    });

    return await page.evaluate(
      (max, nomeContato) => {
        function parseTimestamp(timeStr, dateStr) {
          let date = new Date();
          const today = new Date();
          const yesterday = new Date();
          yesterday.setDate(today.getDate() - 1);

          if (dateStr) {
            const lower = dateStr.toLowerCase();
            if (lower.includes("ontem")) date = yesterday;
            else if (!lower.includes("hoje")) {
              const parsed = new Date(dateStr);
              if (!isNaN(parsed)) date = parsed;
            }
          }

          if (timeStr) {
            const match = timeStr.match(/(\d{1,2}):(\d{2})/);
            if (match) {
              const h = parseInt(match[1], 10);
              const m = parseInt(match[2], 10);
              date.setHours(h, m, 0, 0);
            }
          }

          return date.getTime();
        }

        const mensagens = [];
        const elementos = Array.from(
          document.querySelectorAll(
            '[data-tid="chat-pane-message"], [data-tid="message-group"]'
          )
        ).reverse();

        let currentDateStr = null;

        for (const el of elementos) {
          if (el.matches('[data-tid="message-group"]')) {
            currentDateStr = el
              .querySelector('[data-tid="message-group-header"]')
              ?.innerText?.trim();
          }

          if (el.matches('[data-tid="chat-pane-message"]')) {
            const ehDoBot = el.closest(".fui-ChatMyMessage");
            if (ehDoBot) continue;

            const texto = el
              .querySelector('[id^="content-"]')
              ?.innerText?.trim();
            if (!texto) continue;

            const autor =
              el
                .querySelector('[data-tid="message-author"]')
                ?.innerText?.trim() || "CLIENTE";
            const horaStr =
              el
                .querySelector('[data-tid="message-timestamp"]')
                ?.getAttribute("aria-label") || null;
            const timestamp = parseTimestamp(horaStr, currentDateStr);

            mensagens.push({
              texto,
              autor,
              nomeContato,
              hora: horaStr,
              timestamp,
            });

            if (mensagens.length >= max) break;
          }
        }

        return mensagens.reverse();
      },
      max,
      nomeContato
    );
  }

  async lerTodosChats() {
    const page = await this.browser.getPagina();
    return await page.evaluate(() => {
      const chats = [];
      const itens = document.querySelectorAll(
        '[role="treeitem"][data-item-type="chat"]'
      );
      itens.forEach((el) => {
        const nomeEl = el.querySelector('[id^="title-chat-list-item_"]');
        if (!nomeEl) return;
        const nome = nomeEl?.textContent?.trim();
        if (nome) chats.push({ nome });
      });
      return chats;
    });
  }

  converterTextoHoraParaTimestamp(textoHora) {
    if (!textoHora) return 0;

    const agora = new Date();
    const texto = textoHora
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, ""); // remove acentos, ex: "às" → "as"

    const matchHora = texto.match(/(\d{1,2}):(\d{2})/);
    if (!matchHora) return 0;

    const h = parseInt(matchHora[1], 10);
    const m = parseInt(matchHora[2], 10);

    let data = new Date(
      agora.getFullYear(),
      agora.getMonth(),
      agora.getDate(),
      h,
      m,
      0
    );

    if (texto.includes("ontem")) {
      data.setDate(data.getDate() - 1);
    } else if (!texto.includes("hoje") && texto.includes("as")) {
      // Ignora mensagens antigas com data explícita (ex: "sexta-feira às 14:00")
      return 0;
    }

    return data.getTime();
  }
}

module.exports = MessageReader;
