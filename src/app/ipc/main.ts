import { app, BrowserWindow, ipcMain } from "electron";

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
