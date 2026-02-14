const DEFAULT_CONNECTION_OPTIONS = {
  host: "127.0.0.1",
  port: 5443,
  token: "",
  autoConnect: false,
  protocol: "xmpp",
};

function asObject(value, fallback = {}) {
  return value && typeof value === "object" ? value : fallback;
}

function asString(value, fallback = "") {
  const text = String(value ?? fallback);
  return text === "undefined" || text === "null" ? fallback : text;
}

function asBoolean(value, fallback = false) {
  if (typeof value === "boolean") return value;
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (normalized === "true" || normalized === "1") return true;
    if (normalized === "false" || normalized === "0") return false;
  }
  return fallback;
}

function asNumber(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function sanitizeConnectionOptions(rawOptions = {}, defaults = {}) {
  const source = asObject(rawOptions, {});
  const base = {
    ...DEFAULT_CONNECTION_OPTIONS,
    ...asObject(defaults, {}),
  };

  const hostRaw = asString(source.host, base.host).trim() || base.host;
  const host = hostRaw === "0.0.0.0" ? "127.0.0.1" : hostRaw;

  return {
    host,
    port: Math.max(1, Math.min(65535, Math.floor(asNumber(source.port, base.port)))),
    token: asString(source.token, base.token).trim(),
    autoConnect: asBoolean(source.autoConnect, !!base.autoConnect),
    protocol: asString(source.protocol, base.protocol).trim().toLowerCase() === "xmpp"
      ? "xmpp"
      : "xmpp",
  };
}

function buildWsUrl(options = {}) {
  const normalized = sanitizeConnectionOptions(options);
  if (!normalized.token) {
    throw new Error("Token obrigatorio.");
  }

  const url = new URL(`ws://${normalized.host}:${normalized.port}/ws`);
  url.searchParams.set("token", normalized.token);
  return url.toString();
}

module.exports = {
  DEFAULT_CONNECTION_OPTIONS,
  sanitizeConnectionOptions,
  buildWsUrl,
};
