// class TeamsClient {
//   constructor(page) {
//     this.page = page;
//     this.nomeDoUsuario = null;
//   }

//   async delay(ms) {
//     return new Promise(resolve => setTimeout(resolve, ms));
//   }

//   async loginIfNeeded() {
//     console.log("Aguardando login manual...");

//     try {
//       // Verificar se a página ainda está ativa
//       if (!this.page || this.page.isClosed()) {
//         throw new Error("Página do Puppeteer está fechada ou inválida.");
//       }

//       await Promise.race([
//         this.page.waitForSelector('#i0116', { timeout: 30000 }),
//         this.page.waitForSelector('[role="treeitem"][data-item-type="chat"]', { timeout: 30000 })
//       ]).catch(err => {
//         throw new Error(`Timeout ao aguardar seletores: ${err.message}`);
//       });

//       await this.delay(5000);
//       console.log("Login concluído e interface carregada.");
//     } catch (err) {
//       console.error("Erro ao aguardar interface do Teams:", err.message);
//       // Tentar recarregar a página se o frame estiver desconectado
//       if (err.message.includes("detached Frame")) {
//         console.warn("⚠️ Frame desconectado detectado. Tentando recarregar a página...");
//         await this.page.reload({ waitUntil: "networkidle2" });
//         await this.delay(5000);
//         try {
//           await this.page.waitForSelector('[role="treeitem"][data-item-type="chat"]', { timeout: 30000 });
//           console.log("✅ Página recarregada com sucesso.");
//         } catch (reloadErr) {
//           throw new Error("Falha ao recarregar a página: " + reloadErr.message);
//         }
//       }
//       throw new Error("Falha no login ou interface não carregada corretamente.");
//     }

//     await this.delay(5000);
//     try {
//       const nomeUsuario = await this.page.evaluate(() => {
//         const el = document.querySelector('[data-tid="user-display-name"]');
//         return el?.innerText.trim() || null;
//       });

//       this.nomeDoUsuario = nomeUsuario;
//       console.log("👤 Nome do usuário logado detectado:", nomeUsuario);
//     } catch (err) {
//       console.warn("⚠️ Não foi possível detectar o nome do usuário.");
//     }
//   }

//   async getMensagensRecentes(limit = 10) {
//     return await this.page.evaluate((limite) => {
//       const mensagens = Array.from(document.querySelectorAll('[data-tid="chat-pane-message"]'));
//       return mensagens.slice(-limite).map(msg => {
//         const texto = msg.querySelector('[id^="content-"]')?.innerText.trim();
//         const autor = msg.querySelector('[data-tid="message-author"]')?.innerText.trim();
//         return { texto, autor };
//       }).filter(m => m.texto && m.autor);
//     }, limit);
//   }

//   async getUltimaMensagem() {
//     const nomeContato = await this.getNomeDoContatoAtual();
//     if (!nomeContato) {
//       console.warn("⚠️ Nome do contato atual não detectado. Tentando identificar via chat list...");
//       // Tentativa de obter o nome do contato a partir da lista de chats
//       const chatsVisiveis = await this.listarTodosOsChatsVisiveis();
//       const chatAtivo = await this.page.evaluate(() => {
//         const chatSelecionado = document.querySelector('[role="treeitem"][data-item-type="chat"][aria-selected="true"]');
//         if (chatSelecionado) {
//           const nomeElement = chatSelecionado.querySelector('[id^="title-chat-list-item_"]');
//           return nomeElement?.innerText.trim() || null;
//         }
//         return null;
//       });
//       if (chatAtivo && chatsVisiveis.includes(chatAtivo)) {
//         console.log(`🔍 Nome do contato detectado via lista de chats: ${chatAtivo}`);
//         nomeContato = chatAtivo;
//       } else {
//         console.error("❌ Não foi possível determinar o contato atual.");
//       }
//     } else {
//       console.log(`🔍 Nome do contato detectado via getNomeDoContatoAtual: ${nomeContato}`);
//     }

//     const mensagem = await this.page.evaluate(() => {
//       const mensagens = Array.from(document.querySelectorAll('[data-tid="chat-pane-message"]')).reverse();

