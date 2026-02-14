#!/usr/bin/env node

const {
  createStreamingChatWebClient,
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

function shouldLog(activeVerbosity, minimumLevel) {
  const current = VERBOSITY_WEIGHTS[String(activeVerbosity || "").trim()] ?? VERBOSITY_WEIGHTS.warn;
  const required = VERBOSITY_WEIGHTS[String(minimumLevel || "").trim()] ?? VERBOSITY_WEIGHTS.warn;
  return current >= required;
}

function formatErrorText(error) {
  const message = String(error?.message ?? error ?? "").trim();
  if (!message || message === "undefined" || message === "null") {
    return "Erro desconhecido.";
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
    const detail = status.detail ? ` | ${status.detail}` : "";
    // eslint-disable-next-line no-console
    console.log(`[status] ${status.state}${detail}`);
  });

  client.onSystem((event) => {
    if (!shouldLog(options.verbosity, "warn")) return;
    // eslint-disable-next-line no-console
    console.log(`[system] ${event.message}`);
  });

  client.onChat((event) => {
    if (!shouldLog(options.verbosity, "chat")) return;
    // eslint-disable-next-line no-console
    console.log(`[chat] ${event.author}: ${event.message}`);
  });

  client.onError((event) => {
    if (!shouldLog(options.verbosity, "error")) return;
    // eslint-disable-next-line no-console
    console.error(`[error] ${event.message}`);
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
};
