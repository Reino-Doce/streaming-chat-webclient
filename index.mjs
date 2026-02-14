import cjsModule from "./src/index.cjs";

export const {
  createStreamingChatWebClient,
  sanitizeConnectionOptions,
  buildWsUrl,
  parseXmppChatMessage,
} = cjsModule;

export default cjsModule;
