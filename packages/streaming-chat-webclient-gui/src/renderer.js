const STORAGE_KEY = "chatDockSettings.v1";
const MAX_ROWS = 120;
const CHAT_SCALE_MIN = 0.8;
const CHAT_SCALE_MAX = 1.8;
const CHAT_SCALE_STEP = 0.1;
const TRANSPARENCY_MIN = 0;
const TRANSPARENCY_MAX = 80;
const DOCK_MIN_WIDTH = 380;
const DOCK_MIN_HEIGHT = 240;
const FALLBACK_LOCALE = "en";

const TRANSLATIONS = {
  en: {
    appTitle: "Chat Dock",
    actionSettings: "Settings",
    actionHideSettings: "Hide settings",
    actionClose: "Close",
    actionClearMessages: "Clear messages",
    actionConnect: "Connect",
    actionDisconnect: "Disconnect",
    labelZoom: "Chat zoom",
    labelTransparency: "Transparency",
    labelShowTimestamp: "Show timestamp",
    labelLanguage: "Language",
    languageEnglish: "English",
    languagePortuguese: "Portuguese",
    placeholderHost: "Host (127.0.0.1)",
    placeholderPort: "Port",
    placeholderToken: "Token",
    tooltipFontDown: "Decrease",
    tooltipFontUp: "Increase",
    tooltipResize: "Resize",
    statusDisconnected: "Disconnected",
    statusConnected: "Connected",
    statusNetworkError: "Network error",
    statusAuthenticating: "Authenticating...",
    statusBinding: "Binding session...",
    statusSocketOpen: "Socket open",
    statusConnecting: "Connecting...",
    statusInvalidConfig: "Invalid config",
    statusClientUnavailable: "Client unavailable",
    systemReady: "Dock ready. Use settings (⚙) to edit connection.",
    systemClientUnavailable: "Chat client is unavailable in this window.",
    systemConnectingTo: "Connecting to {url}",
    systemDisconnected: "Disconnected.",
    systemAuthenticating: "Authenticating...",
    systemBindingSession: "Binding session...",
    systemAuthenticated: "Authenticated.",
    systemConnectedToChat: "Connected to chat.",
    systemSocketClosed: "Socket closed ({code}).",
    systemWebSocketError: "WebSocket error.",
    systemConnectedTo: "Connected to {url}",
    errorTokenRequired: "Token is required.",
    errorSocketCreateFailed: "Failed to create WebSocket.",
    errorSocketClosed: "Socket closed ({code}).",
    errorWebSocketError: "WebSocket error.",
    errorUnknown: "Unknown error.",
    unknownAuthor: "unknown",
  },
  "pt-BR": {
    appTitle: "Chat Dock",
    actionSettings: "Configuracoes",
    actionHideSettings: "Ocultar configuracoes",
    actionClose: "Fechar",
    actionClearMessages: "Limpar mensagens",
    actionConnect: "Conectar",
    actionDisconnect: "Desconectar",
    labelZoom: "Zoom chat",
    labelTransparency: "Transparencia",
    labelShowTimestamp: "Mostrar horario",
    labelLanguage: "Idioma",
    languageEnglish: "Ingles",
    languagePortuguese: "Portugues",
    placeholderHost: "Host (127.0.0.1)",
    placeholderPort: "Porta",
    placeholderToken: "Token",
    tooltipFontDown: "Diminuir",
    tooltipFontUp: "Aumentar",
    tooltipResize: "Redimensionar",
    statusDisconnected: "Desconectado",
    statusConnected: "Conectado",
    statusNetworkError: "Erro de rede",
    statusAuthenticating: "Autenticando...",
    statusBinding: "Vinculando sessao...",
    statusSocketOpen: "Socket aberto",
    statusConnecting: "Conectando...",
    statusInvalidConfig: "Config invalida",
    statusClientUnavailable: "Cliente indisponivel",
    systemReady: "Dock pronto. Use o botao de configuracoes (⚙) para editar conexao.",
    systemClientUnavailable: "Cliente de chat indisponivel nesta janela.",
    systemConnectingTo: "Conectando em {url}",
    systemDisconnected: "Desconectado.",
    systemAuthenticating: "Autenticando...",
    systemBindingSession: "Vinculando sessao...",
    systemAuthenticated: "Autenticado.",
    systemConnectedToChat: "Conectado ao chat.",
    systemSocketClosed: "Socket fechado ({code}).",
    systemWebSocketError: "Erro de websocket.",
    systemConnectedTo: "Conectado em {url}",
    errorTokenRequired: "Token obrigatorio.",
    errorSocketCreateFailed: "Falha ao criar socket.",
    errorSocketClosed: "Socket fechado ({code}).",
    errorWebSocketError: "Erro de websocket.",
    errorUnknown: "Erro desconhecido.",
    unknownAuthor: "desconhecido",
  },
};

