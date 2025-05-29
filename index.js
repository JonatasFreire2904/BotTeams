const puppeteer = require("puppeteer");
const { TeamsClient } = require("./src/infra/puppeteer/TeamsClient");
const { DefaultHandler } = require("./src/handlers/DefaultHandler");
const { BotService } = require("./src/app/BotService");

(async () => {
  const browser = await puppeteer.launch({
    headless: false,
    defaultViewport: null,
    args: ["--start-maximized"],
  });

  const page = await browser.newPage();
  await page.goto("https://teams.microsoft.com");

  const client = new TeamsClient(page);
  const bot = new BotService(client, new DefaultHandler());
  await bot.init();
})();
