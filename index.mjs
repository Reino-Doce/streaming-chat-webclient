import cjsModule from "./src/index.cjs";

export const {
  createStreamingChatWebClient,
  sanitizeConnectionOptions,
  buildWsUrl,
  parseXmppChatMessage,
  STATUS_DETAIL_CODES,
  SYSTEM_EVENT_CODES,
  ERROR_EVENT_CODES,
} = cjsModule;

export default cjsModule;
