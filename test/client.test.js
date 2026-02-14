// @vitest-environment node

import { describe, expect, it } from "vitest";
import webclientPackage from "../src/index.cjs";

const {
  createStreamingChatWebClient,
  STATUS_DETAIL_CODES,
  SYSTEM_EVENT_CODES,
  ERROR_EVENT_CODES,
} = webclientPackage;

class MockSocket {
  constructor(url, protocol) {
    this.url = url;
    this.protocol = protocol;
    this.readyState = 0;
    this.OPEN = 1;
    this.listeners = new Map();
    this.sent = [];
  }

  on(eventName, listener) {
    const list = this.listeners.get(eventName) || [];
    list.push(listener);
    this.listeners.set(eventName, list);
  }

  off(eventName, listener) {
    const list = this.listeners.get(eventName) || [];
    this.listeners.set(
      eventName,
      list.filter((row) => row !== listener),
    );
  }

  emit(eventName, ...args) {
    const list = this.listeners.get(eventName) || [];
    for (const listener of list) {
      listener(...args);
    }
  }

  send(text) {
    this.sent.push(String(text));
  }

  open() {
    this.readyState = this.OPEN;
    this.emit("open");
  }

  receive(text) {
    this.emit("message", String(text), false);
  }

  fail(error = new Error("mock error")) {
    this.emit("error", error);
  }

  close(code = 1000) {
    this.readyState = 3;
    this.emit("close", { code });
  }
}

class MockDomSocket {
  constructor(url, protocol) {
    this.url = url;
    this.protocol = protocol;
    this.readyState = 0;
    this.OPEN = 1;
    this.listeners = new Map();
    this.sent = [];
  }

  addEventListener(eventName, listener) {
    const list = this.listeners.get(eventName) || [];
    list.push(listener);
    this.listeners.set(eventName, list);
  }

  removeEventListener(eventName, listener) {
    const list = this.listeners.get(eventName) || [];
    this.listeners.set(
      eventName,
      list.filter((row) => row !== listener),
    );
  }

  emit(eventName, payload) {
    const list = this.listeners.get(eventName) || [];
    for (const listener of list) {
      listener(payload);
    }
  }

  send(text) {
    this.sent.push(String(text));
  }

  open() {
    this.readyState = this.OPEN;
    this.emit("open", { type: "open" });
  }

  receive(text) {
    const proto = {
      get data() {
        return String(text);
      },
    };
    const messageEvent = Object.create(proto);
    this.emit("message", messageEvent);
  }

  fail(error = new Error("mock error")) {
    this.emit("error", error);
  }

  close(code = 1000) {
    this.readyState = 3;
    this.emit("close", { code });
  }
}

describe("webclient", () => {
  it("performs xmpp handshake and emits chat events", async () => {
    let socket = null;
    const chats = [];
    const statuses = [];

    const client = createStreamingChatWebClient({
      webSocketFactory: (url, protocol) => {
        socket = new MockSocket(url, protocol);
        return socket;
      },
    });

    client.onChat((event) => chats.push(event));
    client.onStatus((event) => statuses.push(event.state));

    const connectPromise = client.connect({
      host: "127.0.0.1",
      port: 5443,
      token: "abc",
      protocol: "xmpp",
    });

    socket.open();
    await connectPromise;

    socket.receive("<features><mechanisms/></features>");
    expect(socket.sent).toContain('<auth mechanism="PLAIN">dock</auth>');

    socket.receive("<success/>");
    socket.receive("<features><mechanisms/></features>");
    expect(socket.sent).toContain("<iq><bind/></iq>");

    socket.receive("<iq><bind><jid>stream@internal/moblin</jid></bind></iq>");
    socket.receive('<message from="tiktok/alice"><body>hello dock</body></message>');

    expect(chats).toHaveLength(1);
    expect(chats[0].author).toBe("alice");
    expect(chats[0].message).toBe("hello dock");
    expect(statuses).toContain("connected");
    expect(client.getStatus().detailCode).toBe(STATUS_DETAIL_CODES.SESSION_BOUND);

    await client.disconnect();
  });

  it("emits error status when socket fails", async () => {
    let socket = null;
    const errors = [];
    const systems = [];

    const client = createStreamingChatWebClient({
      webSocketFactory: (url, protocol) => {
        socket = new MockSocket(url, protocol);
        return socket;
      },
    });

    client.onError((event) => errors.push(event));
    client.onSystem((event) => systems.push(event));

    const connectPromise = client.connect({ token: "abc" });
    socket.fail(new Error("boom"));

    await expect(connectPromise).rejects.toMatchObject({
      code: ERROR_EVENT_CODES.WEBSOCKET_ERROR,
    });
    expect(errors).toHaveLength(1);
    expect(errors[0].code).toBe(ERROR_EVENT_CODES.WEBSOCKET_ERROR);
    expect(systems.some((event) => event.code === SYSTEM_EVENT_CODES.WEBSOCKET_ERROR)).toBe(true);
    expect(client.getStatus().state).toBe("error");
    expect(client.getStatus().detailCode).toBe(STATUS_DETAIL_CODES.WEBSOCKET_ERROR);
  });

  it("handles DOM-style message events with data getter", async () => {
    let socket = null;
    const chats = [];
    const statuses = [];

    const client = createStreamingChatWebClient({
      webSocketFactory: (url, protocol) => {
        socket = new MockDomSocket(url, protocol);
        return socket;
      },
    });

    client.onChat((event) => chats.push(event));
    client.onStatus((event) => statuses.push(event.state));

    const connectPromise = client.connect({
      host: "127.0.0.1",
      port: 5443,
      token: "abc",
      protocol: "xmpp",
    });

    socket.open();
    await connectPromise;

    socket.receive("<features><mechanisms/></features>");
    expect(socket.sent).toContain('<auth mechanism="PLAIN">dock</auth>');

    socket.receive("<success/>");
    socket.receive("<features><mechanisms/></features>");
    expect(socket.sent).toContain("<iq><bind/></iq>");

    socket.receive("<iq><bind><jid>stream@internal/moblin</jid></bind></iq>");
    socket.receive('<message from="tiktok/alice"><body>hello dom</body></message>');

    expect(chats).toHaveLength(1);
    expect(chats[0].author).toBe("alice");
    expect(chats[0].message).toBe("hello dom");
    expect(statuses).toContain("connected");
    expect(client.getStatus().detailCode).toBe(STATUS_DETAIL_CODES.SESSION_BOUND);

    await client.disconnect();
  });
});