const clientApi = window.chatDockClient && typeof window.chatDockClient === "object"
  ? window.chatDockClient
  : null;

const DEFAULT_SYSTEM_CODES = {
  CONNECTING: "system.connecting",
  DISCONNECTED: "system.disconnected",
  AUTHENTICATING: "system.authenticating",
  BINDING_SESSION: "system.binding_session",
  AUTHENTICATED: "system.authenticated",
  CONNECTED_TO_CHAT: "system.connected_to_chat",
  SOCKET_CLOSED: "system.socket_closed",
  WEBSOCKET_ERROR: "system.websocket_error",
};

const DEFAULT_ERROR_CODES = {
  TOKEN_REQUIRED: "error.token_required",
  SOCKET_CREATE_FAILED: "error.socket_create_failed",
  SOCKET_CLOSED: "error.socket_closed",
  WEBSOCKET_ERROR: "error.websocket_error",
  UNKNOWN: "error.unknown",
};

const SYSTEM_CODES = {
  ...DEFAULT_SYSTEM_CODES,
  ...((clientApi && clientApi.codes && clientApi.codes.system) || {}),
};

const ERROR_CODES = {
  ...DEFAULT_ERROR_CODES,
  ...((clientApi && clientApi.codes && clientApi.codes.error) || {}),
};

const SYSTEM_CODE_TO_TRANSLATION_KEY = {
  [SYSTEM_CODES.CONNECTING]: "systemConnectingTo",
  [SYSTEM_CODES.DISCONNECTED]: "systemDisconnected",
  [SYSTEM_CODES.AUTHENTICATING]: "systemAuthenticating",
  [SYSTEM_CODES.BINDING_SESSION]: "systemBindingSession",
  [SYSTEM_CODES.AUTHENTICATED]: "systemAuthenticated",
  [SYSTEM_CODES.CONNECTED_TO_CHAT]: "systemConnectedToChat",
  [SYSTEM_CODES.SOCKET_CLOSED]: "systemSocketClosed",
  [SYSTEM_CODES.WEBSOCKET_ERROR]: "systemWebSocketError",
};

const ERROR_CODE_TO_TRANSLATION_KEY = {
  [ERROR_CODES.TOKEN_REQUIRED]: "errorTokenRequired",
  [ERROR_CODES.SOCKET_CREATE_FAILED]: "errorSocketCreateFailed",
  [ERROR_CODES.SOCKET_CLOSED]: "errorSocketClosed",
  [ERROR_CODES.WEBSOCKET_ERROR]: "errorWebSocketError",
  [ERROR_CODES.UNKNOWN]: "errorUnknown",
};

const elements = {
  dock: document.querySelector(".dock"),
  titleText: document.getElementById("titleText"),
  host: document.getElementById("host"),
  port: document.getElementById("port"),
  token: document.getElementById("token"),
  settingsBtn: document.getElementById("settingsBtn"),
  closeBtn: document.getElementById("closeBtn"),
  connectBtn: document.getElementById("connectBtn"),
  clearBtn: document.getElementById("clearBtn"),
  fontDownBtn: document.getElementById("fontDownBtn"),
  fontUpBtn: document.getElementById("fontUpBtn"),
  zoomLabel: document.getElementById("zoomLabel"),
  zoomValue: document.getElementById("zoomValue"),
  transparencyLabel: document.getElementById("transparencyLabel"),
  transparencyRange: document.getElementById("transparencyRange"),
  transparencyValue: document.getElementById("transparencyValue"),
  languageLabel: document.getElementById("languageLabel"),
  languageSelect: document.getElementById("languageSelect"),
  showTimestampToggle: document.getElementById("showTimestampToggle"),
  showTimestampLabel: document.getElementById("showTimestampLabel"),
  status: document.getElementById("status"),
  messages: document.getElementById("messages"),
  resizeGrip: document.getElementById("resizeGrip"),
};

const state = {
  connectionState: "disconnected",
  settingsOpen: false,
  locale: FALLBACK_LOCALE,
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
    lang: String(query.get("lang") || "").trim(),
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
    locale: state.locale,
    chatScale: state.chatScale,
    transparencyPercent: state.transparencyPercent,
    showTimestamp: state.showTimestamp,
  };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function asObject(value, fallback = {}) {
  return value && typeof value === "object" ? value : fallback;
}

