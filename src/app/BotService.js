// class BotService {
//   constructor(teamsClient, messageHandler) {
//     this.teamsClient = teamsClient;
//     this.messageHandler = messageHandler;
//     this.ultimasMensagensLidas = new Map();
//     this.mensagensNaoRespondidas = [];
//     this.chatAbertoAtual = null;
//     this.ultimaMensagemEnviadaPeloBot = null;
//     this.ativo = false;
//     this.loopPrincipal = null;
//     this.loopChatAberto = null;
//   }

//   setWindow(win) {
//     this.win = win;
//     global.win = win;
//   }

//   async init() {
//     this.ultimasMensagensLidas.clear();
//     this.page = this.teamsClient.page;
//     await this.teamsClient.loginIfNeeded();

//     console.log("🤖 Nome do bot para comparação:", this.teamsClient.nomeDoUsuario);

//     const ultimaMsg = await this.teamsClient.getUltimaMensagem();
//     console.log("🧾 Última mensagem ao iniciar:", ultimaMsg);

//     if (ultimaMsg && await this.teamsClient.isMensagemDoBot(ultimaMsg.autor)) {
//       this.ultimaMensagemEnviadaPeloBot = ultimaMsg.texto;
//     }

//     console.log("✅ Bot iniciado. Monitorando apenas chats não lidos...");
//     await this.verificarPendencias();
//     this.ativo = true;

//     this.loopPrincipal = setInterval(async () => {
//       if (!this.ativo) return;

//       try {
//         const chatsNaoLidos = await this.teamsClient.buscarChatsNaoLidos();
//         if (chatsNaoLidos.length > 0) {
//           console.log(`📥 Chats não lidos: ${chatsNaoLidos.map(c => c.nome).join(", ")}`);
//         }

//         for (const chat of chatsNaoLidos) {
//           try {
//             const chatAberto = await this.teamsClient.abrirChat(chat.nome);
//             await this.teamsClient.delay(5000); // Aumentado para garantir que o chat carregue
//             this.chatAbertoAtual = chat.nome;

//             if (!chatAberto) {
//               console.warn(`⚠️ Não foi possível abrir o chat: ${chat.nome}`);
//               continue;
//             }

//             const ultimaMensagem = await this.teamsClient.getUltimaMensagem();
//             console.log(`[${chat.nome}] Última mensagem:`, ultimaMensagem);
//             if (!ultimaMensagem) continue;

//             const { texto: mensagemAtual, autor, nomeContato } = ultimaMensagem;
//             if (!nomeContato) {
//               console.warn(`⚠️ Nome do contato não detectado para o chat: ${chat.nome}. Tentando reabrir...`);
//               await this.teamsClient.abrirChat(chat.nome);
//               await this.teamsClient.delay(5000);
//               const novaTentativa = await this.teamsClient.getUltimaMensagem();
//               if (!novaTentativa || !novaTentativa.nomeContato) {
//                 console.error(`❌ Não foi possível determinar o contato para o chat: ${chat.nome}. Pulando mensagem.`);
//                 continue;
//               }
//               nomeContato = novaTentativa.nomeContato;
//             }

//             const contatoAtual = nomeContato;
//             const ultimaLida = this.ultimasMensagensLidas.get(contatoAtual) || "";
//             const ehRespostaDoBot = mensagemAtual === this.ultimaMensagemEnviadaPeloBot;

//             if (await this.teamsClient.isMensagemDoBot(autor) || ehRespostaDoBot) {
//               this.ultimasMensagensLidas.set(contatoAtual, mensagemAtual);
//               continue;
//             }

//             // Evitar processamento duplicado
//             const mensagemKey = `${contatoAtual}:${mensagemAtual}`;
//             if (this.ultimasMensagensLidas.get(mensagemKey)) {
//               console.log(`Mensagem já processada: ${mensagemKey}`);
//               continue;
//             }

//             if (mensagemAtual && (!ultimaLida || mensagemAtual.toLowerCase() !== ultimaLida.toLowerCase())) {
//               const resposta = this.messageHandler.processar(mensagemAtual, contatoAtual);

