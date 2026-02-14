#!/usr/bin/env node

const {
  createStreamingChatWebClient,
  STATUS_DETAIL_CODES,
  SYSTEM_EVENT_CODES,
  ERROR_EVENT_CODES,
} = require("@reino-doce/streaming-chat-webclient");
const {
  parseArgs,
  resolveConnectOptions,
} = require("./config.cjs");

const VERBOSITY_WEIGHTS = {
  error: 0,
  warn: 1,
  chat: 2,
  debug: 3,
};

const STATUS_TEXT_EN = Object.freeze({
  [STATUS_DETAIL_CODES.DISCONNECTED]: "Disconnected",
  [STATUS_DETAIL_CODES.CONNECTING]: "Connecting...",
  [STATUS_DETAIL_CODES.SOCKET_OPEN]: "Socket open.",
  [STATUS_DETAIL_CODES.WAITING_AUTHENTICATION]: "Waiting for authentication...",
  [STATUS_DETAIL_CODES.WAITING_BINDING]: "Waiting for session bind...",
  [STATUS_DETAIL_CODES.SESSION_BOUND]: "Session bound.",
  [STATUS_DETAIL_CODES.SOCKET_CREATE_FAILED]: "Failed to create WebSocket.",
  [STATUS_DETAIL_CODES.SOCKET_CLOSED]: "Socket closed ({code}).",
  [STATUS_DETAIL_CODES.WEBSOCKET_ERROR]: "WebSocket error.",
});

const SYSTEM_TEXT_EN = Object.freeze({
  [SYSTEM_EVENT_CODES.CONNECTING]: "Connecting to {url}",
  [SYSTEM_EVENT_CODES.DISCONNECTED]: "Disconnected.",
  [SYSTEM_EVENT_CODES.AUTHENTICATING]: "Authenticating...",
  [SYSTEM_EVENT_CODES.BINDING_SESSION]: "Binding session...",
  [SYSTEM_EVENT_CODES.AUTHENTICATED]: "Authenticated.",
  [SYSTEM_EVENT_CODES.CONNECTED_TO_CHAT]: "Connected to chat.",
  [SYSTEM_EVENT_CODES.SOCKET_CLOSED]: "Socket closed ({code}).",
  [SYSTEM_EVENT_CODES.WEBSOCKET_ERROR]: "WebSocket error.",
});

const ERROR_TEXT_EN = Object.freeze({
  [ERROR_EVENT_CODES.TOKEN_REQUIRED]: "Token is required.",
  [ERROR_EVENT_CODES.SOCKET_CREATE_FAILED]: "Failed to create WebSocket.",
  [ERROR_EVENT_CODES.SOCKET_CLOSED]: "Socket closed ({code}).",
  [ERROR_EVENT_CODES.WEBSOCKET_ERROR]: "WebSocket error.",
  [ERROR_EVENT_CODES.UNKNOWN]: "Unknown error.",
});

function asString(value, fallback = "") {
  const text = String(value ?? fallback);
  return text === "undefined" || text === "null" ? fallback : text;
}

function asObject(value, fallback = {}) {
  return value && typeof value === "object" ? value : fallback;
}

function formatTemplate(template, args = {}) {
  return asString(template, "").replace(/\{([a-zA-Z0-9_]+)\}/g, (match, token) => (
    Object.prototype.hasOwnProperty.call(args, token) ? asString(args[token], "") : match
  ));
}

function renderByCode(code, args, dictionary) {
  const normalizedCode = asString(code, "").trim();
  if (!normalizedCode) return "";
  const template = dictionary[normalizedCode];
  if (!template) return "";
  return formatTemplate(template, asObject(args, {})).trim();
}

function shouldLog(activeVerbosity, minimumLevel) {
  const current = VERBOSITY_WEIGHTS[String(activeVerbosity || "").trim()] ?? VERBOSITY_WEIGHTS.warn;
  const required = VERBOSITY_WEIGHTS[String(minimumLevel || "").trim()] ?? VERBOSITY_WEIGHTS.warn;
  return current >= required;
}

function formatStatusDetailText(status) {
  const detailCode = asString(status?.detailCode, asString(status?.detail, "")).trim();
  const detailArgs = asObject(status?.detailArgs, {});
  const fromCode = renderByCode(detailCode, detailArgs, STATUS_TEXT_EN);
  if (fromCode) return fromCode;
  return asString(status?.detail, "").trim();
}

