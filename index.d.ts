export type ChatProtocol = "xmpp";
export type EventArgs = Record<string, string | number | boolean | null | undefined>;

export type ConnectionOptions = {
  host: string;
  port: number;
  token: string;
  autoConnect: boolean;
  protocol: ChatProtocol;
};

export type ClientStatusState =
  | "disconnected"
  | "connecting"
  | "socket-open"
  | "authenticating"
  | "binding"
  | "connected"
  | "error";

export type StatusDetailCode =
  | "status.disconnected"
  | "status.connecting"
  | "status.socket_open"
  | "status.waiting_authentication"
  | "status.waiting_binding"
  | "status.session_bound"
  | "status.socket_create_failed"
  | "status.socket_closed"
  | "status.websocket_error";

export type SystemEventCode =
  | "system.connecting"
  | "system.disconnected"
  | "system.authenticating"
  | "system.binding_session"
  | "system.authenticated"
  | "system.connected_to_chat"
  | "system.socket_closed"
  | "system.websocket_error";

export type ErrorEventCode =
  | "error.token_required"
  | "error.socket_create_failed"
  | "error.socket_closed"
  | "error.websocket_error"
  | "error.unknown";

export type ClientStatus = {
  state: ClientStatusState;
  at: number;
  wsUrl: string;
  // `detail` is kept for backwards compatibility and mirrors `detailCode`.
  detail: string;
  detailCode: StatusDetailCode | "";
  detailArgs: EventArgs;
};

export type SystemEvent = {
  at: number;
  code: SystemEventCode;
  args: EventArgs;
  // `message` is kept for backwards compatibility and mirrors `code`.
  message: string;
};

export type ChatEvent = {
  at: number;
  author: string;
  message: string;
  raw: string;
};

export type ErrorEvent = {
  at: number;
  code: ErrorEventCode;
  args: EventArgs;
  // `message` is kept for backwards compatibility and mirrors `code`.
  message: string;
  fatal: boolean;
  raw?: unknown;
};

export type XmppChatMessage = {
  author: string;
  message: string;
};

export interface StreamingChatWebClient {
  connect(options?: Partial<ConnectionOptions>): Promise<void>;
  disconnect(args?: { silent?: boolean }): Promise<void>;
  getStatus(): ClientStatus;
  onStatus(listener: (status: ClientStatus) => void): () => void;
  onSystem(listener: (event: SystemEvent) => void): () => void;
  onChat(listener: (event: ChatEvent) => void): () => void;
  onError(listener: (event: ErrorEvent) => void): () => void;
}

export function sanitizeConnectionOptions(
  rawOptions?: Partial<ConnectionOptions> | null,
  defaults?: Partial<ConnectionOptions> | null,
): ConnectionOptions;

export function buildWsUrl(options?: Partial<ConnectionOptions> | null): string;

export function parseXmppChatMessage(xmlText: string): XmppChatMessage | null;

export const STATUS_DETAIL_CODES: Readonly<{
  DISCONNECTED: "status.disconnected";
  CONNECTING: "status.connecting";
  SOCKET_OPEN: "status.socket_open";
  WAITING_AUTHENTICATION: "status.waiting_authentication";
  WAITING_BINDING: "status.waiting_binding";
  SESSION_BOUND: "status.session_bound";
  SOCKET_CREATE_FAILED: "status.socket_create_failed";
  SOCKET_CLOSED: "status.socket_closed";
  WEBSOCKET_ERROR: "status.websocket_error";
}>;

export const SYSTEM_EVENT_CODES: Readonly<{
  CONNECTING: "system.connecting";
  DISCONNECTED: "system.disconnected";
  AUTHENTICATING: "system.authenticating";
  BINDING_SESSION: "system.binding_session";
  AUTHENTICATED: "system.authenticated";
  CONNECTED_TO_CHAT: "system.connected_to_chat";
  SOCKET_CLOSED: "system.socket_closed";
  WEBSOCKET_ERROR: "system.websocket_error";
}>;

export const ERROR_EVENT_CODES: Readonly<{
  TOKEN_REQUIRED: "error.token_required";
  SOCKET_CREATE_FAILED: "error.socket_create_failed";
  SOCKET_CLOSED: "error.socket_closed";
  WEBSOCKET_ERROR: "error.websocket_error";
  UNKNOWN: "error.unknown";
}>;

export function createStreamingChatWebClient(args?: {
  webSocketFactory?: (url: string, protocol: string) => unknown;
  now?: () => number;
}): StreamingChatWebClient;