//               if (resposta) {
//                 console.log(`[${contatoAtual}] Resposta do handler:`, resposta);
//                 await this.teamsClient.enviarMensagem(resposta);
//                 this.ultimaMensagemEnviadaPeloBot = resposta;
//               } else {
//                 const mensagemJaPendente = this.mensagensNaoRespondidas.some(
//                   item => item.nome === contatoAtual && item.mensagem === mensagemAtual
//                 );
//                 if (!mensagemJaPendente) {
//                   const novaMensagem = {
//                     nome: contatoAtual,
//                     mensagem: mensagemAtual,
//                     autorOriginal: autor,
//                     hora: new Date().toLocaleTimeString()
//                   };
//                   this.mensagensNaoRespondidas.push(novaMensagem);

//                   if (this.win) {
//                     console.log(`📨 Enviando mensagem não respondida para a interface: ${contatoAtual} - "${mensagemAtual}"`);
//                     this.win.webContents.send("mensagem-nao-respondida", {
//                       nome: contatoAtual,
//                       mensagem: mensagemAtual,
//                       hora: new Date().toLocaleTimeString()
//                     });
//                   }
//                 }
//               }

//               this.ultimasMensagensLidas.set(contatoAtual, mensagemAtual);
//               this.ultimasMensagensLidas.set(mensagemKey, true);
//             }

//             await this.teamsClient.delay(1500);
//           } catch (erroInterno) {
//             console.error(`❌ Erro ao processar chat '${chat.nome}':`, erroInterno.message);
//           }
//         }
//       } catch (error) {
//         console.error("❌ Erro no loop principal:", error.message);
//         if (this.win) {
//           this.win.webContents.send("error", { mensagem: `Erro no bot: ${error.message}` });
//         }
//       }
//     }, 12000);

//     this.loopChatAberto = setInterval(async () => {
//       if (!this.ativo || !this.chatAbertoAtual) {
//         console.log(`🔍 loopChatAberto - Não há chat ativo para monitorar (chatAbertoAtual: ${this.chatAbertoAtual})`);
//         return;
//       }

//       try {
//         const ultimaMensagem = await this.teamsClient.getUltimaMensagem();
//         console.log(`[${this.chatAbertoAtual}] (chat ativo) Última mensagem:`, ultimaMensagem);
//         if (!ultimaMensagem) return;

//         let { texto: mensagemAtual, autor, nomeContato } = ultimaMensagem;
//         if (!nomeContato || nomeContato !== this.chatAbertoAtual) {
//           console.warn(`⚠️ Nome do contato (${nomeContato}) não corresponde ao chatAbertoAtual (${this.chatAbertoAtual}). Reabrindo chat para confirmar...`);
//           const chatAberto = await this.teamsClient.abrirChat(this.chatAbertoAtual);
//           if (!chatAberto) {
//             console.error(`❌ Não foi possível reabrir o chat: ${this.chatAbertoAtual}`);
//             return;
//           }
//           await this.teamsClient.delay(5000); // Aumentado para garantir que o chat carregue
//           const novaTentativa = await this.teamsClient.getUltimaMensagem();
//           if (!novaTentativa || !novaTentativa.nomeContato) {
//             console.error(`❌ Ainda não foi possível determinar o contato. Pulando mensagem.`);
//             return;
//           }
//           nomeContato = novaTentativa.nomeContato;
//           mensagemAtual = novaTentativa.texto;
//           autor = novaTentativa.autor;
//           console.log(`✅ Nome do contato atualizado após reabrir chat: ${nomeContato}`);
//         }

//         const contatoAtual = nomeContato;
//         this.chatAbertoAtual = contatoAtual;

//         const ultimaLida = this.ultimasMensagensLidas.get(contatoAtual) || "";
//         const ehRespostaDoBot = mensagemAtual === this.ultimaMensagemEnviadaPeloBot;

//         if (await this.teamsClient.isMensagemDoBot(autor) || ehRespostaDoBot) {
//           console.log(`🔍 Mensagem de ${contatoAtual} é do bot ou já foi respondida. Ignorando.`);
//           return;
//         }

