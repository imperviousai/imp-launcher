import { app, BrowserWindow } from "electron";
import fs from "fs";
import { access, constants } from "node:fs";
import { ChildProcess, spawn } from "child_process";
import extract from "extract-zip";
import os from "os";
import psList from "ps-list";
import { rootPath as root } from 'electron-root-path';
import path from 'path'

import log from "electron-log";
import { pids } from "./main"; // an array of pids that we want to kill when browser or electron closes



const user = os.userInfo().username;

const homePath =
  os.platform() === "darwin"
    ? `/Users/${user}`
    : `/home/${user}`;
const binDir =
  os.platform() === "darwin"
    ? homePath + "/Library/Application Support/Impervious/"
    : homePath + "/Impervious/"
const impDir =
  os.platform() === "darwin"
  ? homePath + "/Library/Application Support/Impervious/.imp/"
  : homePath + "/.imp/"
fs.mkdirSync(binDir, { recursive: true });
fs.mkdirSync(impDir, { recursive: true });

// eslint-disable-next-line @typescript-eslint/no-unsafe-argument
const electronDaemonPath = path.join(root, './daemon');
// eslint-disable-next-line @typescript-eslint/no-unsafe-argument
const electronBrowserPath = path.join(root, './browser');


export const initDownloadInfo = async () => {
  try {
    console.log("Attempting to unzip Resources");
    await extract(electronBrowserPath + "/Impervious.zip", {dir: electronBrowserPath});
    await extract(electronDaemonPath + "/impervious.zip", {dir: electronDaemonPath});
    console.log("Resources extracted");
} catch (err) {
  console.error("Error in initDownloadInfo", err.message);
}

}

const daemonRespawn = (imp:ChildProcess, filepath:string) => {

  try {
    if (imp.pid) {
      pids.push(imp.pid);
    } else {
      console.log("Failed to spawn daemon and push pid");
    }
  } catch (error) {
    log.error(error);
  }

  imp.stdout?.on("data", (data: string) => {
    log.info(`[STDOUT] ${data.toString()}`);
  });
  imp.stderr?.on("data", (data: string) => {
    log.error(`[STDERR] ${data.toString()}`);
  });
  imp.on("close", () => {
    log.info("[INFO] The Daemon has shut off");
    log.info("Attempting to restart the daemon.");
    try {
      daemonRespawn(spawn(filepath,
        {
        cwd: electronDaemonPath,
        shell: false,
    }), filepath);
    } catch (err) {
      console.error("Failed to spawn daemon in daemonRespawn");
    }
  });
}


export const spawnImpervious = () => {
  console.log("Checking for daemon binary file");
  const filepath = electronDaemonPath + "/impervious";
  access(filepath, constants.F_OK, async (err) => {
    if (err) {
      console.error("SpawnImpervious error: ", err.message);
      log.info(`STDERR: ${err.code as string}, REASON: ${err.message}`);
      log.info("[STDERR] The Daemon doesn't exists. Fetching it now ...");
      return;
    }

    let alreadyRunning = false;

    try {
      const runningProcesses = await psList();

      for (const proc of runningProcesses) {

        if (os.platform() === "darwin" || os.platform() === "linux"){
          if (proc.cmd?.includes("daemon/impervious")) {
            console.log("Found running match: ", proc.cmd)
            alreadyRunning = true;
            process.kill(proc.pid); // kill any previous daemons in process list
          }
        }
      }
    } catch (err) {
      console.error("Error in pre-existing daemon check", err.message);
    }

  if (alreadyRunning) { // if its already running, dont try to start it again
    console.log("Daemon already running...");
    //return;
  }

    try {
      daemonRespawn(spawn(filepath,
        {  // this should ensure daemon always runs as long as electron is alive
        cwd: electronDaemonPath,
        shell: false,
    }), filepath);
    } catch (err) {
      console.error("Failed to spawn daemon in spawnImpervious");
    }
  });
};

export const spawnBrowser = () => {
  const filepath =
    os.platform() === "darwin"
      ? electronBrowserPath + "/Impervious.app"
      : electronBrowserPath + "/Impervious";

  try {
    access(filepath, constants.F_OK, (err) => {
      if (err) {
        console.error("SpawnImpervious error: ", err.message);
        log.info(`STDERR: ${err.code as string}, REASON: ${err.message}`);
        log.info("[STDERR] The Daemon doesn't exists. Fetching it now ...");
        return;
      }
    const browserExecutable =
      os.platform() === "darwin"
        ? `${filepath}/Contents/MacOS/Impervious`
        : `${filepath}/Impervious`;

    try {
      const browser = spawn(browserExecutable, {
        cwd: filepath,
        detached: true,
      });
      if (browser.pid) {
        pids.push(browser.pid);
      } else {
        console.log("Failed to spawn browser and push pid");
      }


      app.focus();

      browser.stdout.on("data", (data: string) => {
        log.info(`[STDOUT] ${data.toString()}`);
      });
      browser.stderr.on("data", (data: string) => {
        log.error(`[STDERR] ${data.toString()}`);
      });
      browser.on("close", () => {
        log.info("[INFO] The browser has shut off");
        log.info("Killing the Daemon and Electron App");
        app.quit(); // close electron when browser closes
      });
    }
    catch (err) {
      console.error("");
    }
  });
} catch (err) {
  console.error("Error in access spawnBrowser");
}
};
