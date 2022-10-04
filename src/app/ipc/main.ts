import { app, BrowserWindow, ipcMain } from "electron";
import {
  spawnBrowser,
  spawnImpervious,
  downloadDaemon,
  downloadBrowser,
} from "../../module";

interface DaemonPayload {
  browserVersion: string;
  daemonVersion: string;
}

ipcMain.on("quit-app", () => {
  app.quit();
});

ipcMain.on("minimize-app", () => {
  if (process.platform === "darwin") {
    app.hide();
    return;
  }
  BrowserWindow.getFocusedWindow()?.minimize();
});

ipcMain.on("maximize-app", () => {
  BrowserWindow.getFocusedWindow()?.maximize();
});

ipcMain.on("relaunch-app", () => {
  app.relaunch();
  app.exit(0);
});

ipcMain.on("download-browser-and-daemon", async (event, { payload }) => {
  const { browserVersion, daemonVersion } = payload as DaemonPayload;
  // use the payload later to download specific versions
  console.log("Downloading the daemon now ...");
  await downloadDaemon(daemonVersion)
    .then(() => {
      console.log("daemon downloaded, downloading browser now ...");
      return downloadBrowser(browserVersion);
    })
    .then(() => {
      app.focus(); // doesnt do anything

      let window = BrowserWindow.getFocusedWindow();
      if (!window) {
        // if there isnt an active, focused window, get it
        const windowList = BrowserWindow.getAllWindows();
        if (windowList && windowList[0]) {
          window = windowList[0];
          window.show();
          window.focus();
          window.webContents.send("all-download-successful");
        }
      }
      if (window) {
        // if there is an active, focused window, send it
        window.webContents.send("all-download-successful");
      }

    })
    .catch((error) => {
      console.log(error);
      BrowserWindow.getFocusedWindow()?.webContents.send("download-error");
    });
});

ipcMain.on("close-and-deploy", (event, { payload: platform }) => {
  console.log("Attempting to spawn browser and daemon again.");
  BrowserWindow.getFocusedWindow()?.close();
  // attempt to launch them both again
  spawnImpervious();
  spawnBrowser();
  if (platform === "darwin") {
    app.dock.hide();
  }
});

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and import them in main.ts.