//         const mensagemKey = `${contatoAtual}:${mensagemAtual}`;
//         if (this.ultimasMensagensLidas.get(mensagemKey)) {
//           console.log(`Mensagem já processada (chat ativo): ${mensagemKey}`);
//           return;
//         }

//         if (mensagemAtual && (!ultimaLida || mensagemAtual.toLowerCase() !== ultimaLida.toLowerCase())) {
//           console.log(`[${contatoAtual}] (chat ativo) Nova mensagem recebida: '${mensagemAtual}'`);
//           const resposta = this.messageHandler.processar(mensagemAtual, contatoAtual);

//           if (resposta) {
//             await this.teamsClient.enviarMensagem(resposta);
//             this.ultimaMensagemEnviadaPeloBot = resposta;
//           } else {
//             const mensagemJaPendente = this.mensagensNaoRespondidas.some(
//               item => item.nome === contatoAtual && item.mensagem === mensagemAtual
//             );
//             if (!mensagemJaPendente) {
//               const novaMensagem = {
//                 nome: contatoAtual,
//                 mensagem: mensagemAtual,
//                 hora: new Date().toLocaleTimeString()
//               };
//               this.mensagensNaoRespondidas.push(novaMensagem);

//               if (this.win) {
//                 console.log(`📨 Enviando mensagem não respondida para a interface: ${contatoAtual} - "${mensagemAtual}"`);
//                 this.win.webContents.send("mensagem-nao-respondida", {
//                   nome: contatoAtual,
//                   mensagem: mensagemAtual,
//                   hora: new Date().toLocaleTimeString()
//                 });
//               }
//             } else {
//               console.log(`🔍 Mensagem '${mensagemAtual}' de ${contatoAtual} já está na lista de pendências. Ignorando.`);
//             }
//           }

//           this.ultimasMensagensLidas.set(contatoAtual, mensagemAtual);
//           this.ultimasMensagensLidas.set(mensagemKey, true);
//         }
//       } catch (err) {
//         console.error(`❌ Erro ao monitorar chat ativo: ${err.message}`);
//         if (this.win) {
//           this.win.webContents.send("error", { mensagem: `Erro ao monitorar chat ativo: ${err.message}` });
//         }
//       }
//     }, 5000);
//   }

//   parar() {
//     console.log("🛑 Bot desligado manualmente.");
//     this.ativo = false;

//     if (this.loopPrincipal) clearInterval(this.loopPrincipal);
//     if (this.loopChatAberto) clearInterval(this.loopChatAberto);

//     this.loopPrincipal = null;
//     this.loopChatAberto = null;
//   }

//   async verificarPendencias() {
//     console.log("🔁 Verificando pendências...");

//     const mensagensPendentes = [...this.mensagensNaoRespondidas];
//     this.mensagensNaoRespondidas = [];

//     for (const item of mensagensPendentes) {
//       const { nome, mensagem, autorOriginal } = item;

//       try {
//         const chatAberto = await this.teamsClient.abrirChat(nome);
//         if (!chatAberto) {
//           console.warn(`⚠️ Chat não encontrado: ${nome}`);
//           this.mensagensNaoRespondidas.push(item);
//           continue;
//         }

//         await this.teamsClient.delay(5000);

//         const mensagensRecentes = await this.teamsClient.getMensagensRecentes(10);
//         let houveRespostaReal = false;

//         for (const msg of mensagensRecentes) {
//           const ehDoBot = this.teamsClient.isMensagemDoBot(msg.autor);
//           const ehRepetida = msg.texto?.toLowerCase() === mensagem.toLowerCase();

//           if (ehDoBot || ehRepetida) continue;

//           if (!autorOriginal || msg.autor !== autorOriginal || !ehRepetida) {
//             houveRespostaReal = true;
//             break;
//           }
//         }

//         if (houveRespostaReal) {
//           console.log(`🧹 ${nome} respondeu. Removendo da interface.`);
//           if (this.win) {
//             this.win.webContents.send("remover-mensagem-pendente", { nome, mensagem });
//           }
//         } else {
//           console.log(`🔄 ${nome} ainda não respondeu.`);
//           this.mensagensNaoRespondidas.push(item);
//         }
//       } catch (erro) {
//         console.error(`❌ Erro ao verificar pendência de ${nome}:`, erro.message);
//         this.mensagensNaoRespondidas.push(item);
//       }

