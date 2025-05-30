const { app, BrowserWindow, ipcMain } = require('electron');

let win;

function createWindow() {
  win = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      preload: __dirname + '/preload.js',
    }
  });

  win.loadFile('index.html');
  global.win = win; // usado no BotService para enviar mensagem para renderer
}

ipcMain.on("login-manual", async () => {
  const { launchBrowser } = require("./src/infra/puppeteer/browser");
  const { TeamsClient } = require("./src/infra/puppeteer/TeamsClient");
  const { DefaultHandler } = require("./src/handlers/DefaultHandler");
  const { BotService } = require("./src/app/BotService");

  // Limpar qualquer instância anterior do bot e navegador
  if (global.botInstance) {
    console.log("🧹 Limpando instância anterior do bot...");
    try {
      await global.botInstance.destroy();
    } catch (err) {
      console.error("❌ Erro ao destruir instância anterior:", err.message);
    }
    global.botInstance = null;
  }
  if (global.page) {
    console.log("🧹 Fechando página anterior...");
    try {
      await global.page.browser().close();
    } catch (err) {
      console.error("❌ Erro ao fechar navegador anterior:", err.message);
    }
    global.page = null;
  }

  const browser = await launchBrowser();
  const page = await browser.newPage();
  await page.goto("https://teams.microsoft.com");

  global.page = page;

  const client = new TeamsClient(page);
  const bot = new BotService(client, new DefaultHandler());

  bot.setWindow(global.win);
  global.botInstance = bot;

  win.webContents.send("login-status", { status: "iniciando" });

  try {
    await bot.teamsClient.loginIfNeeded();
    win.webContents.send("login-status", { status: "sucesso" });
  } catch (err) {
    win.webContents.send("login-status", { status: "erro", mensagem: err.message });
  }
});

ipcMain.on("iniciar-bot", async () => {
  const { TeamsClient } = require("./src/infra/puppeteer/TeamsClient");
  const { DefaultHandler } = require("./src/handlers/DefaultHandler");
  const { BotService } = require("./src/app/BotService");

  if (!global.page || !global.win) {
    console.error("❌ global.page ou global.win não estão definidos.");
    win.webContents.send("login-status", { status: "erro", mensagem: "Página ou janela não inicializadas." });
    return;
  }

  // Verificar se a página ainda está ativa e logada
  let isPageValid = false;
  try {
    const isLoggedIn = await global.page.evaluate(() => {
      return !!document.querySelector('[role="treeitem"][data-item-type="chat"]');
    });
    isPageValid = !global.page.isClosed() && isLoggedIn;
    console.log(`🔍 Estado da página: ativa=${!global.page.isClosed()}, logada=${isLoggedIn}`);
  } catch (err) {
    console.error("❌ Erro ao verificar estado da página:", err.message);
  }

  if (!isPageValid) {
    console.warn("⚠️ Página não está ativa ou não está logada. Um novo login é necessário.");
    win.webContents.send("login-status", { status: "erro", mensagem: "Sessão inválida. Por favor, faça o login novamente." });
    return;
  }

  // Limpar qualquer instância anterior do bot, sem fechar a página
  if (global.botInstance) {
    console.log("🧹 Limpando instância anterior do bot antes de iniciar nova...");
    try {
      await global.botInstance.destroy();
    } catch (err) {
      console.error("❌ Erro ao destruir instância anterior:", err.message);
    }
    global.botInstance = null;
  }

  const newClient = new TeamsClient(global.page);
  const newBot = new BotService(newClient, new DefaultHandler());
  newBot.setWindow(global.win);

  global.botInstance = newBot;

  try {
    await newBot.init();
    console.log("✅ Bot iniciado com sucesso.");
  } catch (err) {
    console.error("❌ Erro ao iniciar o bot:", err.message);
    win.webContents.send("login-status", { status: "erro", mensagem: err.message });
  }
});

ipcMain.on("parar-bot", async () => {
  if (global.botInstance) {
    console.log("🛑 Parando bot...");
    try {
      await global.botInstance.destroy();
    } catch (err) {
      console.error("❌ Erro ao parar o bot:", err.message);
    }
    global.botInstance = null;
  }
});

ipcMain.on("verificar-mensagens-pendentes", async () => {
  if (global.botInstance && typeof global.botInstance.verificarPendencias === "function") {
    try {
      await global.botInstance.verificarPendencias();
    } catch (err) {
      console.error("❌ Erro ao verificar pendências:", err.message);
    }
  } else {
    console.warn("⚠️ Bot não está inicializado ou verificarPendencias não está disponível.");
  }
});

ipcMain.on("verificar-pendencias", async () => {
  if (global.botInstance && typeof global.botInstance.verificarPendencias === "function") {
    try {
      await global.botInstance.verificarPendencias();
    } catch (err) {
      console.error("❌ Erro ao verificar pendências:", err.message);
    }
  } else {
    console.warn("⚠️ Bot não está inicializado ou verificarPendencias não está disponível.");
  }
});

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});