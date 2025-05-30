const logArea = document.getElementById("log");
const btnLogin = document.getElementById("btnLogin");
const toggleBot = document.getElementById("toggleBot");
const statusTexto = document.getElementById("statusTexto");
const btnClearLog = document.getElementById("btnClearLog");
const logoImage = document.querySelector(".logo");

const mensagensPendentes = new Map();
let statusLi = null;

// Bot: ativar/desativar
toggleBot.addEventListener("change", () => {
  const time = getHoraAtual();

  if (!statusLi) {
    statusLi = document.createElement("li");
    statusLi.style.display = "flex";
    statusLi.style.alignItems = "center";
    logArea.appendChild(statusLi);
  }

  if (toggleBot.checked) {
    window.electronAPI.iniciarBot();
    window.electronAPI.verificarMensagensPendentes();
    statusTexto.textContent = "Bot ativado ✅";
    logoImage.src = "img/NicNicTrabalhando.png";

    // Limpa mensagens anteriores de status
    const linhasDeStatus = Array.from(logArea.querySelectorAll("li")).filter(li =>
      li.textContent.includes("Login manual iniciado") ||
      li.textContent.includes("Aguardando finalização do login") ||
      li.textContent.includes("Bot pronto para ser iniciado")
    );
    linhasDeStatus.forEach(li => li.remove());

    statusLi.innerHTML = `
      <span style="color: #00b894">🤖 Bot ativado manualmente.</span>
      <span style="color: #888; margin-left: auto;">às ${time}</span>
    `;
  } else {
    window.electronAPI.pararBot();
    statusTexto.textContent = "Bot desligado";
    logoImage.src = "img/NicNicDormindo.png";
    
    statusLi.innerHTML = `
      <span style="color: #e74c3c">🤖 Bot desativado manualmente.</span>
      <span style="color: #888; margin-left: auto;">às ${time}</span>
    `;
  }
});

// Login manual
btnLogin.addEventListener("click", () => {
  window.electronAPI.loginManual();
  adicionarLog("🔐 Login manual iniciado...");
});

// Resposta do login
window.electronAPI.onLoginStatus((_event, data) => {
  const time = getHoraAtual();
  const li = document.createElement("li");
  li.style.display = "flex";
  li.style.alignItems = "center";

  if (data.status === "sucesso") {
    li.innerHTML = `<span style="color: #00b894">✅ Bot pronto para ser iniciado.</span>
                    <span style="color: #888; margin-left: auto;">às ${time}</span>`;
  } else if (data.status === "erro") {
    li.innerHTML = `<span style="color: red">❌ Falha no login: ${data.mensagem}</span>
                    <span style="color: #888; margin-left: auto;">às ${time}</span>`;
  } else if (data.status === "iniciando") {
    li.innerHTML = `<span style="color: #2980b9">⌛ Aguardando finalização do login...</span>
                    <span style="color: #888; margin-left: auto;">às ${time}</span>`;
  }

  logArea.appendChild(li);
});

// Limpar log
btnClearLog.addEventListener("click", () => {
  while (logArea.firstChild) {
    logArea.removeChild(logArea.firstChild);
  }
  mensagensPendentes.clear(); // Limpar também o Map de mensagens pendentes
  statusLi = null;
});

// Utilitário
function getHoraAtual() {
  const now = new Date();
  return now.toLocaleTimeString('pt-BR', {
    hour: '2-digit',
    minute: '2-digit'
  });
}

function adicionarLog(texto) {
  const li = document.createElement("li");
  li.textContent = texto;
  logArea.appendChild(li);
}

// Nova mensagem não respondida
window.electronAPI.onMensagemNaoRespondida((_event, data) => {
  const { nome, mensagem, hora } = data;
  console.log(`📥 Recebido evento 'mensagem-nao-respondida': { nome: "${nome}", mensagem: "${mensagem}", hora: "${hora}" }`);

  // Verificar se a mensagem já existe no Map para evitar duplicatas
  const chave = `${nome}:${mensagem}`;
  if (mensagensPendentes.has(chave)) {
    console.log(`🔍 Mensagem pendente já existe: ${chave}. Ignorando.`);
    return;
  }

  mensagensPendentes.set(chave, { nome, mensagem, hora });

  const li = document.createElement("li");
  li.innerHTML = `📨 <b>Não respondida de ${nome}</b> às ${hora}: <span style="font-style: italic">"${mensagem}"</span>`;
  li.classList.add("nao-respondida");
  li.dataset.chave = chave; // Armazenar a chave para facilitar remoção

  const trash = document.createElement("button");
  trash.innerText = "🗑️";
  trash.style.marginLeft = "10px";
  trash.onclick = () => {
    li.remove();
    mensagensPendentes.delete(chave);
    const divider = li.nextElementSibling;
    if (divider && divider.tagName === "HR") divider.remove();
  };
  li.appendChild(trash);

  logArea.appendChild(li);

  const divider = document.createElement("hr");
  divider.style.border = "0";
  divider.style.borderTop = "1px dashed #ccc";
  divider.style.margin = "4px 0";
  logArea.appendChild(divider);
});

// Remover mensagem tratada
window.electronAPI.onRemoverMensagemPendente((_event, data) => {
  const { nome, mensagem } = data;
  const chave = `${nome}:${mensagem}`;
  console.log(`🗑️ Recebido evento 'remover-mensagem-pendente': { nome: "${nome}", mensagem: "${mensagem}" }`);

  const logItems = logArea.querySelectorAll("li.nao-respondida");
  logItems.forEach(li => {
    if (li.dataset.chave === chave) {
      const divider = li.nextElementSibling;
      li.remove();
      if (divider && divider.tagName === "HR") divider.remove();
      mensagensPendentes.delete(chave);
    }
  });
});