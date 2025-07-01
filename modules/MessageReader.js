// class MessageReader {
//   constructor(browserService) {
//     this.browser = browserService;
//     this.browserService = browserService;
//   }

//   async lerChatsNaoLidos() {
//     const page = await this.browser.getPagina();
//     return await page.evaluate(() => {
//       const chats = [];
//       const itens = document.querySelectorAll(
//         '[role="treeitem"][data-item-type="chat"]'
//       );

//       itens.forEach((el) => {
//         const nomeEl = el.querySelector('[id^="title-chat-list-item_"]');
//         if (!nomeEl) return;

//         const nome = nomeEl?.textContent?.trim();
//         if (!nome) return;

//         const style = window.getComputedStyle(nomeEl);
//         const fontWeight = parseInt(style.fontWeight, 10);
//         const emNegrito = fontWeight >= 600;

//         if (emNegrito) {
//           chats.push({ nome });
//         }
//       });

//       return chats;
//     });
//   }

//   async getUltimaMensagem() {
//     const page = await this.browser.getPagina();

//     const nomeContato = await page.evaluate(() => {
//       const selecionado = document.querySelector(
//         'li[role="treeitem"][data-item-type="chat"][aria-selected="true"]'
//       );
//       if (!selecionado) return null;
//       const nomeElement = selecionado.querySelector(
//         '[id^="title-chat-list-item_"]'
//       );
//       return nomeElement?.innerText.trim() || null;
//     });

//     const mensagem = await page.evaluate(() => {
//       const mensagens = Array.from(
//         document.querySelectorAll('[data-tid="chat-pane-message"]')
//       ).reverse();
//       for (const msg of mensagens) {
//         const ehDoBot = msg.closest(".fui-ChatMyMessage");
//         if (ehDoBot) continue;

//         const texto = msg.querySelector('[id^="content-"]')?.innerText?.trim();
//         if (!texto) continue;

//         const autor =
//           msg.querySelector('[data-tid="message-author"]')?.innerText?.trim() ||
//           "CLIENTE";
//         const hora =
//           msg
//             .querySelector('[data-tid="message-timestamp"]')
//             ?.getAttribute("aria-label") || null;

//         return { texto, autor, hora };
//       }
//       return null;
//     });

//     return mensagem ? { ...mensagem, nomeContato } : null;
//   }

//   async abrirChatPorNome(nomeAlvo) {
//     const page = await this.browser.getPagina();

//     const chatFoiAberto = await page.evaluate((nomeAlvo) => {
//       const normalizar = (str) =>
//         str
//           .toLowerCase()
//           .normalize("NFD")
//           .replace(/\s+/g, " ")
//           .replace(/[\u0300-\u036f]/g, "");

//       const alvo = normalizar(nomeAlvo);
//       const chats = Array.from(
//         document.querySelectorAll('[role="treeitem"][data-item-type="chat"]')
//       );

//       for (const chat of chats) {
//         const tituloEl = chat.querySelector('[id^="title-chat-list-item_"]');
//         if (!tituloEl) continue;

//         const titulo = tituloEl.innerText?.trim();
//         if (titulo && normalizar(titulo).includes(alvo)) {
//           tituloEl.scrollIntoView({ behavior: "instant", block: "center" });
//           tituloEl.click();
//           return true;
//         }
//       }
//       return false;
//     }, nomeAlvo);

//     if (!chatFoiAberto) {
//       console.warn(
//         `⚠️ Não foi possível encontrar o chat com nome "${nomeAlvo}"`
//       );
//     } else {
//       console.log(`🖱️ Chat "${nomeAlvo}" foi clicado com sucesso`);
//     }

//     await this.browserService.delay(4000);
//     return chatFoiAberto;
//   }

//   async getMensagensRecentes(max = 2000) {
//     const page = await this.browser.getPagina();
//     return await page.evaluate((max) => {
//       // Função auxiliar para converter a string de hora para um timestamp mais robusto
//       // Inclui a data da mensagem se disponível, caso contrário, usa a data atual
//       function parseTimestamp(timeStr, dateStr) {
//         let date = new Date();
//         if (dateStr) {
//           // Tenta parsear a data se ela for fornecida (ex: 

//           const today = new Date();
//           const yesterday = new Date();
//           yesterday.setDate(today.getDate() - 1);

//           if (dateStr.toLowerCase().includes("ontem")) {
//             date = yesterday;
//           } else if (!dateStr.toLowerCase().includes("hoje")) {
//             // Se não for nem "hoje" nem "ontem", tenta parsear a data
//             // Isso pode ser estendido para outros formatos de data
//             const parsed = new Date(dateStr);
//             if (!isNaN(parsed)) {
//               date = parsed;
//             }
//           }
//         }

