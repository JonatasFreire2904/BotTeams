const express = require("express");
const path = require("path");
const open = require("open").default;
const { Bot } = require("./core/Bot");
const fs = require("fs");

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

// Endpoint to set the LLM prompt
app.post("/set-prompt", express.json(), (req, res) => {
  const { prompt } = req.body;
  if (typeof prompt !== "string") {
    return res.status(400).send("Prompt inválido");
  }
  try {
    fs.writeFileSync(path.join(__dirname, "prompt.txt"), prompt, "utf-8");
    res.sendStatus(200);
  } catch (err) {
    console.error("Erro ao salvar prompt.txt:", err);
    res.sendStatus(500);
  }
});

// Endpoint to get the current prompt
app.get("/get-prompt", (req, res) => {
  try {
    const promptPath = path.join(__dirname, "prompt.txt");
    let prompt = "";
    if (fs.existsSync(promptPath)) {
      prompt = fs.readFileSync(promptPath, "utf-8");
    }
    res.json({ prompt });
  } catch (err) {
    res.json({ prompt: "" });
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

app.post("/salvar-ip", express.json(), (req, res) => {
  const { host } = req.body;
  if (!host) return res.status(400).send("Host inválido");

  const caminho = path.join(__dirname, "llm_config.json");
  fs.writeFileSync(caminho, JSON.stringify({ host }, null, 2), "utf8");
  res.send("IP salvo");
});

// app.get("/resumo-bloqueadas", (req, res) => {
//   res.json(
//     [...bot.respostasBloqueadasPorChat.entries()].map(
//       ([nome, qtd]) => `${nome} (${qtd})`
//     )
//   );
// });

