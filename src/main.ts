/**
 * This file will automatically be loaded by electron and run in the "main" context.
 * This is your "backend"
 * To learn more about the differences between the "main" and the "renderer" context in
 * Electron, visit:
 *
 * https://electronjs.org/docs/tutorial/application-architecture#main-and-renderer-processes
 */

import { app } from "electron";
import Store from "electron-persist-secure/lib/store";
// Import all IPCs to make sure they register their respective listeners
import "./app/ipc/main";
import { spawnBrowser, spawnImpervious, initDownloadInfo, macUpdaterLogic, macMoveToApplications, winUpdaterLogic, windowsBrowserKiller } from "./module";
import { changePortNix } from "./config_port";
import unhandled from "electron-unhandled";
import log from "electron-log";
import os from "os";

// global exception handler
unhandled({
  logger: () => log.error(),
});

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (require("electron-squirrel-startup")) {
  // eslint-disable-line global-require
  app.quit();
}

// Make sure to call this ONCE.
const createStores = (): void => {
  new Store({
    configName: "config", // The stores name
  });
};

const gotTheLock = app.requestSingleInstanceLock()

if (!gotTheLock) {
  app.quit()
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.

app.on("ready", async () => {

  if (process.platform !== "win32") { // old linux/macs may have been on port 8080 before
    changePortNix();
  }


  createStores();
  if (process.platform === "darwin" && !app.isInApplicationsFolder()) {
    await macMoveToApplications();
  }
  macUpdaterLogic();
  winUpdaterLogic();

  console.log("[INFO] Setting versioning.json logic");
  await initDownloadInfo();

  console.log("[INFO] Spawning the impervious daemon");
  spawnImpervious();
  console.log("[INFO] Spawning the impervious browser");
  spawnBrowser();
  if (os.platform() === "darwin") {
    app.dock.hide();
  }
});

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on("window-all-closed", () => {
  console.log("Running as background manager. No windows open. Not quitting")
  // if (process.platform !== "darwin" && process.platform !== "linux") { // also, we dont want electron to die on linux either as it triggers 'before-quit' section below where all pids are killed. May not want this for windows in the future either..
  //   app.quit();
  // }
});

export const pids: Array<number> = []; // holds pids of daemon and browser window so we can kill them later

app.on("before-quit", async () => {
  // when browser closes, it will fire close(). this will kill daemon and ensure daemon always dies when electron or firefox goes away
  console.info("Pids in list: ", pids);
  pids.forEach((pid) => {
    try {
      process.kill(pid);
    } catch (error) {
      console.error("Error in PID deletion: ", error.message);
    }
  });
  try {
    await windowsBrowserKiller() // not sure if this will fire, but here just in case
  } catch (err) {
    console.error(err);
  }

});

app.on("activate", () => {
  // On OS X it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  // if (BrowserWindow.getAllWindows().length === 0) {
  //   createWindow();
  // }
});
