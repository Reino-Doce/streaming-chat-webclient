function asString(value, fallback = "") {
  const text = String(value ?? fallback);
  return text === "undefined" || text === "null" ? fallback : text;
}

function asBoolean(value, fallback = false) {
  if (typeof value === "boolean") return value;
  const normalized = asString(value, "").trim().toLowerCase();
  if (normalized === "true" || normalized === "1") return true;
  if (normalized === "false" || normalized === "0") return false;
  return fallback;
}

function asNumber(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function parseArgs(argv = []) {
  const values = Array.isArray(argv) ? argv : [];
  const options = {};

  let index = 0;
  while (index < values.length) {
    const token = values[index];
    index += 1;

    if (!token || !String(token).startsWith("--")) continue;

    const text = String(token);
    const equalsIndex = text.indexOf("=");

    if (equalsIndex >= 0) {
      const key = text.slice(2, equalsIndex);
      const value = text.slice(equalsIndex + 1);
      options[key] = value;
      continue;
    }

    const key = text.slice(2);
    const next = values[index];
    if (next && !String(next).startsWith("--")) {
      options[key] = next;
      index += 1;
    } else {
      options[key] = "true";
    }
  }

  return options;
}

function buildChatDockQuery(rawOptions = {}, env = process.env) {
  const hostRaw = asString(rawOptions.host, asString(env.RD_CHAT_DOCK_HOST, "127.0.0.1")).trim() || "127.0.0.1";
  const host = hostRaw === "0.0.0.0" ? "127.0.0.1" : hostRaw;
  const port = Math.max(
    1,
    Math.min(65535, Math.floor(asNumber(rawOptions.port, asNumber(env.RD_CHAT_DOCK_PORT, 5443)))),
  );
  const token = asString(rawOptions.token, asString(env.RD_CHAT_DOCK_TOKEN, "")).trim();
  const autoConnect = asBoolean(rawOptions.autoconnect, asBoolean(env.RD_CHAT_DOCK_AUTOCONNECT, false));

  return {
    host,
    port: String(port),
    token,
    autoconnect: autoConnect ? "1" : "0",
  };
}

function resolveLaunchOptions(argv = process.argv.slice(2), env = process.env) {
  const args = parseArgs(argv);
  return {
    query: buildChatDockQuery(args, env),
  };
}

module.exports = {
  parseArgs,
  buildChatDockQuery,
  resolveLaunchOptions,
};
