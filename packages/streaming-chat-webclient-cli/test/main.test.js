// @vitest-environment node

import { describe, expect, it, vi } from "vitest";
import { WebSocketServer } from "ws";
import cliMainPackage from "../src/main.cjs";

const {
  runConnect,
  formatErrorText,
  formatStatusDetailText,
  formatSystemEventText,
  formatErrorEventText,
} = cliMainPackage;

function nextPort() {
  return 30000 + Math.floor(Math.random() * 20000);
}

describe("webclient cli main", () => {
  it("returns failure when token is missing", async () => {
    const code = await runConnect({
      host: "127.0.0.1",
      port: 5443,
      verbosity: "error",
    }, {
      idleMs: 10,
    });

    expect(code).toBe(1);
  });

  it("formats coded events/errors in english", () => {
    expect(formatStatusDetailText({ detailCode: "status.waiting_authentication" }))
      .toBe("Waiting for authentication...");
    expect(formatSystemEventText({
      code: "system.connecting",
      args: { url: "ws://127.0.0.1:5443/ws?token=abc" },
    })).toBe("Connecting to ws://127.0.0.1:5443/ws?token=abc");
    expect(formatErrorEventText({
      code: "error.socket_closed",
      args: { code: "1006" },
    })).toBe("Socket closed (1006).");
    expect(formatErrorText({ code: "error.token_required" })).toBe("Token is required.");
  });

  it("connects and disconnects against xmpp ws server", async () => {
    const port = nextPort();
    let connectionCount = 0;

    const wss = new WebSocketServer({
      host: "127.0.0.1",
      port,
    });

    wss.on("connection", (ws) => {
      connectionCount += 1;

      setTimeout(() => {
        ws.send("<features><mechanisms><mechanism>PLAIN</mechanism></mechanisms></features>");
      }, 10);
    });

    const code = await runConnect({
      host: "127.0.0.1",
      port,
      token: "abc",
      protocol: "xmpp",
      verbosity: "error",
    }, {
      idleMs: 250,
    });

    await new Promise((resolve) => wss.close(resolve));

    expect(code).toBe(0);
    expect(connectionCount).toBeGreaterThan(0);
  });

  it("prints english logs for coded lifecycle events", async () => {
    const logs = [];
    const errors = [];
    const logSpy = vi.spyOn(console, "log").mockImplementation((...args) => {
      logs.push(args.join(" "));
    });
    const errorSpy = vi.spyOn(console, "error").mockImplementation((...args) => {
      errors.push(args.join(" "));
    });

    const handlers = {
      status: () => {},
      system: () => {},
      chat: () => {},
      error: () => {},
    };

    const fakeClient = {
      onStatus(callback) {
        handlers.status = callback;
      },
      onSystem(callback) {
        handlers.system = callback;
      },
      onChat(callback) {
        handlers.chat = callback;
      },
      onError(callback) {
        handlers.error = callback;
      },
      async connect() {
        handlers.status({
          state: "connecting",
          detailCode: "status.connecting",
          detailArgs: {},
        });
        handlers.system({
          code: "system.connecting",
          args: { url: "ws://127.0.0.1:5443/ws?token=abc" },
        });
        handlers.chat({
          author: "unknown",
          message: "hello",
        });
        handlers.error({
          code: "error.websocket_error",
          args: {},
        });
      },
      async disconnect() {},
    };

    try {
      const code = await runConnect({
        host: "127.0.0.1",
        port: 5443,
        token: "abc",
        protocol: "xmpp",
        verbosity: "debug",
      }, {
        idleMs: 0,
        clientFactory: () => fakeClient,
      });

      expect(code).toBe(0);
      expect(logs.join("\n")).toContain("[status] connecting | Connecting...");
      expect(logs.join("\n")).toContain("[system] Connecting to ws://127.0.0.1:5443/ws?token=abc");
      expect(logs.join("\n")).toContain("[chat] unknown: hello");
      expect(errors.join("\n")).toContain("[error] WebSocket error.");
      expect(logs.join("\n")).not.toContain("Conectando");
      expect(errors.join("\n")).not.toContain("Erro");
    } finally {
      logSpy.mockRestore();
      errorSpy.mockRestore();
    }
  });
});