function asString(value, fallback = "") {
  const text = String(value ?? fallback);
  return text === "undefined" || text === "null" ? fallback : text;
}

function normalizeTemplateVars(args) {
  const values = asObject(args, {});
  const normalized = {};

  for (const [key, value] of Object.entries(values)) {
    normalized[key] = asString(value, "");
  }

  return normalized;
}

function normalizeLocale(value) {
  const raw = String(value || "").trim().toLowerCase();
  if (!raw) return FALLBACK_LOCALE;
  if (raw.startsWith("pt")) return "pt-BR";
  if (raw.startsWith("en")) return "en";
  return FALLBACK_LOCALE;
}

function t(key, vars = {}) {
  const localeTable = TRANSLATIONS[state.locale] || TRANSLATIONS[FALLBACK_LOCALE];
  const fallbackTable = TRANSLATIONS[FALLBACK_LOCALE];
  const template = localeTable?.[key] || fallbackTable?.[key] || key;

  return String(template).replace(/\{([a-zA-Z0-9_]+)\}/g, (match, token) => (
    Object.prototype.hasOwnProperty.call(vars, token) ? String(vars[token]) : match
  ));
}

function renderSystemMessage(event) {
  const code = asString(event?.code, "").trim();
  const translationKey = SYSTEM_CODE_TO_TRANSLATION_KEY[code];
  if (translationKey) {
    return t(translationKey, normalizeTemplateVars(event?.args));
  }

  const message = asString(event?.message, "").trim();
  if (!message) return code;

  const messageTranslationKey = SYSTEM_CODE_TO_TRANSLATION_KEY[message];
  if (messageTranslationKey) {
    return t(messageTranslationKey, normalizeTemplateVars(event?.args));
  }

  return message;
}

function renderErrorMessage(errorLike) {
  const code = asString(errorLike?.code, "").trim();
  const translationKey = ERROR_CODE_TO_TRANSLATION_KEY[code];
  if (translationKey) {
    return t(translationKey, normalizeTemplateVars(errorLike?.args));
  }

  const message = asString(errorLike?.message ?? errorLike, "").trim();
  if (!message) {
    return t("errorUnknown");
  }

  const messageTranslationKey = ERROR_CODE_TO_TRANSLATION_KEY[message];
  if (messageTranslationKey) {
    return t(messageTranslationKey, normalizeTemplateVars(errorLike?.args));
  }

  return message;
}

function applyLocaleToUi() {
  document.title = t("appTitle");
  document.documentElement.lang = state.locale;

  if (elements.titleText) elements.titleText.textContent = t("appTitle");
  if (elements.host) elements.host.placeholder = t("placeholderHost");
  if (elements.port) elements.port.placeholder = t("placeholderPort");
  if (elements.token) elements.token.placeholder = t("placeholderToken");
  if (elements.zoomLabel) elements.zoomLabel.textContent = t("labelZoom");
  if (elements.transparencyLabel) elements.transparencyLabel.textContent = t("labelTransparency");
  if (elements.languageLabel) elements.languageLabel.textContent = t("labelLanguage");
  if (elements.showTimestampLabel) elements.showTimestampLabel.textContent = t("labelShowTimestamp");
  if (elements.settingsBtn) {
    elements.settingsBtn.title = state.settingsOpen ? t("actionHideSettings") : t("actionSettings");
  }
  if (elements.closeBtn) elements.closeBtn.title = t("actionClose");
  if (elements.clearBtn) elements.clearBtn.title = t("actionClearMessages");
  if (elements.fontDownBtn) elements.fontDownBtn.title = t("tooltipFontDown");
  if (elements.fontUpBtn) elements.fontUpBtn.title = t("tooltipFontUp");
  if (elements.resizeGrip) elements.resizeGrip.title = t("tooltipResize");

  if (elements.languageSelect) {
    const englishOption = elements.languageSelect.querySelector("option[value='en']");
    const portugueseOption = elements.languageSelect.querySelector("option[value='pt-BR']");
    if (englishOption) englishOption.textContent = t("languageEnglish");
    if (portugueseOption) portugueseOption.textContent = t("languagePortuguese");
    elements.languageSelect.value = state.locale;
  }
}

function setLocale(locale, { persist = true } = {}) {
  state.locale = normalizeLocale(locale);
  applyLocaleToUi();
  applyStatusSnapshot({ state: state.connectionState });
  if (persist) {
    saveSettings();
  }
}