//       await this.teamsClient.delay(1000);
//     }
//   }

//   async destroy() {
//     this.parar();
//     // Não fechar o navegador aqui, para manter a sessão ativa
//     console.log("🧹 BotService destruído, mantendo o navegador ativo para reutilização.");
//   }
// }

// module.exports = {
//   BotService
// };
class BotService {
  constructor(teamsClient, messageHandler) {
    this.teamsClient = teamsClient;
    this.messageHandler = messageHandler;
    this.ultimasMensagensLidas = new Map();
    this.mensagensNaoRespondidas = [];
    this.chatAbertoAtual = null;
    this.ultimaMensagemEnviadaPeloBot = null;
    this.ativo = false;
    this.loopPrincipal = null;
    this.loopChatAberto = null;
  }

  setWindow(win) {
    this.win = win;
    global.win = win;
  }

  async init() {
    this.ultimasMensagensLidas.clear();
    this.page = this.teamsClient.page;
    await this.teamsClient.loginIfNeeded();

    console.log("🤖 Nome do bot para comparação:", this.teamsClient.nomeDoUsuario);

    const ultimaMsg = await this.teamsClient.getUltimaMensagem();
    console.log("🧾 Última mensagem ao iniciar:", ultimaMsg);

    if (ultimaMsg && await this.teamsClient.isMensagemDoBot(ultimaMsg.autor)) {
      this.ultimaMensagemEnviadaPeloBot = ultimaMsg.texto;
    }

    console.log("✅ Bot iniciado. Monitorando apenas chats não lidos...");
    await this.verificarPendencias();
    this.ativo = true;

    this.loopPrincipal = setInterval(async () => {
      if (!this.ativo) return;

      try {
        const chatsNaoLidos = await this.teamsClient.buscarChatsNaoLidos();
        if (chatsNaoLidos.length > 0) {
          console.log(`📥 Chats não lidos: ${chatsNaoLidos.map(c => c.nome).join(", ")}`);
        }

        for (const chat of chatsNaoLidos) {
          try {
            const chatAberto = await this.teamsClient.abrirChat(chat.nome);
            await this.teamsClient.delay(5000); // Aumentado para garantir que o chat carregue
            this.chatAbertoAtual = chat.nome;

            if (!chatAberto) {
              console.warn(`⚠️ Não foi possível abrir o chat: ${chat.nome}`);
              continue;
            }

            const ultimaMensagem = await this.teamsClient.getUltimaMensagem();
            console.log(`[${chat.nome}] Última mensagem:`, ultimaMensagem);
            if (!ultimaMensagem) continue;

            const { texto: mensagemAtual, autor, nomeContato } = ultimaMensagem;
            if (!nomeContato) {
              console.warn(`⚠️ Nome do contato não detectado para o chat: ${chat.nome}. Tentando reabrir...`);
              await this.teamsClient.abrirChat(chat.nome);
              await this.teamsClient.delay(5000);
              const novaTentativa = await this.teamsClient.getUltimaMensagem();
              if (!novaTentativa || !novaTentativa.nomeContato) {
                console.error(`❌ Não foi possível determinar o contato para o chat: ${chat.nome}. Pulando mensagem.`);
                continue;
              }
              nomeContato = novaTentativa.nomeContato;
            }

            const contatoAtual = nomeContato;
            const ultimaLida = this.ultimasMensagensLidas.get(contatoAtual) || "";
            const ehRespostaDoBot = mensagemAtual === this.ultimaMensagemEnviadaPeloBot;

            if (await this.teamsClient.isMensagemDoBot(autor) || ehRespostaDoBot) {
              this.ultimasMensagensLidas.set(contatoAtual, mensagemAtual);
              continue;
            }

            // Evitar processamento duplicado
            const mensagemKey = `${contatoAtual}:${mensagemAtual}`;
            if (this.ultimasMensagensLidas.get(mensagemKey)) {
              console.log(`Mensagem já processada: ${mensagemKey}`);
              continue;
            }

            if (mensagemAtual && (!ultimaLida || mensagemAtual.toLowerCase() !== ultimaLida.toLowerCase())) {
              const resposta = this.messageHandler.processar(mensagemAtual, contatoAtual);
              console.log(`[${contatoAtual}] Resposta gerada pelo handler: "${resposta}"`);

              if (resposta) {
                console.log(`[${contatoAtual}] Enviando resposta: "${resposta}"`);
                await this.teamsClient.enviarMensagem(resposta);
                this.ultimaMensagemEnviadaPeloBot = resposta;
              } else {
                const mensagemJaPendente = this.mensagensNaoRespondidas.some(
                  item => item.nome === contatoAtual && item.mensagem === mensagemAtual
                );
                if (!mensagemJaPendente) {
                  const novaMensagem = {
                    nome: contatoAtual,
                    mensagem: mensagemAtual,
                    autorOriginal: autor,
                    hora: new Date().toLocaleTimeString()
                  };
                  this.mensagensNaoRespondidas.push(novaMensagem);

                  if (this.win) {
                    console.log(`📨 Enviando mensagem não respondida para a interface: ${contatoAtual} - "${mensagemAtual}"`);
                    this.win.webContents.send("mensagem-nao-respondida", {
                      nome: contatoAtual,
                      mensagem: mensagemAtual,
                      hora: new Date().toLocaleTimeString()
                    });
                  }
                }
              }

              this.ultimasMensagensLidas.set(contatoAtual, mensagemAtual);
              this.ultimasMensagensLidas.set(mensagemKey, true);
            }

            await this.teamsClient.delay(1500);
          } catch (erroInterno) {
            console.error(`❌ Erro ao processar chat '${chat.nome}':`, erroInterno.message);
          }
        }
      } catch (error) {
        console.error("❌ Erro no loop principal:", error.message);
        if (this.win) {
          this.win.webContents.send("error", { mensagem: `Erro no bot: ${error.message}` });
        }
      }
    }, 12000);

    this.loopChatAberto = setInterval(async () => {
      if (!this.ativo || !this.chatAbertoAtual) {
        console.log(`🔍 loopChatAberto - Não há chat ativo para monitorar (chatAbertoAtual: ${this.chatAbertoAtual})`);
        return;
      }

      try {
        const ultimaMensagem = await this.teamsClient.getUltimaMensagem();
        console.log(`[${this.chatAbertoAtual}] (chat ativo) Última mensagem:`, ultimaMensagem);
        if (!ultimaMensagem) return;

        let { texto: mensagemAtual, autor, nomeContato } = ultimaMensagem;
        if (!nomeContato || nomeContato !== this.chatAbertoAtual) {
          console.warn(`⚠️ Nome do contato (${nomeContato}) não corresponde ao chatAbertoAtual (${this.chatAbertoAtual}). Reabrindo chat para confirmar...`);
          const chatAberto = await this.teamsClient.abrirChat(this.chatAbertoAtual);
          if (!chatAberto) {
            console.error(`❌ Não foi possível reabrir o chat: ${this.chatAbertoAtual}`);
            return;
          }
          await this.teamsClient.delay(5000); // Aumentado para garantir que o chat carregue
          const novaTentativa = await this.teamsClient.getUltimaMensagem();
          if (!novaTentativa || !novaTentativa.nomeContato) {
            console.error(`❌ Ainda não foi possível determinar o contato. Pulando mensagem.`);
            return;
          }
          nomeContato = novaTentativa.nomeContato;
          mensagemAtual = novaTentativa.texto;
          autor = novaTentativa.autor;
          console.log(`✅ Nome do contato atualizado após reabrir chat: ${nomeContato}`);
        }

        const contatoAtual = nomeContato;
        this.chatAbertoAtual = contatoAtual;

        const ultimaLida = this.ultimasMensagensLidas.get(contatoAtual) || "";
        const ehRespostaDoBot = mensagemAtual === this.ultimaMensagemEnviadaPeloBot;

        if (await this.teamsClient.isMensagemDoBot(autor) || ehRespostaDoBot) {
          console.log(`🔍 Mensagem de ${contatoAtual} é do bot ou já foi respondida. Ignorando.`);
          return;
        }

        if (mensagemAtual && (!ultimaLida || mensagemAtual.toLowerCase() !== ultimaLida.toLowerCase()) && !this.ultimasMensagensLidas.get(`${contatoAtual}:${mensagemAtual}`)) {
          console.log(`[${contatoAtual}] (chat ativo) Nova mensagem recebida: '${mensagemAtual}'`);
          const resposta = this.messageHandler.processar(mensagemAtual, contatoAtual);
          console.log(`[${contatoAtual}] Resposta gerada pelo handler: "${resposta}"`);

          if (resposta) {
            console.log(`[${contatoAtual}] Enviando resposta: "${resposta}"`);
            await this.teamsClient.enviarMensagem(resposta);
            this.ultimaMensagemEnviadaPeloBot = resposta;
          } else {
            const mensagemJaPendente = this.mensagensNaoRespondidas.some(
              item => item.nome === contatoAtual && item.mensagem === mensagemAtual
            );
            if (!mensagemJaPendente) {
              const novaMensagem = {
                nome: contatoAtual,
                mensagem: mensagemAtual,
                hora: new Date().toLocaleTimeString()
              };
              this.mensagensNaoRespondidas.push(novaMensagem);

              if (this.win) {
                console.log(`📨 Enviando mensagem não respondida para a interface: ${contatoAtual} - "${mensagemAtual}"`);
                this.win.webContents.send("mensagem-nao-respondida", {
                  nome: contatoAtual,
                  mensagem: mensagemAtual,
                  hora: new Date().toLocaleTimeString()
                });
              }
            } else {
              console.log(`🔍 Mensagem '${mensagemAtual}' de ${contatoAtual} já está na lista de pendências. Ignorando.`);
            }
          }
        }

        this.ultimasMensagensLidas.set(contatoAtual, mensagemAtual);
        const mensagemKey = `${contatoAtual}:${mensagemAtual}`;
        this.ultimasMensagensLidas.set(mensagemKey, true);
      } catch (err) {
        console.error(`❌ Erro ao monitorar chat ativo: ${err.message}`);
        if (this.win) {
          this.win.webContents.send("error", { mensagem: `Erro ao monitorar chat ativo: ${err.message}` });
        }
      }
    }, 5000);
  }