//         if (timeStr) {
//           const [hours, minutes] = timeStr.split(":").map(Number);
//           if (!isNaN(hours) && !isNaN(minutes)) {
//             date.setHours(hours, minutes, 0, 0);
//           }
//         }
//         return date.getTime();
//       }

//       const mensagens = [];
//       const elementos = Array.from(
//         document.querySelectorAll(
//           '[data-tid="chat-pane-message"], [data-tid="message-group"]'
//         )
//       ).reverse();

//       let currentDateStr = null;

//       for (const el of elementos) {
//         if (el.matches('[data-tid="message-group"]')) {
//           currentDateStr = el.querySelector('[data-tid="message-group-header"]')?.innerText?.trim();
//         }

//         if (el.matches('[data-tid="chat-pane-message"]')) {
//           const ehDoBot = el.closest(".fui-ChatMyMessage");
//           if (ehDoBot) continue;

//           const texto = el.querySelector('[id^="content-"]')?.innerText?.trim();
//           if (!texto) continue;

//           const autor =
//             el.querySelector('[data-tid="message-author"]')?.innerText?.trim() ||
//             "CLIENTE";
//           const horaStr =
//             el
//               .querySelector('[data-tid="message-timestamp"]')
//               ?.getAttribute("aria-label") || null;
//           const timestamp = parseTimestamp(horaStr, currentDateStr);

//           mensagens.push({
//             texto,
//             autor,
//             hora: horaStr,
//             timestamp,
//             nomeContato: document.title.split(" - ")[0],
//           });

//           if (mensagens.length >= max) break;
//         }
//       }

//       return mensagens.reverse();
//     }, max);
//   }

//   async lerTodosChats() {
//     const page = await this.browser.getPagina();
//     return await page.evaluate(() => {
//       const chats = [];
//       const itens = document.querySelectorAll(
//         '[role="treeitem"][data-item-type="chat"]'
//       );
//       itens.forEach((el) => {
//         const nomeEl = el.querySelector('[id^="title-chat-list-item_"]');
//         if (!nomeEl) return;
//         const nome = nomeEl?.textContent?.trim();
//         if (nome) chats.push({ nome });
//       });
//       return chats;
//     });
//   }
// }

// module.exports = MessageReader;

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

  async getUltimaMensagem() {
    const page = await this.browser.getPagina();

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
        const hora =
          msg
            .querySelector('[data-tid="message-timestamp"]')
            ?.getAttribute("aria-label") || null;

        return { texto, autor, hora };
      }
      return null;
    });

    return mensagem ? { ...mensagem, nomeContato } : null;
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
    return await page.evaluate((max) => {
      // Função auxiliar para converter a string de hora para um timestamp mais robusto
      // Inclui a data da mensagem se disponível, caso contrário, usa a data atual
      function parseTimestamp(timeStr, dateStr) {
        let date = new Date();
        if (dateStr) {
          // Tenta parsear a data se ela for fornecida (ex: "Hoje", "Ontem")
          const today = new Date();
          const yesterday = new Date();
          yesterday.setDate(today.getDate() - 1);

          if (dateStr.toLowerCase().includes("ontem")) {
            date = yesterday;
          } else if (!dateStr.toLowerCase().includes("hoje")) {
            // Se não for nem "hoje" nem "ontem", tenta parsear a data
            // Isso pode ser estendido para outros formatos de data
            const parsed = new Date(dateStr);
            if (!isNaN(parsed)) {
              date = parsed;
            }
          }
        }

        if (timeStr) {
          const [hours, minutes] = timeStr.split(":").map(Number);
          if (!isNaN(hours) && !isNaN(minutes)) {
            date.setHours(hours, minutes, 0, 0);
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
          currentDateStr = el.querySelector('[data-tid="message-group-header"]')?.innerText?.trim();
        }

        if (el.matches('[data-tid="chat-pane-message"]')) {
          const ehDoBot = el.closest(".fui-ChatMyMessage");
          if (ehDoBot) continue;

          const texto = el.querySelector('[id^="content-"]')?.innerText?.trim();
          if (!texto) continue;

          const autor =
            el.querySelector('[data-tid="message-author"]')?.innerText?.trim() ||
            "CLIENTE";
          const horaStr =
            el
              .querySelector('[data-tid="message-timestamp"]')
              ?.getAttribute("aria-label") || null;
          const timestamp = parseTimestamp(horaStr, currentDateStr);

          mensagens.push({
            texto,
            autor,
            hora: horaStr,
            timestamp,
            nomeContato: document.title.split(" - ")[0],
          });

          if (mensagens.length >= max) break;
        }
      }

      return mensagens.reverse();
    }, max);
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
}

module.exports = MessageReader;

