const STORAGE_KEY = "chatDockSettings.v1";
const MAX_ROWS = 120;
const CHAT_SCALE_MIN = 0.8;
const CHAT_SCALE_MAX = 1.8;
const CHAT_SCALE_STEP = 0.1;
const TRANSPARENCY_MIN = 0;
const TRANSPARENCY_MAX = 80;
const DOCK_MIN_WIDTH = 380;
const DOCK_MIN_HEIGHT = 240;

const clientApi = window.chatDockClient && typeof window.chatDockClient === "object"
  ? window.chatDockClient
  : null;

const elements = {
  dock: document.querySelector(".dock"),
  host: document.getElementById("host"),
  port: document.getElementById("port"),
  token: document.getElementById("token"),
  settingsBtn: document.getElementById("settingsBtn"),
  closeBtn: document.getElementById("closeBtn"),
  connectBtn: document.getElementById("connectBtn"),
  clearBtn: document.getElementById("clearBtn"),
  fontDownBtn: document.getElementById("fontDownBtn"),
  fontUpBtn: document.getElementById("fontUpBtn"),
  zoomValue: document.getElementById("zoomValue"),
  transparencyRange: document.getElementById("transparencyRange"),
  transparencyValue: document.getElementById("transparencyValue"),
  showTimestampToggle: document.getElementById("showTimestampToggle"),
  status: document.getElementById("status"),
  messages: document.getElementById("messages"),
  resizeGrip: document.getElementById("resizeGrip"),
};

const state = {
  connectionState: "disconnected",
  settingsOpen: false,
  chatScale: 1,
  transparencyPercent: 0,
  showTimestamp: true,
  resizing: false,
  resizeStartX: 0,
  resizeStartY: 0,
  resizeStartWidth: 0,
  resizeStartHeight: 0,
  unsubscribers: [],
};

function loadSettings() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return typeof parsed === "object" && parsed ? parsed : {};
  } catch {
    return {};
  }
}

function readUrlSettings() {
  const query = new URLSearchParams(window.location.search || "");
  const rawPort = Math.floor(Number(query.get("port") || 0));
  const hasPort = Number.isFinite(rawPort) && rawPort > 0;
  return {
    host: String(query.get("host") || "").trim(),
    port: hasPort ? Math.max(1, Math.min(65535, rawPort)) : null,
    token: String(query.get("token") || "").trim(),
    autoConnect:
      query.get("autoconnect") === "1" ||
      String(query.get("autoconnect") || "").toLowerCase() === "true",
  };
}

