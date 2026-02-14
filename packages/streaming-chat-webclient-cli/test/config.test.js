// @vitest-environment node

import { describe, expect, it } from "vitest";
import cliConfigPackage from "../src/config.cjs";

const { parseArgs, resolveConnectOptions, normalizeVerbosity } = cliConfigPackage;

describe("webclient cli config", () => {
  it("parses command and options", () => {
    const parsed = parseArgs(["connect", "--host", "localhost", "--token=abc"]);

    expect(parsed.command).toBe("connect");
    expect(parsed.options).toEqual({
      host: "localhost",
      token: "abc",
    });
  });

  it("normalizes verbosity with fallback", () => {
    expect(normalizeVerbosity("chat", "warn")).toBe("chat");
    expect(normalizeVerbosity("loud", "warn")).toBe("warn");
  });

  it("resolves connect options", () => {
    const options = resolveConnectOptions({
      host: "0.0.0.0",
      port: "99999",
      token: " tok ",
      verbosity: "debug",
    });

    expect(options).toEqual({
      host: "0.0.0.0",
      port: 65535,
      token: "tok",
      protocol: "xmpp",
      verbosity: "debug",
    });
  });
});
