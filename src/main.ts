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
import { spawnBrowser, spawnImpervious, initDownloadInfo, macUpdaterLogic, macMoveToApplications } from "./module";
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

  createStores();
  if (process.platform === "darwin" && !app.isInApplicationsFolder()) {
    await macMoveToApplications();
  }
  macUpdaterLogic();

  console.log("[INFO] Setting up download URLs");
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
  if (process.platform !== "darwin" && process.platform !== "linux") { // also, we dont want electron to die on linux either as it triggers 'before-quit' section below where all pids are killed. May not want this for windows in the future either..
    app.quit();
  }
});

export const pids: Array<number> = []; // holds pids of daemon and browser window so we can kill them later

app.on("before-quit", () => {
  // when browser closes, it will fire close(). this will kill daemon and ensure daemon always dies when electron or firefox goes away
    console.info("Pids in list: ", pids);
    pids.forEach((pid) => {
     try {
      process.kill(pid);
     } catch (error) {
       console.error("Error in PID deletion: ", error.message);
     }
    });
});

app.on("activate", () => {
  // On OS X it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  // if (BrowserWindow.getAllWindows().length === 0) {
  //   createWindow();
  // }
});
