# @reino-doce/streaming-chat-webclient

Reusable WebSocket/XMPP client used by Chat Dock tools.

Repository: https://github.com/Reino-Doce/streaming-chat-webclient

## Workspace Packages

- Core package: `@reino-doce/streaming-chat-webclient`
- CLI companion: `@reino-doce/streaming-chat-webclient-cli` (English-only output/help)
- GUI companion: `@reino-doce/streaming-chat-webclient-gui` (localized UI: `en`, `pt-BR`)

## Install

```bash
npm install @reino-doce/streaming-chat-webclient
```

## API

- `createStreamingChatWebClient(args?)`
- `sanitizeConnectionOptions(raw, defaults?)`
- `buildWsUrl(options)`
- `parseXmppChatMessage(xmlText)`

## Quick Example

```js
const {
  createStreamingChatWebClient,
} = require("@reino-doce/streaming-chat-webclient");

const client = createStreamingChatWebClient();

client.onChat((event) => {
  console.log(`[chat] ${event.author}: ${event.message}`);
});

client.onSystem((event) => {
  console.log(`[system] ${event.message}`);
});

await client.connect({
  host: "127.0.0.1",
  port: 5443,
  token: "secret",
  protocol: "xmpp",
});
```

## Publish

```bash
npm publish --access public
```
