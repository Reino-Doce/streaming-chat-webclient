const { resolveLaunchOptions } = require("./launch-options.cjs");
const {
  createChatDockWindow,
  repositionChatDockWindow,
  getChatDockWindow,
  getDockBounds,
  createDockWindow,
  repositionDockWindow,
} = require("./dock-window.cjs");

let standaloneStarted = false;

function getElectronRuntime() {
  const runtime = require("electron");
  if (!runtime || typeof runtime !== "object") {
    throw new Error("Chat Dock standalone mode requires an Electron runtime.");
  }

  if (!runtime.app || typeof runtime.BrowserWindow !== "function" || !runtime.screen) {
    throw new Error("Chat Dock standalone mode requires Electron main process APIs.");
  }

  return runtime;
}

function applyElectronRuntimeSettings(electronApp) {
  const runtimeApp = electronApp || getElectronRuntime().app;

  if (typeof runtimeApp.disableHardwareAcceleration === "function") {
    runtimeApp.disableHardwareAcceleration();
  }

  if (runtimeApp.commandLine && typeof runtimeApp.commandLine.appendSwitch === "function") {
    runtimeApp.commandLine.appendSwitch("disable-gpu");
    runtimeApp.commandLine.appendSwitch("disable-gpu-compositing");
  }
}

function startStandaloneChatDock(args = {}) {
  if (standaloneStarted) return;
  standaloneStarted = true;

  const runtime = getElectronRuntime();
  const { app, BrowserWindow, screen } = runtime;
  const argv = Array.isArray(args.argv) ? args.argv : process.argv.slice(2);
  const env = args.env && typeof args.env === "object" ? args.env : process.env;

  applyElectronRuntimeSettings(app);

  const openDockWindow = () => {
    const launch = resolveLaunchOptions(argv, env);
    return createChatDockWindow({
      query: launch.query,
      electron: runtime,
    });
  };

  app.whenReady().then(() => {
    openDockWindow();
    screen.on("display-metrics-changed", () => {
      repositionChatDockWindow({ electron: runtime });
    });
  });

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      openDockWindow();
    }
  });

  app.on("window-all-closed", () => {
    app.quit();
  });
}

if (require.main === module) {
  startStandaloneChatDock();
}

module.exports = {
  startStandaloneChatDock,
  applyElectronRuntimeSettings,
  createChatDockWindow,
  repositionChatDockWindow,
  getChatDockWindow,
  createDockWindow,
  repositionDockWindow,
  getDockBounds,
  resolveLaunchOptions,
};