  parar() {
    console.log("🛑 Bot desligado manualmente.");
    this.ativo = false;

    if (this.loopPrincipal) clearInterval(this.loopPrincipal);
    if (this.loopChatAberto) clearInterval(this.loopChatAberto);

    this.loopPrincipal = null;
    this.loopChatAberto = null;
  }

  async verificarPendencias() {
    console.log("🔁 Verificando pendências...");

    if (this.mensagensNaoRespondidas.length === 0) {
      console.log("✅ Nenhuma mensagem pendente encontrada.");
      return;
    }

    console.log(`📋 Mensagens pendentes: ${this.mensagensNaoRespondidas.length}`);
    this.mensagensNaoRespondidas.forEach(item => {
      console.log(`- ${item.nome}: "${item.mensagem}" (desde ${item.hora})`);
    });
  }

  removerPendencia(nome, mensagem) {
    const index = this.mensagensNaoRespondidas.findIndex(
      item => item.nome === nome && item.mensagem === mensagem
    );
    if (index !== -1) {
      this.mensagensNaoRespondidas.splice(index, 1);
      console.log(`🧹 Pendência removida: ${nome} - "${mensagem}"`);
      if (this.win) {
        this.win.webContents.send("remover-mensagem-pendente", { nome, mensagem });
      }
    } else {
      console.warn(`⚠️ Pendência não encontrada: ${nome} - "${mensagem}"`);
    }
  }

  async destroy() {
    this.parar();
    // Não fechar o navegador aqui, para manter a sessão ativa
    console.log("🧹 BotService destruído, mantendo o navegador ativo para reutilização.");
  }
}

module.exports = {
  BotService
};