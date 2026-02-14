// @vitest-environment node

import { describe, expect, it } from "vitest";
import { WebSocketServer } from "ws";
import cliMainPackage from "../src/main.cjs";

const { runConnect } = cliMainPackage;

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
});
