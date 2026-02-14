// @vitest-environment node

import { describe, expect, it } from "vitest";
import webclientPackage from "../src/index.cjs";

const { sanitizeConnectionOptions, buildWsUrl } = webclientPackage;

describe("webclient options", () => {
  it("normalizes host/port/token and autoConnect", () => {
    const options = sanitizeConnectionOptions({
      host: "0.0.0.0",
      port: "70000",
      token: "  abc  ",
      autoConnect: "true",
    });

    expect(options).toEqual({
      host: "127.0.0.1",
      port: 65535,
      token: "abc",
      autoConnect: true,
      protocol: "xmpp",
    });
  });

  it("builds websocket URL with token", () => {
    const url = buildWsUrl({
      host: "localhost",
      port: 5443,
      token: "secret",
    });

    expect(url).toBe("ws://localhost:5443/ws?token=secret");
  });

  it("throws when token is missing", () => {
    expect(() => buildWsUrl({ host: "127.0.0.1", port: 5443 })).toThrow("Token obrigatorio.");
  });
});
