const { sanitizeConnectionOptions, buildWsUrl } = require("./options.cjs");
const { parseXmppChatMessage, createXmppHandshakeMachine } = require("./xmpp.cjs");

function asString(value, fallback = "") {
  const text = String(value ?? fallback);
  return text === "undefined" || text === "null" ? fallback : text;
}

function getSocketOpenValue(socket) {
  if (!socket || typeof socket !== "object") return 1;
  if (typeof socket.OPEN === "number") return socket.OPEN;
  if (typeof socket.constructor?.OPEN === "number") return socket.constructor.OPEN;
  return 1;
}

function createDefaultWebSocket(url, protocol) {
  if (typeof globalThis.WebSocket === "function") {
    return new globalThis.WebSocket(url, protocol);
  }

  // eslint-disable-next-line global-require
  const NodeWebSocket = require("ws");
  return new NodeWebSocket(url, protocol);
}

function attachSocketEvent(socket, eventName, listener) {
  if (!socket) return () => {};

  if (typeof socket.addEventListener === "function") {
    socket.addEventListener(eventName, listener);
    return () => {
      try {
        socket.removeEventListener(eventName, listener);
      } catch {}
    };
  }

  if (typeof socket.on === "function") {
    socket.on(eventName, listener);
    return () => {
      try {
        if (typeof socket.off === "function") {
          socket.off(eventName, listener);
        } else if (typeof socket.removeListener === "function") {
          socket.removeListener(eventName, listener);
        }
      } catch {}
    };
  }

  return () => {};
}

function decodeBinaryLikeToText(value) {
  if (typeof value === "string") return value;
  if (!value) return "";

  if (typeof Buffer !== "undefined" && Buffer.isBuffer(value)) {
    return value.toString("utf8");
  }

  if (value instanceof ArrayBuffer) {
    return new TextDecoder().decode(new Uint8Array(value));
  }

  if (ArrayBuffer.isView(value)) {
    return new TextDecoder().decode(value);
  }

  return String(value ?? "");
}

function extractMessageText(messageArg, isBinaryArg) {
  if (typeof isBinaryArg === "boolean") {
    if (isBinaryArg) return "";
    return decodeBinaryLikeToText(messageArg);
  }

  const row = messageArg && typeof messageArg === "object" ? messageArg : null;
  if (row && "data" in row) {
    return decodeBinaryLikeToText(row.data);
  }

  return decodeBinaryLikeToText(messageArg);
}

