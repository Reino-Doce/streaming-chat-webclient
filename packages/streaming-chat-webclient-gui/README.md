# @reino-doce/streaming-chat-webclient-gui

Standalone Electron Chat Dock GUI powered by `@reino-doce/streaming-chat-webclient`.

Repository: https://github.com/Reino-Doce/streaming-chat-webclient/tree/main/packages/streaming-chat-webclient-gui

## Run

From this package folder:

```bash
npx electron src/main.cjs --host 127.0.0.1 --port 5443 --token my-token --autoconnect true
```

## Embed In Another Electron App

Import the package in your Electron main process and create the dock window on demand.

```js
const { app } = require("electron");
const { createChatDockWindow } = require("@reino-doce/streaming-chat-webclient-gui");

app.whenReady().then(() => {
  createChatDockWindow({
    query: {
      host: "127.0.0.1",
      port: "5443",
      token: "my-token",
      autoconnect: "1",
    },
  });
});
```

The package entry no longer auto-starts when imported. Standalone behavior is still available when running `src/main.cjs` directly with Electron.

## Launch Options

- `--host <host>`
- `--port <port>`
- `--token <token>`
- `--autoconnect <true|false>`

## Localization

- GUI supports `en` and `pt-BR`.
- Locale selection priority:
  1. URL query param `lang` (for embedded/custom launch flows)
  2. Saved GUI preference
  3. System/browser locale
- Users can switch language from the settings panel (`Language` selector).
- Current packaged launch options do not expose a direct `--lang` flag.

## Environment Fallbacks

- `RD_CHAT_DOCK_HOST`
- `RD_CHAT_DOCK_PORT`
- `RD_CHAT_DOCK_TOKEN`
- `RD_CHAT_DOCK_AUTOCONNECT`

CLI args override environment values.

## Publish

```bash
npm publish --workspace packages/streaming-chat-webclient-gui --access public
```
