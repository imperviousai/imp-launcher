import {
  ipcRenderer,
  contextBridge,
  shell,
  OpenExternalOptions,
} from "electron";
import { createStoreBindings } from "electron-persist-secure/lib/bindings";
import os from "os";

type EventCallback = () => void;
type DownloadPayload = {
  payload: {
    browserVersion: string;
    daemonVersion: string;
  };
};

export const electronBridge = {
  quit: (): void => {
    ipcRenderer.send("quit-app");
  },

  minimize: (): void => {
    ipcRenderer.send("minimize-app");
  },

  maximize: (): void => {
    ipcRenderer.send("maximize-app");
  },

  relaunch: (): void => {
    ipcRenderer.send("relaunch-app");
  },

  openUrl: async (
    url: string,
    options?: OpenExternalOptions
  ): Promise<void> => {
    return await shell.openExternal(url, options);
  },

  openPath: async (path: string): Promise<string> => {
    return await shell.openPath(path);
  },

  downloadBrowserAndDaemon: (payload: DownloadPayload): void => {
    ipcRenderer.send("download-browser-and-daemon", payload);
  },

  closeAndDeploy: (): void => {
    ipcRenderer.send("close-and-deploy", os.platform());
  },

  on: (eventName: string, callback: EventCallback): void => {
    ipcRenderer.on(eventName, callback);
  },
};

contextBridge.exposeInMainWorld("electron", electronBridge);

export const storeBridge = createStoreBindings("config"); // "config" = the stores name

contextBridge.exposeInMainWorld("store", {
  ...storeBridge,
});