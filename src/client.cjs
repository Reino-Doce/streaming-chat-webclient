const { sanitizeConnectionOptions, buildWsUrl } = require("./options.cjs");
const { parseXmppChatMessage, createXmppHandshakeMachine } = require("./xmpp.cjs");
const {
  STATUS_DETAIL_CODES,
  SYSTEM_EVENT_CODES,
  ERROR_EVENT_CODES,
  createCodedError,
  normalizeArgs,
} = require("./event-codes.cjs");

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
    detail: STATUS_DETAIL_CODES.DISCONNECTED,
    detailCode: STATUS_DETAIL_CODES.DISCONNECTED,
    detailArgs: {},
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

  function setStatus(state, detailCode = "", detailArgs = {}) {
    const nextDetailCode = asString(detailCode, "").trim();
    status = {
      ...status,
      state,
      detail: nextDetailCode,
      detailCode: nextDetailCode,
      detailArgs: normalizeArgs(detailArgs),
      at: now(),
    };
    emit("status", { ...status });
  }

  function emitSystem(code, args = {}) {
    const normalizedCode = asString(code, "").trim();
    if (!normalizedCode) return;
    emit("system", {
      at: now(),
      code: normalizedCode,
      args: normalizeArgs(args),
      message: normalizedCode,
    });
  }

  function emitError(code, args = {}, rawError = null, fatal = false) {
    const normalizedCode = asString(code, ERROR_EVENT_CODES.UNKNOWN).trim() || ERROR_EVENT_CODES.UNKNOWN;
    emit("error", {
      at: now(),
      code: normalizedCode,
      args: normalizeArgs(args),
      message: normalizedCode,
      fatal: !!fatal,
      raw: rawError,
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

    setStatus("disconnected", STATUS_DETAIL_CODES.DISCONNECTED);
    if (!silent) {
      emitSystem(SYSTEM_EVENT_CODES.DISCONNECTED);
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
    setStatus("connecting", STATUS_DETAIL_CODES.CONNECTING);
    emitSystem(SYSTEM_EVENT_CODES.CONNECTING, { url: wsUrl });

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
        setStatus("error", STATUS_DETAIL_CODES.SOCKET_CREATE_FAILED);
        emitError(ERROR_EVENT_CODES.SOCKET_CREATE_FAILED, {}, error, true);
        rejectOnce(createCodedError(ERROR_EVENT_CODES.SOCKET_CREATE_FAILED));
        return;
      }

      socket = createdSocket;

      const handshake = createXmppHandshakeMachine({
        sendFrame: safeSendFrame,
        onState: (nextState, detailCode, detailArgs = {}) => {
          if (attemptId !== connectAttempt || socket !== createdSocket) return;
          setStatus(nextState, detailCode, detailArgs);
        },
        onSystem: (code, codeArgs = {}) => {
          if (attemptId !== connectAttempt || socket !== createdSocket) return;
          emitSystem(code, codeArgs);
        },
      });

      socketDetach = [
        attachSocketEvent(createdSocket, "open", () => {
          if (attemptId !== connectAttempt || socket !== createdSocket) return;
          setStatus("socket-open", STATUS_DETAIL_CODES.SOCKET_OPEN);
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
          const codeText = Number.isFinite(closeCode) ? String(closeCode) : "unknown";
          const closeArgs = { code: codeText };
          setStatus("disconnected", STATUS_DETAIL_CODES.SOCKET_CLOSED, closeArgs);
          emitSystem(SYSTEM_EVENT_CODES.SOCKET_CLOSED, closeArgs);

          if (!settled) {
            rejectOnce(createCodedError(ERROR_EVENT_CODES.SOCKET_CLOSED, closeArgs));
          }
        }),
        attachSocketEvent(createdSocket, "error", (error) => {
          if (attemptId !== connectAttempt || socket !== createdSocket) return;

          setStatus("error", STATUS_DETAIL_CODES.WEBSOCKET_ERROR);
          emitSystem(SYSTEM_EVENT_CODES.WEBSOCKET_ERROR);
          emitError(ERROR_EVENT_CODES.WEBSOCKET_ERROR, {}, error, false);

          if (!settled) {
            rejectOnce(createCodedError(ERROR_EVENT_CODES.WEBSOCKET_ERROR));
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
