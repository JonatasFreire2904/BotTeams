// const puppeteer = require('puppeteer');

// class BrowserService {
//   async iniciarComLoginManual() {
//     if (this.browser && this.page) {
//       console.log("⚠️ Navegador já está iniciado.");
//       return;
//     }

//     this.browser = await puppeteer.launch({
//       headless: false,
//       defaultViewport: null,
//       args: ['--start-maximized']
//     });

//     this.page = await this.browser.newPage();
//     await this.page.goto('https://teams.microsoft.com');
//     console.log("🔐 Faça login no Microsoft Teams manualmente...");

//     await this.page.waitForSelector('div[contenteditable="true"]', { timeout: 0 });
//     console.log("✅ Login realizado, pronto para ler mensagens.");

//     // 🔒 MONITORA O FECHAMENTO DO NAVEGADOR
//     this.browser.on('disconnected', () => {
//       console.log('🔴 Navegador foi fechado. Encerrando aplicação...');
//       process.exit(0);
//     });

//     this.page.on('close', () => {
//       console.log('🔴 Página do Teams foi fechada. Encerrando aplicação...');
//       process.exit(0);
//     });
//   }

//   async delay(ms) {
//     return new Promise(resolve => setTimeout(resolve, ms));
//   }

//   async getPagina() {
//     return this.page;
//   }

//   async fechar() {
//     if (this.browser) {
//       await this.browser.close();
//     }
//   }
// }

// module.exports = BrowserService;

const puppeteer = require("puppeteer-core");
const path = require("path");
const fs = require("fs");

class BrowserService {
  async encontrarChromeWindows() {
    const suffix = "\\Google\\Chrome\\Application\\chrome.exe";
    const prefixes = [
      process.env.PROGRAMFILES,
      process.env["PROGRAMFILES(X86)"],
      process.env.LOCALAPPDATA
    ];

    for (const prefix of prefixes) {
      const fullPath = path.join(prefix, suffix);
      if (fs.existsSync(fullPath)) {
        return fullPath;
      }
    }

    throw new Error("❌ Chrome não encontrado no sistema.");
  }

  async iniciarComLoginManual() {
    if (this.browser && this.page) {
      console.log("⚠️ Navegador já está iniciado.");
      return;
    }

    const executablePath = await this.encontrarChromeWindows();

    this.browser = await puppeteer.launch({
      headless: false,
      executablePath,
      defaultViewport: null,
      args: ["--start-maximized"]
    });

    this.page = await this.browser.newPage();
    await this.page.goto("https://teams.microsoft.com");

    console.log("🔐 Faça login no Microsoft Teams manualmente...");

    await this.page.waitForSelector('div[contenteditable="true"]', { timeout: 0 });
    console.log("✅ Login realizado, pronto para ler mensagens.");

    this.browser.on("disconnected", () => {
      console.log("🔴 Navegador foi fechado. Encerrando aplicação...");
      process.exit(0);
    });

    this.page.on("close", () => {
      console.log("🔴 Página do Teams foi fechada. Encerrando aplicação...");
      process.exit(0);
    });
  }

  async delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async getPagina() {
    return this.page;
  }

  async fechar() {
    if (this.browser) {
      await this.browser.close();
    }
  }
}

module.exports = BrowserService;