//       for (const msg of mensagens) {
//         const isBot = msg.closest('.fui-ChatMyMessage');
//         if (isBot) continue;

//         const texto = msg.querySelector('[id^="content-"]')?.innerText?.trim();
//         if (!texto) continue;

//         const autorElement = msg.querySelector('.ui-chat__message__author') ||
//           msg.querySelector('[data-tid="message-author-name"]');
//         const autor = autorElement?.innerText?.trim() || "CLIENTE";

//         return { texto, autor };
//       }
//       return null;
//     });

//     if (mensagem) {
//       return { ...mensagem, nomeContato };
//     }
//     return null;
//   }

//   async isMensagemDoBot(autor) {
//     if (!autor || autor === "Desconhecido") {
//       console.warn("⚠️ Autor não definido. Considerando que NÃO é o bot.");
//       return false;
//     }

//     if (autor === "BOT") {
//       console.log("✅ [isMensagemDoBot] Mensagem enviada pelo bot.");
//       return true;
//     }

//     console.log(`🧍 [isMensagemDoBot] Mensagem foi enviada por ${autor} (não é o bot).`);
//     return false;
//   }

//   async enviarMensagem(texto) {
//     try {
//       console.log("⌛ Aguardando campo de mensagem aparecer...");
//       const campo = await this.page.waitForSelector('div[id^="new-message-"]', {
//         timeout: 10000,
//       });

//       if (campo) {
//         console.log("✅ Campo localizado com seletor: div[id^='new-message-']");
//         await this.page.evaluate(el => el.scrollIntoView(), campo);
//         await campo.focus();
//         await this.delay(500);
//         await this.page.keyboard.type(texto, { delay: 30 });
//         await this.page.keyboard.press("Enter");

//         console.log("✅ Mensagem enviada:", texto);
//       } else {
//         console.warn("❌ Campo de mensagem não encontrado");
//         const debugInfo = await this.page.evaluate(() => {
//           return [...document.querySelectorAll('[contenteditable="true"]')].map(el => ({
//             text: el.innerText,
//             html: el.outerHTML.slice(0, 300) + '...'
//           }));
//         });
//         console.log("🔍 Campos 'contenteditable' encontrados:", debugInfo);
//       }
//     } catch (error) {
//       console.error("❌ Erro ao enviar mensagem:", error.message);
//     }
//   }

//   async buscarChatsNaoLidos() {
//     try {
//       await this.page.waitForSelector('[role="list"]', { timeout: 10000 });
//       const chats = await this.page.evaluate(() => {
//         const chatsEncontrados = [];
//         document.querySelectorAll('[role="treeitem"]').forEach(element => {
//           const temNotificacao = element.querySelector('.notification-badge, .activity-badge, [data-tid="activity-badge-indicator"]');
//           const nomeElement = element.querySelector('[id^="title-chat-list-item_"]');
//           if (nomeElement) {
//             const nome = nomeElement.innerText.trim();
//             const style = window.getComputedStyle(nomeElement);
//             const temNegrito = style.fontWeight === '700' || style.fontWeight === 'bold';
//             if (temNotificacao || temNegrito) {
//               chatsEncontrados.push({ nome, temNaoLido: true });
//             }
//           }
//         });
//         return chatsEncontrados;
//       });

//       console.log("✅ Chats não lidos encontrados:", chats.length);
//       console.log(chats.map(c => c.nome));
//       return chats;
//     } catch (error) {
//       console.error("❌ Erro ao buscar chats:", error.message);
//       return [];
//     }
//   }

//   async abrirChat(nomeContato) {
//     try {
//       const sucesso = await this.page.evaluate((nome) => {
//         const elementos = Array.from(document.querySelectorAll('[role="treeitem"][data-item-type="chat"]'));
//         const alvo = elementos.find(el => {
//           const nomeElement = el.querySelector('[id^="title-chat-list-item_"]');
//           return nomeElement && nomeElement.innerText.toLowerCase().includes(nome.toLowerCase());
//         });
//         if (alvo) {
//           alvo.click();
//           return true;
//         }
//         return false;
//       }, nomeContato);

