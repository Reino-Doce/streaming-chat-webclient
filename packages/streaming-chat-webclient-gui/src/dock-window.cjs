const path = require("path");

const DOCK_WIDTH = 460;
const DOCK_HEIGHT = 320;
const DOCK_MARGIN = 16;
const ICON_PATH = path.join(__dirname, "docinho.ico");
const PRELOAD_PATH = path.join(__dirname, "preload.cjs");
const INDEX_PATH = path.join(__dirname, "index.html");

let dockWindow = null;

function asObject(value, fallback = {}) {
  return value && typeof value === "object" ? value : fallback;
}

function asString(value, fallback = "") {
  const text = String(value ?? fallback);
  return text === "undefined" || text === "null" ? fallback : text;
}

function getElectronRuntime(explicitRuntime) {
  const runtime = explicitRuntime || require("electron");
  if (!runtime || typeof runtime !== "object") {
    throw new Error("Chat Dock requires an Electron runtime.");
  }

  if (typeof runtime.BrowserWindow !== "function" || !runtime.screen) {
    throw new Error("Chat Dock requires Electron main process APIs.");
  }

  return runtime;
}

function getDockBounds(args = {}) {
  const runtime = getElectronRuntime(args.electron);
  const display = runtime.screen.getPrimaryDisplay();
  const area = display?.workArea || {};
  const x = Number.isFinite(area.x) ? area.x : 0;
  const y = Number.isFinite(area.y) ? area.y : 0;
  const width = Math.max(DOCK_WIDTH, Number.isFinite(area.width) ? area.width : DOCK_WIDTH);
  const height = Math.max(DOCK_HEIGHT, Number.isFinite(area.height) ? area.height : DOCK_HEIGHT);

  return {
    x: x + Math.max(0, Math.floor((width - DOCK_WIDTH) / 2)),
    y: y + Math.max(0, height - DOCK_HEIGHT - DOCK_MARGIN),
    width: DOCK_WIDTH,
    height: DOCK_HEIGHT,
  };
}

function buildBrowserWindowOptions(args = {}) {
  const runtime = getElectronRuntime(args.electron);
  const customOptions = asObject(args.browserWindowOptions, {});
  const customWebPreferences = asObject(customOptions.webPreferences, {});
  const preload = asString(args.preloadPath, PRELOAD_PATH).trim() || PRELOAD_PATH;
  const icon = asString(args.iconPath, ICON_PATH).trim() || ICON_PATH;

  const defaults = {
    ...getDockBounds({ electron: runtime }),
    minWidth: 380,
    minHeight: 240,
    maxWidth: 800,
    show: false,
    frame: false,
    thickFrame: true,
    resizable: true,
    maximizable: false,
    fullscreenable: false,
    autoHideMenuBar: true,
    alwaysOnTop: true,
    skipTaskbar: false,
    transparent: true,
    backgroundColor: "#00000000",
    title: "Chat Dock",
    icon,
    webPreferences: {
      preload,
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
      webSecurity: true,
    },
  };

  return {
    ...defaults,
    ...customOptions,
    webPreferences: {
      ...defaults.webPreferences,
      ...customWebPreferences,
    },
  };
}

function createChatDockWindow(args = {}) {
  const runtime = getElectronRuntime(args.electron);
  const { BrowserWindow } = runtime;
  const singleton = args.singleton !== false;

  if (singleton && dockWindow && !dockWindow.isDestroyed()) {
    return dockWindow;
  }

  const query = asObject(args.query, {});
  const indexPath = asString(args.indexPath, INDEX_PATH).trim() || INDEX_PATH;
  const browserWindowOptions = buildBrowserWindowOptions({
    ...args,
    electron: runtime,
  });
  const window = new BrowserWindow(browserWindowOptions);

  window.setAlwaysOnTop(true, "floating");
  window.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
  window.removeMenu();

  if (browserWindowOptions.show === false) {
    window.once("ready-to-show", () => {
      if (window.isDestroyed()) return;
      window.show();
    });
  }

  if (singleton) {
    dockWindow = window;
    window.on("closed", () => {
      if (dockWindow === window) {
        dockWindow = null;
      }
    });
  }

  window.loadFile(indexPath, { query });
  return window;
}

function repositionChatDockWindow(args = {}) {
  const runtime = getElectronRuntime(args.electron);
  const target = args.window || dockWindow;
  if (!target || target.isDestroyed()) return;
  target.setBounds(getDockBounds({ electron: runtime }), false);
}

function getChatDockWindow() {
  return dockWindow;
}

function createDockWindow(query = {}, args = {}) {
  const nextArgs = asObject(args, {});
  return createChatDockWindow({
    ...nextArgs,
    query: asObject(query, {}),
  });
}

function repositionDockWindow(args = {}) {
  repositionChatDockWindow(asObject(args, {}));
}

module.exports = {
  DOCK_WIDTH,
  DOCK_HEIGHT,
  DOCK_MARGIN,
  ICON_PATH,
  PRELOAD_PATH,
  INDEX_PATH,
  createChatDockWindow,
  repositionChatDockWindow,
  getChatDockWindow,
  getDockBounds,
  createDockWindow,
  repositionDockWindow,
};
