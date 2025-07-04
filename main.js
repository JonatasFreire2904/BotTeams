const { app, BrowserWindow } = require('electron');
const path = require('path');
const { startExpress } = require('./index.js'); // importa o Express

function createWindow() {
  const win = new BrowserWindow({
    width: 1000,
    height: 800,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true
    }
  });

  // Aguarda 1 segundo para garantir que Express está de pé
  setTimeout(() => {
    win.loadURL('http://localhost:3100');
  }, 1000);
}



app.whenReady().then(() => {
  startExpress(); // inicia o servidor Express antes da janela
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
