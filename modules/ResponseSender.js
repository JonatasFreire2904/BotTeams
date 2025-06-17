class ResponseSender {
  constructor(browserService) {
    this.browser = browserService;
  }

  async responder(ultima, resposta) {
    try {
      const page = await this.browser.getPagina();
      const campo = await page.$('div[id^="new-message-"]');

      if (campo) {
        await campo.focus();
        await this.browser.delay(300);
        await page.keyboard.type(resposta, { delay: 50 });
        await page.keyboard.press('Enter');
        return true; // ✅ sucesso
      }

      return false;
    } catch (e) {
      console.error("Erro ao enviar resposta:", e);
      return false;
    }
  }

}

module.exports = ResponseSender;
