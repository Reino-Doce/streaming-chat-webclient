// @vitest-environment node

import { describe, expect, it } from "vitest";
import launchOptionsPackage from "../src/launch-options.cjs";

const { parseArgs, buildChatDockQuery, resolveLaunchOptions } = launchOptionsPackage;

describe("gui launch options", () => {
  it("parses cli args", () => {
    const parsed = parseArgs(["--host", "localhost", "--token=abc", "--autoconnect", "true"]);

    expect(parsed).toEqual({
      host: "localhost",
      token: "abc",
      autoconnect: "true",
    });
  });

  it("builds query with fallback env", () => {
    const query = buildChatDockQuery({}, {
      RD_CHAT_DOCK_HOST: "0.0.0.0",
      RD_CHAT_DOCK_PORT: "99999",
      RD_CHAT_DOCK_TOKEN: "tok",
      RD_CHAT_DOCK_AUTOCONNECT: "1",
    });

    expect(query).toEqual({
      host: "127.0.0.1",
      port: "65535",
      token: "tok",
      autoconnect: "1",
    });
  });

  it("resolves launch options from argv+env", () => {
    const resolved = resolveLaunchOptions(["--host", "local", "--port", "6000"], {
      RD_CHAT_DOCK_TOKEN: "abc",
    });

    expect(resolved.query).toEqual({
      host: "local",
      port: "6000",
      token: "abc",
      autoconnect: "0",
    });
  });
});