function createStreamingChatWebClient(args = {}) {
  const listeners = {
    status: new Set(),
    system: new Set(),
    chat: new Set(),
    error: new Set(),
  };

  const webSocketFactory = typeof args.webSocketFactory === "function"
    ? args.webSocketFactory
    : createDefaultWebSocket;
  const now = typeof args.now === "function" ? args.now : () => Date.now();

  let socket = null;
  let socketDetach = [];
  let connectAttempt = 0;
  let lastOptions = sanitizeConnectionOptions();
  let status = {
    state: "disconnected",
    at: now(),
    wsUrl: "",
    detail: "",
  };

  function emit(kind, payload) {
    const set = listeners[kind];
    if (!set) return;

    for (const listener of set) {
      try {
        listener(payload);
      } catch {}
    }
  }

  function setStatus(state, detail = "") {
    status = {
      ...status,
      state,
      detail: asString(detail, "").trim(),
      at: now(),
    };
    emit("status", { ...status });
  }

  function emitSystem(message) {
    const text = asString(message, "").trim();
    if (!text) return;
    emit("system", {
      at: now(),
      message: text,
    });
  }

  function emitError(error, fatal = false) {
    const message = asString(error?.message ?? error, "Erro de websocket.").trim() || "Erro de websocket.";
    emit("error", {
      at: now(),
      message,
      fatal: !!fatal,
      raw: error,
    });
  }

  function removeSocketListeners() {
    for (const detach of socketDetach.splice(0)) {
      try {
        detach();
      } catch {}
    }
  }

  function safeSendFrame(text) {
    if (!socket) return;

    try {
      if (socket.readyState !== getSocketOpenValue(socket)) return;
      socket.send(text);
    } catch {}
  }

  async function disconnect({ silent = false } = {}) {
    connectAttempt += 1;

    const activeSocket = socket;
    socket = null;
    removeSocketListeners();

    if (activeSocket) {
      try {
        activeSocket.close(1000, "manual close");
      } catch {
        try {
          activeSocket.close();
        } catch {}
      }
    }

    setStatus("disconnected", "Desconectado");
    if (!silent) {
      emitSystem("Desconectado.");
    }
  }

  async function connect(rawOptions = {}) {
    const options = sanitizeConnectionOptions(rawOptions, lastOptions);
    const wsUrl = buildWsUrl(options);
    lastOptions = options;

    if (socket) {
      await disconnect({ silent: true });
    }

    const attemptId = ++connectAttempt;
    status = {
      ...status,
      wsUrl,
    };
    setStatus("connecting", "Conectando...");
    emitSystem(`Conectando em ${wsUrl}`);

    return new Promise((resolve, reject) => {
      let settled = false;

      function resolveOnce() {
        if (settled) return;
        settled = true;
        resolve();
      }

      function rejectOnce(error) {
        if (settled) return;
        settled = true;
        reject(error);
      }

      let createdSocket = null;
      try {
        createdSocket = webSocketFactory(wsUrl, options.protocol);
      } catch (error) {
        setStatus("error", "Falha ao criar socket.");
        emitError(error, true);
        rejectOnce(error);
        return;
      }

      socket = createdSocket;

      const handshake = createXmppHandshakeMachine({
        sendFrame: safeSendFrame,
        onState: (nextState, detail) => {
          if (attemptId !== connectAttempt || socket !== createdSocket) return;
          setStatus(nextState, detail);
        },
        onSystem: (message) => {
          if (attemptId !== connectAttempt || socket !== createdSocket) return;
          emitSystem(message);
        },
      });

      socketDetach = [
        attachSocketEvent(createdSocket, "open", () => {
          if (attemptId !== connectAttempt || socket !== createdSocket) return;
          setStatus("socket-open", "Socket aberto.");
          resolveOnce();
        }),
        attachSocketEvent(createdSocket, "message", (event, isBinary) => {
          if (attemptId !== connectAttempt || socket !== createdSocket) return;

          const text = extractMessageText(event, isBinary).trim();
          if (!text) return;

          handshake.handleFrame(text);

          const parsed = parseXmppChatMessage(text);
          if (!parsed) return;

          emit("chat", {
            at: now(),
            author: parsed.author,
            message: parsed.message,
            raw: text,
          });
        }),
        attachSocketEvent(createdSocket, "close", (event) => {
          if (attemptId !== connectAttempt || socket !== createdSocket) return;

          socket = null;
          handshake.reset();

          const closeCode = Number(event?.code);
          const codeText = Number.isFinite(closeCode) ? String(closeCode) : "desconhecido";
          setStatus("disconnected", `Socket fechado (${codeText}).`);
          emitSystem(`Socket fechado (${codeText}).`);

          if (!settled) {
            rejectOnce(new Error(`Socket fechado (${codeText}).`));
          }
        }),
        attachSocketEvent(createdSocket, "error", (error) => {
          if (attemptId !== connectAttempt || socket !== createdSocket) return;

          setStatus("error", "Erro de websocket.");
          emitSystem("Erro de websocket.");
          emitError(error, false);

          if (!settled) {
            rejectOnce(new Error("Erro de websocket."));
          }
        }),
      ];
    });
  }

  function onStatus(listener) {
    if (typeof listener !== "function") {
      return () => {};
    }

    listeners.status.add(listener);
    listener({ ...status });

    return () => {
      listeners.status.delete(listener);
    };
  }

  function onSystem(listener) {
    if (typeof listener !== "function") {
      return () => {};
    }

    listeners.system.add(listener);
    return () => {
      listeners.system.delete(listener);
    };
  }

  function onChat(listener) {
    if (typeof listener !== "function") {
      return () => {};
    }

    listeners.chat.add(listener);
    return () => {
      listeners.chat.delete(listener);
    };
  }

  function onError(listener) {
    if (typeof listener !== "function") {
      return () => {};
    }

    listeners.error.add(listener);
    return () => {
      listeners.error.delete(listener);
    };
  }

  function getStatus() {
    return { ...status };
  }

  return {
    connect,
    disconnect,
    getStatus,
    onStatus,
    onSystem,
    onChat,
    onError,
  };
}

module.exports = {
  createStreamingChatWebClient,
};