function formatSystemEventText(event) {
  const code = asString(event?.code, asString(event?.message, "")).trim();
  const args = asObject(event?.args, {});
  const fromCode = renderByCode(code, args, SYSTEM_TEXT_EN);
  if (fromCode) return fromCode;
  return asString(event?.message, code).trim();
}

function formatErrorEventText(event) {
  const code = asString(event?.code, asString(event?.message, "")).trim();
  const args = asObject(event?.args, {});
  const fromCode = renderByCode(code, args, ERROR_TEXT_EN);
  if (fromCode) return fromCode;
  return asString(event?.message, code).trim();
}

function formatErrorText(error) {
  const code = asString(error?.code, "").trim();
  const args = asObject(error?.args, {});
  const fromCode = renderByCode(code, args, ERROR_TEXT_EN);
  if (fromCode) return fromCode;

  const message = asString(error?.message ?? error ?? "", "").trim();
  const fromMessageCode = renderByCode(message, args, ERROR_TEXT_EN);
  if (fromMessageCode) return fromMessageCode;
  if (!message || message === "undefined" || message === "null") {
    return ERROR_TEXT_EN[ERROR_EVENT_CODES.UNKNOWN];
  }
  return message;
}

function printHelp() {
  // eslint-disable-next-line no-console
  console.log(`streaming-chat-webclient

Usage:
  streaming-chat-webclient connect [--host 127.0.0.1] [--port 5443] --token <token>

Options:
  --host <host>
  --port <port>
  --token <token>
  --protocol <xmpp>
  --verbosity <error|warn|chat|debug>
`);
}

async function runConnect(rawOptions = {}, args = {}) {
  const options = resolveConnectOptions(rawOptions);
  const createClient = typeof args.clientFactory === "function"
    ? args.clientFactory
    : createStreamingChatWebClient;

  const client = createClient();

  client.onStatus((status) => {
    if (!shouldLog(options.verbosity, "debug")) return;
    const detailText = formatStatusDetailText(status);
    const detail = detailText ? ` | ${detailText}` : "";
    // eslint-disable-next-line no-console
    console.log(`[status] ${status.state}${detail}`);
  });

  client.onSystem((event) => {
    if (!shouldLog(options.verbosity, "warn")) return;
    const message = formatSystemEventText(event);
    // eslint-disable-next-line no-console
    console.log(`[system] ${message}`);
  });

  client.onChat((event) => {
    if (!shouldLog(options.verbosity, "chat")) return;
    const author = asString(event.author, "").trim() || "unknown";
    // eslint-disable-next-line no-console
    console.log(`[chat] ${author}: ${event.message}`);
  });

  client.onError((event) => {
    if (!shouldLog(options.verbosity, "error")) return;
    const message = formatErrorEventText(event);
    // eslint-disable-next-line no-console
    console.error(`[error] ${message}`);
  });

  try {
    await client.connect(options);
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error(formatErrorText(error));
    return 1;
  }

  if (Number.isFinite(args.idleMs) && args.idleMs >= 0) {
    await new Promise((resolve) => setTimeout(resolve, args.idleMs));
    await client.disconnect({ silent: true });
    return 0;
  }

  let shuttingDown = false;
  const shutdown = async (exitCode) => {
    if (shuttingDown) return;
    shuttingDown = true;

    try {
      await client.disconnect({ silent: true });
    } catch {}

    process.exit(exitCode);
  };

  process.on("SIGINT", () => {
    shutdown(0);
  });

  process.on("SIGTERM", () => {
    shutdown(0);
  });

  await new Promise(() => {});
  return 0;
}

async function main() {
  const { command, options } = parseArgs(process.argv.slice(2));

  if (command === "connect") {
    const code = await runConnect(options);
    process.exit(code);
  }

  printHelp();
  process.exit(command === "help" ? 0 : 1);
}

if (require.main === module) {
  main().catch((error) => {
    // eslint-disable-next-line no-console
    console.error(formatErrorText(error));
    process.exit(1);
  });
}

module.exports = {
  printHelp,
  runConnect,
  main,
  shouldLog,
  formatErrorText,
  formatStatusDetailText,
  formatSystemEventText,
  formatErrorEventText,
};
