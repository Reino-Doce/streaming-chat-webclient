const STATUS_DETAIL_CODES = Object.freeze({
  DISCONNECTED: "status.disconnected",
  CONNECTING: "status.connecting",
  SOCKET_OPEN: "status.socket_open",
  WAITING_AUTHENTICATION: "status.waiting_authentication",
  WAITING_BINDING: "status.waiting_binding",
  SESSION_BOUND: "status.session_bound",
  SOCKET_CREATE_FAILED: "status.socket_create_failed",
  SOCKET_CLOSED: "status.socket_closed",
  WEBSOCKET_ERROR: "status.websocket_error",
});

const SYSTEM_EVENT_CODES = Object.freeze({
  CONNECTING: "system.connecting",
  DISCONNECTED: "system.disconnected",
  AUTHENTICATING: "system.authenticating",
  BINDING_SESSION: "system.binding_session",
  AUTHENTICATED: "system.authenticated",
  CONNECTED_TO_CHAT: "system.connected_to_chat",
  SOCKET_CLOSED: "system.socket_closed",
  WEBSOCKET_ERROR: "system.websocket_error",
});

const ERROR_EVENT_CODES = Object.freeze({
  TOKEN_REQUIRED: "error.token_required",
  SOCKET_CREATE_FAILED: "error.socket_create_failed",
  SOCKET_CLOSED: "error.socket_closed",
  WEBSOCKET_ERROR: "error.websocket_error",
  UNKNOWN: "error.unknown",
});

function normalizeArgs(args) {
  if (!args || typeof args !== "object") return {};
  return { ...args };
}

function createCodedError(code, args = {}, fallbackMessage = "") {
  const message = String(fallbackMessage || code || ERROR_EVENT_CODES.UNKNOWN).trim() || ERROR_EVENT_CODES.UNKNOWN;
  const error = new Error(message);
  error.code = String(code || ERROR_EVENT_CODES.UNKNOWN);
  error.args = normalizeArgs(args);
  return error;
}

module.exports = {
  STATUS_DETAIL_CODES,
  SYSTEM_EVENT_CODES,
  ERROR_EVENT_CODES,
  createCodedError,
  normalizeArgs,
};
