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
  if (!normalized) return "desconhecido";
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
        onState("authenticating", "Aguardando autenticacao...");
        onSystem("Autenticando...");
        return;
      }

      if (authDone && !bindSent) {
        sendFrame("<iq><bind/></iq>");
        bindSent = true;
        onState("binding", "Aguardando bind...");
        onSystem("Vinculando sessao...");
      }
      return;
    }

    if (lower.includes("<success")) {
      authDone = true;
      onSystem("Autenticado.");
      return;
    }

    if (lower.includes("<iq") && lower.includes("<bind")) {
      onState("connected", "Sessao vinculada.");
      onSystem("Conectado ao chat.");
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
