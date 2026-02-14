export type ChatProtocol = "xmpp";

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

export type ClientStatus = {
  state: ClientStatusState;
  at: number;
  wsUrl: string;
  detail: string;
};

export type SystemEvent = {
  at: number;
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

export function createStreamingChatWebClient(args?: {
  webSocketFactory?: (url: string, protocol: string) => unknown;
  now?: () => number;
}): StreamingChatWebClient;
