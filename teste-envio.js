const puppeteer = require("puppeteer-core");

(async () => {
  const browser = await puppeteer.launch({
    headless: false,
    executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe", // ou o caminho do seu Chrome
    args: ["--start-maximized"],
    defaultViewport: null
  });

  const page = await browser.newPage();
  await page.goto("https://teams.microsoft.com");
  console.log("⚠️ Faça login manualmente e aperte Enter aqui quando estiver no chat desejado.");

  process.stdin.once("data", async () => {
    const campo = await page.$('div[id^="new-message-"]');

    if (campo) {
      console.log("✅ Campo localizado");
      await page.evaluate(el => el.scrollIntoView(), campo);
      await campo.focus();
      await page.keyboard.type("Teste de envio pelo bot ✅", { delay: 20 });
      await page.keyboard.press("Enter");
      console.log("✅ Mensagem enviada");
    } else {
      console.warn("❌ Campo não encontrado");
    }

    // await browser.close(); // deixe comentado se quiser ver o resultado
  });
})();
