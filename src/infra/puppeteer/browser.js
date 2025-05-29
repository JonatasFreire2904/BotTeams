// src/infra/puppeteer/browser.js
const puppeteer = require("puppeteer");

async function launchBrowser() {
  return await puppeteer.launch({
    headless: false, // Mostrar o navegador (para debug e login manual)
    defaultViewport: null,
    args: ["--start-maximized"]
  });
}

module.exports = {
  launchBrowser
};
