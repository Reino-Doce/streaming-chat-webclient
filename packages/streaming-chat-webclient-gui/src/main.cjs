const path = require("path");
const { app, BrowserWindow, screen } = require("electron");
const { resolveLaunchOptions } = require("./launch-options.cjs");

const DOCK_WIDTH = 460;
const DOCK_HEIGHT = 320;
const DOCK_MARGIN = 16;
const ICON_PATH = path.join(__dirname, "docinho.ico");

let dockWindow = null;

app.disableHardwareAcceleration();
app.commandLine.appendSwitch("disable-gpu");
app.commandLine.appendSwitch("disable-gpu-compositing");

function getDockBounds() {
  const display = screen.getPrimaryDisplay();
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

function createDockWindow(query) {
  if (dockWindow && !dockWindow.isDestroyed()) return dockWindow;

  dockWindow = new BrowserWindow({
    ...getDockBounds(),
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
    icon: ICON_PATH,
    webPreferences: {
      preload: path.join(__dirname, "preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
      webSecurity: true,
    },
  });

  dockWindow.setAlwaysOnTop(true, "floating");
  dockWindow.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
  dockWindow.removeMenu();

  dockWindow.once("ready-to-show", () => {
    if (!dockWindow || dockWindow.isDestroyed()) return;
    dockWindow.show();
  });

  dockWindow.on("closed", () => {
    dockWindow = null;
  });

  dockWindow.loadFile(path.join(__dirname, "index.html"), { query });
  return dockWindow;
}

function repositionDockWindow() {
  if (!dockWindow || dockWindow.isDestroyed()) return;
  dockWindow.setBounds(getDockBounds(), false);
}

app.whenReady().then(() => {
  const launch = resolveLaunchOptions();
  createDockWindow(launch.query);
  screen.on("display-metrics-changed", repositionDockWindow);
});

app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    const launch = resolveLaunchOptions();
    createDockWindow(launch.query);
  }
});

app.on("window-all-closed", () => {
  app.quit();
});

module.exports = {
  createDockWindow,
  getDockBounds,
  resolveLaunchOptions,
};