//       if (sucesso) {
//         console.log(`✅ Chat aberto: ${nomeContato}`);
//         await this.delay(5000);
//       } else {
//         console.warn(`❌ Chat não encontrado: ${nomeContato}`);
//       }

//       return sucesso;
//     } catch (error) {
//       console.error("❌ Erro ao abrir chat:", error.message);
//       return false;
//     }
//   }

//   async logChatsRaw() {
//     try {
//       const chats = await this.page.evaluate(() => {
//         return Array.from(document.querySelectorAll('[role="treeitem"][data-item-type="chat"]')).map(el => ({
//           nome: el.querySelector('[id^="title-chat-list-item_"]')?.innerText || el.innerText,
//           html: el.innerHTML
//         }));
//       });

//       console.log("📋 Lista de chats encontrados:", chats.length);
//       chats.forEach(chat => console.log(`- ${chat.nome}`));
//       return chats;
//     } catch (error) {
//       console.error("❌ Erro ao listar chats:", error.message);
//       return [];
//     }
//   }

//   async listarTodosOsChatsVisiveis() {
//     try {
//       await this.page.waitForSelector('[role="treeitem"][data-item-type="chat"]', { timeout: 10000 });
//       const nomes = await this.page.evaluate(() => {
//         const chats = Array.from(document.querySelectorAll('[role="treeitem"][data-item-type="chat"]'));
//         return chats.map(el => {
//           const nomeElement = el.querySelector('[id^="title-chat-list-item_"]');
//           return nomeElement ? nomeElement.innerText.trim() : null;
//         }).filter(Boolean);
//       });

//       console.log("✅ Chats visíveis detectados:", nomes);
//       return nomes;
//     } catch (error) {
//       console.error("❌ Erro ao listar chats visíveis:", error.message);
//       return [];
//     }
//   }

//   async getNomeDoContatoAtual() {
//     const nomeContato = await this.page.evaluate(() => {
//       // Tenta o seletor original
//       let el = document.querySelector('[data-tid="chat-topic-menu"] span');
//       if (el) return el.innerText?.trim();

//       // Tenta seletores alternativos
//       el = document.querySelector('.fui-ChatHeader__title span') || // Título do chat no Teams
//              document.querySelector('[data-tid="chat-header-title"]') || // Outro possível seletor
//              document.querySelector('.chat-header span'); // Seletor genérico
//       return el?.innerText?.trim() || null;
//     });

//     if (!nomeContato) {
//       console.warn("⚠️ Nenhum seletor encontrou o nome do contato atual. HTML da área do cabeçalho:", 
//         await this.page.evaluate(() => document.querySelector('.fui-ChatHeader')?.outerHTML || "Cabeçalho não encontrado"));
//     }
//     return nomeContato;
//   }
// }

// module.exports = {
//   TeamsClient
// };
class TeamsClient {
  constructor(page) {
    this.page = page;
    this.nomeDoUsuario = null;
  }

