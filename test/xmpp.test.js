// @vitest-environment node

import { describe, expect, it } from "vitest";
import webclientPackage from "../src/index.cjs";

const { parseXmppChatMessage } = webclientPackage;

describe("xmpp parsing", () => {
  it("parses chat stanza author/body", () => {
    const parsed = parseXmppChatMessage('<message from="tiktok/alice"><body>hello</body></message>');

    expect(parsed).toEqual({
      author: "alice",
      message: "hello",
    });
  });

  it("decodes xml entities", () => {
    const parsed = parseXmppChatMessage("<message from='tiktok/bob'><body>&lt;oi&gt; &amp; ok</body></message>");

    expect(parsed).toEqual({
      author: "bob",
      message: "<oi> & ok",
    });
  });

  it("returns null for invalid payload", () => {
    expect(parseXmppChatMessage("<features/>")).toBeNull();
    expect(parseXmppChatMessage("<message><body>   </body></message>")).toBeNull();
  });
});
