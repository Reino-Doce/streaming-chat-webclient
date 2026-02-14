const { createStreamingChatWebClient } = require("./client.cjs");
const { sanitizeConnectionOptions, buildWsUrl } = require("./options.cjs");
const { parseXmppChatMessage } = require("./xmpp.cjs");

module.exports = {
  createStreamingChatWebClient,
  sanitizeConnectionOptions,
  buildWsUrl,
  parseXmppChatMessage,
};