  async delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async loginIfNeeded() {
    console.log("Aguardando login manual...");

    try {
      // Verificar se a página ainda está ativa
      if (!this.page || this.page.isClosed()) {
        throw new Error("Página do Puppeteer está fechada ou inválida.");
      }

      await Promise.race([
        this.page.waitForSelector('#i0116', { timeout: 30000 }),
        this.page.waitForSelector('[role="treeitem"][data-item-type="chat"]', { timeout: 30000 })
      ]).catch(err => {
        throw new Error(`Timeout ao aguardar seletores: ${err.message}`);
      });

      await this.delay(5000);
      console.log("Login concluído e interface carregada.");
    } catch (err) {
      console.error("Erro ao aguardar interface do Teams:", err.message);
      // Tentar recarregar a página se o frame estiver desconectado
      if (err.message.includes("detached Frame")) {
        console.warn("⚠️ Frame desconectado detectado. Tentando recarregar a página...");
        await this.page.reload({ waitUntil: "networkidle2" });
        await this.delay(5000);
        try {
          await this.page.waitForSelector('[role="treeitem"][data-item-type="chat"]', { timeout: 30000 });
          console.log("✅ Página recarregada com sucesso.");
        } catch (reloadErr) {
          throw new Error("Falha ao recarregar a página: " + reloadErr.message);
        }
      }
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
    const nomeContato = await this.getNomeDoContatoAtual();
    if (!nomeContato) {
      console.warn("⚠️ Nome do contato atual não detectado. Tentando identificar via chat list...");
      // Tentativa de obter o nome do contato a partir da lista de chats
      const chatsVisiveis = await this.listarTodosOsChatsVisiveis();
      const chatAtivo = await this.page.evaluate(() => {
        const chatSelecionado = document.querySelector('[role="treeitem"][data-item-type="chat"][aria-selected="true"]');
        if (chatSelecionado) {
          const nomeElement = chatSelecionado.querySelector('[id^="title-chat-list-item_"]');
          return nomeElement?.innerText.trim() || null;
        }
        return null;
      });
      if (chatAtivo && chatsVisiveis.includes(chatAtivo)) {
        console.log(`🔍 Nome do contato detectado via lista de chats: ${chatAtivo}`);
        nomeContato = chatAtivo;
      } else {
        console.error("❌ Não foi possível determinar o contato atual.");
      }
    } else {
      console.log(`🔍 Nome do contato detectado via getNomeDoContatoAtual: ${nomeContato}`);
    }

    const mensagem = await this.page.evaluate(() => {
      const mensagens = Array.from(document.querySelectorAll('[data-tid="chat-pane-message"]')).reverse();

      for (const msg of mensagens) {
        const isBot = msg.closest('.fui-ChatMyMessage');
        if (isBot) continue;

        const texto = msg.querySelector('[id^="content-"]')?.innerText?.trim();
        if (!texto) continue;

        const autorElement = msg.querySelector('.ui-chat__message__author') ||
          msg.querySelector('[data-tid="message-author-name"]');
        const autor = autorElement?.innerText?.trim() || "CLIENTE";

        return { texto, autor };
      }
      return null;
    });

    if (mensagem) {
      return { ...mensagem, nomeContato };
    }
    return null;
  }

  async isMensagemDoBot(autor) {
    if (!autor || autor === "Desconhecido") {
      console.warn("⚠️ Autor não definido. Considerando que NÃO é o bot.");
      return false;
    }

    if (autor === "BOT" || autor === this.nomeDoUsuario) {
      console.log("✅ [isMensagemDoBot] Mensagem enviada pelo bot.");
      return true;
    }

    console.log(`🧍 [isMensagemDoBot] Mensagem foi enviada por ${autor} (não é o bot).`);
    return false;
  }

  async enviarMensagem(texto) {
    try {
      if (!texto || typeof texto !== "string" || texto.trim() === "") {
        console.error("❌ Texto inválido para envio:", texto);
        return;
      }
      console.log("⌛ Aguardando campo de mensagem aparecer...");
      const campo = await this.page.waitForSelector('div[id^="new-message-"]', {
        timeout: 10000,
      });

      if (campo) {
        console.log("✅ Campo localizado com seletor: div[id^='new-message-']");
        await this.page.evaluate(el => el.scrollIntoView(), campo);
        await campo.focus();
        await this.delay(1000); // Aumentado para evitar sobreposição
        await this.page.keyboard.type(texto, { delay: 50 }); // Aumentado delay para melhor digitação
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

  async getNomeDoContatoAtual() {
    const nomeContato = await this.page.evaluate(() => {
      // Tenta o seletor original
      let el = document.querySelector('[data-tid="chat-topic-menu"] span');
      if (el) return el.innerText?.trim();

      // Tenta seletores alternativos
      el = document.querySelector('.fui-ChatHeader__title span') || // Título do chat no Teams
             document.querySelector('[data-tid="chat-header-title"]') || // Outro possível seletor
             document.querySelector('.chat-header span'); // Seletor genérico
      return el?.innerText?.trim() || null;
    });

    if (!nomeContato) {
      console.warn("⚠️ Nenhum seletor encontrou o nome do contato atual. HTML da área do cabeçalho:", 
        await this.page.evaluate(() => document.querySelector('.fui-ChatHeader')?.outerHTML || "Cabeçalho não encontrado"));
    }
    return nomeContato;
  }
}

module.exports = {
  TeamsClient
};