function setSettingsVisibility(open) {
  state.settingsOpen = !!open;
  if (elements.dock) {
    elements.dock.classList.toggle("show-settings", state.settingsOpen);
  }
  if (elements.settingsBtn) {
    elements.settingsBtn.textContent = state.settingsOpen ? "x" : "⚙";
    elements.settingsBtn.title = state.settingsOpen ? t("actionHideSettings") : t("actionSettings");
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
  return new Date().toLocaleTimeString(state.locale, {
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
    setStatus(t("statusConnected"), "ok");
    elements.connectBtn.textContent = t("actionDisconnect");
    return;
  }

  if (nextState === "error") {
    setStatus(t("statusNetworkError"), "err");
    elements.connectBtn.textContent = t("actionConnect");
    return;
  }

  if (nextState === "authenticating") {
    setStatus(t("statusAuthenticating"), "warn");
    elements.connectBtn.textContent = t("actionDisconnect");
    return;
  }

  if (nextState === "binding") {
    setStatus(t("statusBinding"), "warn");
    elements.connectBtn.textContent = t("actionDisconnect");
    return;
  }

  if (nextState === "socket-open") {
    setStatus(t("statusSocketOpen"), "warn");
    elements.connectBtn.textContent = t("actionDisconnect");
    return;
  }

  if (nextState === "connecting") {
    setStatus(t("statusConnecting"), "warn");
    elements.connectBtn.textContent = t("actionDisconnect");
    return;
  }

  setStatus(t("statusDisconnected"), "warn");
  elements.connectBtn.textContent = t("actionConnect");
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
      const message = renderSystemMessage(event);
      if (!message) return;
      appendRow(message, { system: true });
    }));
  }

  if (typeof clientApi.onChat === "function") {
    state.unsubscribers.push(clientApi.onChat((event) => {
      const rawAuthor = String(event?.author || "").trim();
      const author = !rawAuthor || rawAuthor.toLowerCase() === "unknown"
        ? t("unknownAuthor")
        : rawAuthor;
      const message = String(event?.message || "").trim();
      if (!message) return;
      appendRow(message, { author });
    }));
  }

  if (typeof clientApi.onError === "function") {
    state.unsubscribers.push(clientApi.onError((event) => {
      const message = renderErrorMessage(event);
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
    setStatus(t("statusClientUnavailable"), "err");
    appendRow(t("systemClientUnavailable"), { system: true });
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
    setStatus(t("statusInvalidConfig"), "err");
    setSettingsVisibility(true);
    appendRow(renderErrorMessage(error), { system: true });
    return;
  }

  saveSettings();

  try {
    await clientApi.connect(options);
  } catch (error) {
    setStatus(t("statusNetworkError"), "err");
    appendRow(renderErrorMessage(error), { system: true });
    applyStatusSnapshot({ state: "error" });
    return;
  }

  if (wsUrl) {
    appendRow(t("systemConnectedTo", { url: wsUrl }), { system: true });
  }
}

function bootstrap() {
  const saved = loadSettings();
  const fromUrl = readUrlSettings();
  const browserLocale = Array.isArray(navigator.languages) && navigator.languages.length > 0
    ? navigator.languages[0]
    : navigator.language;

  elements.host.value = String(fromUrl.host || saved.host || "127.0.0.1");
  elements.port.value = String(fromUrl.port || saved.port || 5443);
  elements.token.value = String(fromUrl.token || saved.token || "");
  state.locale = normalizeLocale(fromUrl.lang || saved.locale || browserLocale || FALLBACK_LOCALE);
  state.chatScale = clamp(Number(saved.chatScale || 1), CHAT_SCALE_MIN, CHAT_SCALE_MAX);
  state.transparencyPercent = clamp(
    Number(saved.transparencyPercent || 0),
    TRANSPARENCY_MIN,
    TRANSPARENCY_MAX,
  );
  state.showTimestamp = typeof saved.showTimestamp === "boolean" ? saved.showTimestamp : true;
  applyLocaleToUi();
  applyStatusSnapshot({ state: state.connectionState });
  applyChatPreferences();
  registerClientListeners();

  elements.connectBtn.addEventListener("click", () => {
    connect().catch((error) => {
      appendRow(renderErrorMessage(error), { system: true });
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
  elements.languageSelect.addEventListener("change", (event) => {
    setLocale(String(event.target.value || FALLBACK_LOCALE));
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

  appendRow(t("systemReady"), { system: true });
  setSettingsVisibility(false);

  if (fromUrl.autoConnect && String(elements.token.value || "").trim()) {
    setTimeout(() => {
      if (isClientBusy()) return;
      connect().catch((error) => {
        appendRow(renderErrorMessage(error), { system: true });
      });
    }, 500);
  }
}

bootstrap();
