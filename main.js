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

  const browser = await launchBrowser();
  const page = await browser.newPage();
  await page.goto("https://teams.microsoft.com");

  const client = new TeamsClient(page);
  const bot = new BotService(client, new DefaultHandler());

  bot.setWindow(global.win); // envia janela para comunicação
  global.botInstance = bot;

  win.webContents.send("login-status", { status: "iniciando" });

  try {
    await bot.teamsClient.loginIfNeeded(); // tentativa de login
    win.webContents.send("login-status", { status: "sucesso" });
  } catch (err) {
    win.webContents.send("login-status", { status: "erro", mensagem: err.message });
  }
});

ipcMain.on("iniciar-bot", async () => {
  if (global.botInstance) await global.botInstance.init();
});

ipcMain.on("parar-bot", () => {
  if (global.botInstance && typeof global.botInstance.parar === "function") {
    global.botInstance.parar();
  }
});

ipcMain.on("verificar-mensagens-pendentes", async () => {
  if (global.botInstance && typeof global.botInstance.verificarPendencias === "function") {
    await global.botInstance.verificarPendencias();
  }
});

ipcMain.on("verificar-pendencias", async () => {
  if (global.botInstance && typeof global.botInstance.verificarPendencias === "function") {
    await global.botInstance.verificarPendencias();
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