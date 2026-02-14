const VALID_VERBOSITY = new Set(["error", "warn", "chat", "debug"]);

function asObject(value, fallback = {}) {
  return value && typeof value === "object" ? value : fallback;
}

function asString(value, fallback = "") {
  const text = String(value ?? fallback);
  return text === "undefined" || text === "null" ? fallback : text;
}

function asNumber(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function normalizeVerbosity(value, fallback = "warn") {
  const normalized = asString(value, "").trim().toLowerCase();
  if (VALID_VERBOSITY.has(normalized)) {
    return normalized;
  }
  return fallback;
}

function parseArgs(argv) {
  const values = Array.isArray(argv) ? argv : [];

  let command = "help";
  let index = 0;

  const first = values[0];
  if (first && !String(first).startsWith("-")) {
    command = String(first);
    index = 1;
  }

  const options = {};

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

  return {
    command,
    options,
  };
}

function resolveConnectOptions(rawOptions = {}) {
  const options = asObject(rawOptions, {});
  return {
    host: asString(options.host, "127.0.0.1").trim() || "127.0.0.1",
    port: Math.max(1, Math.min(65535, Math.floor(asNumber(options.port, 5443)))),
    token: asString(options.token, "").trim(),
    protocol: asString(options.protocol, "xmpp").trim().toLowerCase() === "xmpp" ? "xmpp" : "xmpp",
    verbosity: normalizeVerbosity(options.verbosity, "warn"),
  };
}

module.exports = {
  parseArgs,
  normalizeVerbosity,
  resolveConnectOptions,
};
