const puppeteer = require('puppeteer');

class BrowserService {
  async iniciarComLoginManual() {
    this.browser = await puppeteer.launch({
      headless: false,
      defaultViewport: null,
      args: ['--start-maximized']
    });
    this.page = await this.browser.newPage();
    await this.page.goto('https://teams.microsoft.com');
    console.log("🔐 Faça login no Microsoft Teams manualmente...");
    await this.page.waitForSelector('div[contenteditable="true"]', { timeout: 0 });
    console.log("✅ Login realizado, pronto para ler mensagens.");
  }

  async delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async getPagina() {
    return this.page;
  }
}

module.exports = BrowserService;
