const { STATUS_DETAIL_CODES, SYSTEM_EVENT_CODES } = require("./event-codes.cjs");

function decodeXmlEntities(value) {
  return String(value ?? "")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, "&");
}

function decodeAuthorFromFromField(fromValue) {
  const normalized = String(fromValue || "").trim();
  if (!normalized) return "unknown";
  const slashIndex = normalized.lastIndexOf("/");
  if (slashIndex < 0 || slashIndex === normalized.length - 1) return normalized;
  return normalized.slice(slashIndex + 1);
}

function parseXmppChatMessage(xmlText) {
  const text = String(xmlText || "").trim();
  if (!text || !text.toLowerCase().includes("<message")) {
    return null;
  }

  const fromMatch = text.match(/\bfrom\s*=\s*(["'])(.*?)\1/i);
  const bodyMatch = text.match(/<body>([\s\S]*?)<\/body>/i);

  if (!bodyMatch) {
    return null;
  }

  const author = decodeAuthorFromFromField(fromMatch ? decodeXmlEntities(fromMatch[2]) : "");
  const message = decodeXmlEntities(bodyMatch[1]).trim();

  if (!message) {
    return null;
  }

  return {
    author,
    message,
  };
}

function createXmppHandshakeMachine({ sendFrame, onState, onSystem }) {
  let authSent = false;
  let authDone = false;
  let bindSent = false;

  function reset() {
    authSent = false;
    authDone = false;
    bindSent = false;
  }

  function handleFrame(rawText) {
    const text = String(rawText || "").trim();
    if (!text) return;

    const lower = text.toLowerCase();

    if (lower.includes("<features")) {
      if (!authSent) {
        sendFrame('<auth mechanism="PLAIN">dock</auth>');
        authSent = true;
        onState("authenticating", STATUS_DETAIL_CODES.WAITING_AUTHENTICATION);
        onSystem(SYSTEM_EVENT_CODES.AUTHENTICATING);
        return;
      }

      if (authDone && !bindSent) {
        sendFrame("<iq><bind/></iq>");
        bindSent = true;
        onState("binding", STATUS_DETAIL_CODES.WAITING_BINDING);
        onSystem(SYSTEM_EVENT_CODES.BINDING_SESSION);
      }
      return;
    }

    if (lower.includes("<success")) {
      authDone = true;
      onSystem(SYSTEM_EVENT_CODES.AUTHENTICATED);
      return;
    }

    if (lower.includes("<iq") && lower.includes("<bind")) {
      onState("connected", STATUS_DETAIL_CODES.SESSION_BOUND);
      onSystem(SYSTEM_EVENT_CODES.CONNECTED_TO_CHAT);
    }
  }

  return {
    reset,
    handleFrame,
  };
}

module.exports = {
  parseXmppChatMessage,
  createXmppHandshakeMachine,
  __private: {
    decodeAuthorFromFromField,
    decodeXmlEntities,
  },
};
