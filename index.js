const express = require("express");
const path = require("path");
const open = require("open").default;
const { Bot } = require("./core/Bot");

const app = express();
const port = 3000;

// Bot deve ser instanciado fora para reutilização nas rotas
const bot = new Bot();

app.use(express.static(__dirname));

// Página principal
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

// Endpoint para iniciar o login no Teams
app.post("/login", async (req, res) => {
  try {
    await bot.browserService.iniciarComLoginManual();
    console.log("🔐 Login manual iniciado.");
    res.sendStatus(200);
  } catch (err) {
    console.error("❌ Erro ao iniciar login:", err);
    res.sendStatus(500);
  }
});

// Endpoint para iniciar o bot
app.post("/start-bot", async (req, res) => {
  try {
    await bot.monitorarMensagens();
    console.log("✅ Bot iniciado.");
    res.sendStatus(200);
  } catch (err) {
    console.error("❌ Erro ao iniciar o bot:", err);
    res.sendStatus(500);
  }
});

// Endpoint para parar o bot
app.post("/stop-bot", (req, res) => {
  try {
    bot.pararMonitoramento();
    console.log("🛑 Bot parado.");
    res.sendStatus(200);
  } catch (err) {
    console.error("❌ Erro ao parar o bot:", err);
    res.sendStatus(500);
  }
});

// Iniciar servidor e abrir interface
app.listen(port, () => {
  console.log(`🔵 Interface disponível em http://localhost:${port}`);
  open(`http://localhost:${port}`);
});

app.get("/resumo", (req, res) => {
  res.json(bot.getResumoRespostas());
});