function saveSettings() {
  const next = {
    host: String(elements.host.value || "").trim(),
    port: Math.max(1, Math.min(65535, Math.floor(Number(elements.port.value || 5443)))),
    token: String(elements.token.value || "").trim(),
    chatScale: state.chatScale,
    transparencyPercent: state.transparencyPercent,
    showTimestamp: state.showTimestamp,
  };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function setSettingsVisibility(open) {
  state.settingsOpen = !!open;
  if (elements.dock) {
    elements.dock.classList.toggle("show-settings", state.settingsOpen);
  }
  if (elements.settingsBtn) {
    elements.settingsBtn.textContent = state.settingsOpen ? "x" : "⚙";
    elements.settingsBtn.title = state.settingsOpen ? "Ocultar configuracoes" : "Configuracoes";
  }
}

function applyChatPreferences() {
  const scale = clamp(Number(state.chatScale || 1), CHAT_SCALE_MIN, CHAT_SCALE_MAX);
  const transparencyPercent = clamp(
    Number(state.transparencyPercent || 0),
    TRANSPARENCY_MIN,
    TRANSPARENCY_MAX,
  );
  const surfaceAlpha = clamp((100 - transparencyPercent) / 100, 0.2, 1);
  const chatFontSizePx = Math.round(12 * scale);
  const timeColumnWidthPx = Math.round(56 * scale);

  if (elements.dock) {
    elements.dock.style.setProperty("--surface-alpha", String(surfaceAlpha));
    elements.dock.style.setProperty("--chat-font-size", `${chatFontSizePx}px`);
    elements.dock.style.setProperty("--time-column-width", `${timeColumnWidthPx}px`);
    elements.dock.classList.toggle("hide-timestamp", !state.showTimestamp);
  }

  if (elements.zoomValue) {
    elements.zoomValue.textContent = `${Math.round(scale * 100)}%`;
  }
  if (elements.transparencyValue) {
    elements.transparencyValue.textContent = `${Math.round(transparencyPercent)}%`;
  }
  if (elements.fontDownBtn) {
    elements.fontDownBtn.disabled = scale <= CHAT_SCALE_MIN;
  }
  if (elements.fontUpBtn) {
    elements.fontUpBtn.disabled = scale >= CHAT_SCALE_MAX;
  }
  if (elements.transparencyRange) {
    elements.transparencyRange.value = String(Math.round(transparencyPercent));
  }
  if (elements.showTimestampToggle) {
    elements.showTimestampToggle.checked = !!state.showTimestamp;
  }
}

function setChatScale(nextScale) {
  state.chatScale = clamp(
    Math.round(nextScale * 10) / 10,
    CHAT_SCALE_MIN,
    CHAT_SCALE_MAX,
  );
  applyChatPreferences();
  saveSettings();
}

function setShowTimestamp(show) {
  state.showTimestamp = !!show;
  applyChatPreferences();
  saveSettings();
}

function setTransparencyPercent(nextPercent) {
  state.transparencyPercent = clamp(
    Math.round(nextPercent),
    TRANSPARENCY_MIN,
    TRANSPARENCY_MAX,
  );
  applyChatPreferences();
  saveSettings();
}

function onResizePointerMove(event) {
  if (!state.resizing) return;
  const dx = event.clientX - state.resizeStartX;
  const dy = event.clientY - state.resizeStartY;
  const nextWidth = Math.max(DOCK_MIN_WIDTH, Math.floor(state.resizeStartWidth + dx));
  const nextHeight = Math.max(DOCK_MIN_HEIGHT, Math.floor(state.resizeStartHeight + dy));
  window.resizeTo(nextWidth, nextHeight);
}

function stopManualResize() {
  if (!state.resizing) return;
  state.resizing = false;
  window.removeEventListener("pointermove", onResizePointerMove);
  window.removeEventListener("pointerup", stopManualResize);
  window.removeEventListener("pointercancel", stopManualResize);
  if (document.body) {
    document.body.style.cursor = "";
    document.body.style.userSelect = "";
  }
}

function startManualResize(event) {
  event.preventDefault();
  event.stopPropagation();
  state.resizing = true;
  state.resizeStartX = event.clientX;
  state.resizeStartY = event.clientY;
  state.resizeStartWidth = window.outerWidth;
  state.resizeStartHeight = window.outerHeight;

  if (event.target && typeof event.target.setPointerCapture === "function") {
    try {
      event.target.setPointerCapture(event.pointerId);
    } catch {}
  }

  if (document.body) {
    document.body.style.cursor = "nwse-resize";
    document.body.style.userSelect = "none";
  }

  window.addEventListener("pointermove", onResizePointerMove);
  window.addEventListener("pointerup", stopManualResize);
  window.addEventListener("pointercancel", stopManualResize);
}

function setStatus(label, kind) {
  elements.status.textContent = label;
  elements.status.className = `status ${kind || ""}`.trim();
}

function nowTimeLabel() {
  return new Date().toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
}

function appendRow(text, { author = "", system = false } = {}) {
  const row = document.createElement("li");
  row.className = `row${system ? " system" : ""}`;

  const time = document.createElement("div");
  time.className = "time";
  time.textContent = nowTimeLabel();

  const msg = document.createElement("div");
  msg.className = "msg";

  if (author) {
    const name = document.createElement("span");
    name.className = "author";
    name.textContent = `${author}:`;
    msg.appendChild(name);
  }

  const content = document.createElement("span");
  content.textContent = text;
  msg.appendChild(content);

  row.appendChild(time);
  row.appendChild(msg);

  const nearBottom =
    elements.messages.scrollTop + elements.messages.clientHeight >=
    elements.messages.scrollHeight - 20;

  elements.messages.appendChild(row);
  while (elements.messages.childElementCount > MAX_ROWS) {
    elements.messages.removeChild(elements.messages.firstElementChild);
  }

  if (nearBottom) {
    elements.messages.scrollTop = elements.messages.scrollHeight;
  }
}

function isClientBusy() {
  return state.connectionState !== "disconnected" && state.connectionState !== "error";
}

function applyStatusSnapshot(snapshot) {
  const nextState = String(snapshot?.state || "disconnected");
  state.connectionState = nextState;

  if (nextState === "connected") {
    setStatus("Conectado", "ok");
    elements.connectBtn.textContent = "Desconectar";
    return;
  }

  if (nextState === "error") {
    setStatus("Erro de rede", "err");
    elements.connectBtn.textContent = "Conectar";
    return;
  }

  if (nextState === "authenticating") {
    setStatus("Autenticando...", "warn");
    elements.connectBtn.textContent = "Desconectar";
    return;
  }

  if (nextState === "binding") {
    setStatus("Vinculando sessao...", "warn");
    elements.connectBtn.textContent = "Desconectar";
    return;
  }

  if (nextState === "socket-open") {
    setStatus("Socket aberto", "warn");
    elements.connectBtn.textContent = "Desconectar";
    return;
  }

  if (nextState === "connecting") {
    setStatus("Conectando...", "warn");
    elements.connectBtn.textContent = "Desconectar";
    return;
  }

  setStatus("Desconectado", "warn");
  elements.connectBtn.textContent = "Conectar";
}

function registerClientListeners() {
  if (!clientApi) return;

  if (typeof clientApi.onStatus === "function") {
    state.unsubscribers.push(clientApi.onStatus((snapshot) => {
      applyStatusSnapshot(snapshot);
    }));
  }

  if (typeof clientApi.onSystem === "function") {
    state.unsubscribers.push(clientApi.onSystem((event) => {
      const message = String(event?.message || "").trim();
      if (!message) return;
      appendRow(message, { system: true });
    }));
  }

  if (typeof clientApi.onChat === "function") {
    state.unsubscribers.push(clientApi.onChat((event) => {
      const author = String(event?.author || "").trim() || "desconhecido";
      const message = String(event?.message || "").trim();
      if (!message) return;
      appendRow(message, { author });
    }));
  }

  if (typeof clientApi.onError === "function") {
    state.unsubscribers.push(clientApi.onError((event) => {
      const message = String(event?.message || "").trim();
      if (!message) return;
      appendRow(message, { system: true });
    }));
  }
}

async function disconnect({ silent = false } = {}) {
  if (!clientApi || typeof clientApi.disconnect !== "function") {
    applyStatusSnapshot({ state: "disconnected" });
    return;
  }

  try {
    await clientApi.disconnect({ silent: !!silent });
  } catch {}

  if (silent) {
    applyStatusSnapshot({ state: "disconnected" });
  }
}

async function connect() {
  if (!clientApi || typeof clientApi.connect !== "function") {
    setStatus("Cliente indisponivel", "err");
    appendRow("Cliente de chat indisponivel nesta janela.", { system: true });
    return;
  }

  if (isClientBusy()) {
    await disconnect({ silent: true });
    return;
  }

  let options = null;
  let wsUrl = "";

  try {
    options = clientApi.sanitizeConnectionOptions({
      host: String(elements.host.value || "").trim(),
      port: Number(elements.port.value || 5443),
      token: String(elements.token.value || "").trim(),
      protocol: "xmpp",
    });

    wsUrl = clientApi.buildWsUrl(options);
  } catch (error) {
    setStatus("Config invalida", "err");
    setSettingsVisibility(true);
    appendRow(String(error?.message || error), { system: true });
    return;
  }

  saveSettings();

  try {
    await clientApi.connect(options);
  } catch (error) {
    setStatus("Erro de rede", "err");
    appendRow(String(error?.message || error), { system: true });
    applyStatusSnapshot({ state: "error" });
    return;
  }

  if (wsUrl) {
    appendRow(`Conectado em ${wsUrl}`, { system: true });
  }
}

function bootstrap() {
  const saved = loadSettings();
  const fromUrl = readUrlSettings();

  elements.host.value = String(fromUrl.host || saved.host || "127.0.0.1");
  elements.port.value = String(fromUrl.port || saved.port || 5443);
  elements.token.value = String(fromUrl.token || saved.token || "");
  state.chatScale = clamp(Number(saved.chatScale || 1), CHAT_SCALE_MIN, CHAT_SCALE_MAX);
  state.transparencyPercent = clamp(
    Number(saved.transparencyPercent || 0),
    TRANSPARENCY_MIN,
    TRANSPARENCY_MAX,
  );
  state.showTimestamp = typeof saved.showTimestamp === "boolean" ? saved.showTimestamp : true;
  applyChatPreferences();
  registerClientListeners();

  elements.connectBtn.addEventListener("click", () => {
    connect().catch((error) => {
      appendRow(String(error?.message || error), { system: true });
    });
  });
  elements.settingsBtn.addEventListener("click", () => {
    setSettingsVisibility(!state.settingsOpen);
  });
  elements.closeBtn.addEventListener("click", () => {
    window.close();
  });
  elements.clearBtn.addEventListener("click", () => {
    elements.messages.innerHTML = "";
  });
  elements.fontDownBtn.addEventListener("click", () => {
    setChatScale(state.chatScale - CHAT_SCALE_STEP);
  });
  elements.fontUpBtn.addEventListener("click", () => {
    setChatScale(state.chatScale + CHAT_SCALE_STEP);
  });
  elements.transparencyRange.addEventListener("input", (event) => {
    setTransparencyPercent(Number(event.target.value));
  });
  elements.showTimestampToggle.addEventListener("change", (event) => {
    setShowTimestamp(!!event.target.checked);
  });
  elements.resizeGrip.addEventListener("pointerdown", startManualResize);

  window.addEventListener("beforeunload", () => {
    stopManualResize();
    disconnect({ silent: true });

    while (state.unsubscribers.length > 0) {
      const unsubscribe = state.unsubscribers.pop();
      try {
        unsubscribe();
      } catch {}
    }
  });

  appendRow("Dock pronto. Use o botao de configuracoes (⚙) para editar conexao.", { system: true });
  setSettingsVisibility(false);

  if (fromUrl.autoConnect && String(elements.token.value || "").trim()) {
    setTimeout(() => {
      if (isClientBusy()) return;
      connect().catch((error) => {
        appendRow(String(error?.message || error), { system: true });
      });
    }, 500);
  }
}

bootstrap();
