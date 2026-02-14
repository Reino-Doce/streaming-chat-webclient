const { contextBridge } = require("electron");
const {
  createStreamingChatWebClient,
  sanitizeConnectionOptions,
  buildWsUrl,
  STATUS_DETAIL_CODES,
  SYSTEM_EVENT_CODES,
  ERROR_EVENT_CODES,
} = require("@reino-doce/streaming-chat-webclient");

const listeners = {
  status: new Set(),
  system: new Set(),
  chat: new Set(),
  error: new Set(),
};

const client = createStreamingChatWebClient();

function emit(kind, payload) {
  const bucket = listeners[kind];
  if (!bucket) return;

  for (const listener of bucket) {
    try {
      listener(payload);
    } catch {}
  }
}

client.onStatus((status) => emit("status", status));
client.onSystem((event) => emit("system", event));
client.onChat((event) => emit("chat", event));
client.onError((event) => emit("error", event));

function registerListener(kind, callback) {
  if (typeof callback !== "function") {
    return () => {};
  }

  listeners[kind].add(callback);
  return () => {
    listeners[kind].delete(callback);
  };
}

contextBridge.exposeInMainWorld("chatDockClient", {
  sanitizeConnectionOptions,
  buildWsUrl,
  connect: async (options) => {
    await client.connect(options);
  },
  disconnect: async (args) => {
    await client.disconnect(args);
  },
  getStatus: () => client.getStatus(),
  onStatus: (callback) => registerListener("status", callback),
  onSystem: (callback) => registerListener("system", callback),
  onChat: (callback) => registerListener("chat", callback),
  onError: (callback) => registerListener("error", callback),
  codes: {
    statusDetail: STATUS_DETAIL_CODES,
    system: SYSTEM_EVENT_CODES,
    error: ERROR_EVENT_CODES,
  },
});
