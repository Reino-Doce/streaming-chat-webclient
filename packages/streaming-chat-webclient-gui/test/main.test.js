// @vitest-environment node

import { describe, expect, it } from "vitest";
import mainPackage from "../src/main.cjs";

describe("gui main package exports", () => {
  it("exposes embeddable window factory", () => {
    expect(typeof mainPackage.createChatDockWindow).toBe("function");
    expect(typeof mainPackage.repositionChatDockWindow).toBe("function");
    expect(typeof mainPackage.startStandaloneChatDock).toBe("function");
  });
});
