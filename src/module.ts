import { app, Tray, Menu } from "electron";
import fs from "fs";
import { access, constants, accessSync } from "node:fs";
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
// // const binDir =
// //   os.platform() === "darwin"
// //     ? homePath + "/Library/Application Support/Impervious/"
// //     : homePath + "/Impervious/"
// const impDir =
//   os.platform() === "darwin"
//   ? homePath + "/Library/Application Support/Impervious/.imp/"
//   : homePath + "/.imp/"
// // fs.mkdirSync(binDir, { recursive: true });
// fs.mkdirSync(impDir, { recursive: true });

// eslint-disable-next-line @typescript-eslint/no-unsafe-argument
const electronDaemonPath = path.join(root, './daemon');
// eslint-disable-next-line @typescript-eslint/no-unsafe-argument
const electronBrowserPath = path.join(root, './browser');





const binDir = homePath + "/Impervious/"
const impDir = homePath + "/.imp/"
fs.mkdirSync(binDir, { recursive: true });
fs.mkdirSync(impDir, { recursive: true });

const newBrowserPath = binDir + "browser/";
const newDaemonPath = binDir + "daemon/";

fs.mkdirSync(newBrowserPath, { recursive: true });
fs.mkdirSync(newDaemonPath, { recursive: true });

const versioningFile:string = impDir + "versioning.json";


export const initDownloadInfo = async () => {

  try {

  // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
  const tray:Tray = new Tray(path.join(root, 'whiteIcon16x16.png'));

  const menu = Menu.buildFromTemplate([
    {
      label: 'Close the Impervious Background Manager',
      click() { app. quit(); }
    }
  ])

  tray.setToolTip('Impervious Background Manager');
  tray.setContextMenu(menu);

  } catch (err) {
    console.error("Error in tray creation", err.message);
  }

      if (await checkForUpdates()){ // if the current app.version isnt the same as the versioning file, clean up and re-extract
        try {
          // console.log("Attempting to unzip Resources");
          // await extract(electronBrowserPath + "/Impervious.zip", {dir: electronBrowserPath});
          // await extract(electronDaemonPath + "/impervious.zip", {dir: electronDaemonPath});
          // console.log("Resources extracted");

          console.log("Clean up directories")
          fs.rmdirSync(newBrowserPath, { recursive: true });
          fs.rmdirSync(newDaemonPath, { recursive: true });

          console.log("Recreating empty dirs");
          fs.mkdirSync(newBrowserPath, { recursive: true });
          fs.mkdirSync(newDaemonPath, { recursive: true });

          console.log("Attempting to unzip Resources");
          await extract(electronBrowserPath + "/Impervious.zip", {dir: newBrowserPath});
          await extract(electronDaemonPath + "/impervious.zip", {dir: newDaemonPath});
          console.log("Resources extracted");

      } catch (err) {
        console.error("Error in extract block of initDownloads", err.message);
      }
      }
}


export const macUpdaterLogic = () => {
  if (process.platform === "darwin"){
    try {
      if (!app.isInApplicationsFolder()){
        app.moveToApplicationsFolder(); // ensure we arent a translocated app in r/o
      }
      if (app.isInApplicationsFolder()){

      // eslint-disable-next-line @typescript-eslint/no-var-requires
      require('update-electron-app')({
        repo: 'imperviousai/imp-launcher',
        updateInterval: '1 hour',
        logger: log
       })
      }
    } catch (err){
      console.error("Error in main when moving to /applications");
    }
   }
}


export const checkForUpdates = async () => {
  try {
    accessSync(versioningFile, constants.R_OK)
  } catch (err) {
    console.error("No versioning.json found. Writing defaults.");
    const versioningInfoDefaults = {
      launcherVersion: "0.0.0"
    }
    fs.writeFileSync(versioningFile, JSON.stringify(versioningInfoDefaults, null, 2));
    return true;
  }
  try {
    const versioningInfo = await JSON.parse(fs.readFileSync(versioningFile).toString());

    if (versioningInfo.launcherVersion !== app.getVersion()){
      versioningInfo.launcherVersion = app.getVersion()
      fs.writeFileSync(versioningFile, JSON.stringify(versioningInfo, null, 2));
      return true; // if versions are not the same, require further action
    }
    return false;

} catch (err) {
  console.error("Error in checkForDaemonUpdate", err.message);
}
}
}



export const writeVersionInformation = () => {

  try {
    accessSync(versioningFile, constants.R_OK)
  } catch (err) {
    console.error("No versioning.json found. Writing defaults.");
    const versioningInfoDefaults = {
      launcherVersion: "0.0.0"
    }
    fs.writeFileSync(versioningFile, JSON.stringify(versioningInfoDefaults, null, 2));
  }

  try {
    const versioningInfo = JSON.parse(fs.readFileSync(versioningFile).toString());

    versioningInfo.launcherVersion = app.getVersion()

    fs.writeFileSync(versioningFile, JSON.stringify(versioningInfo, null, 2));
  } catch (err) {
    console.error("Error reading versioning file in writeVersionInformation");
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
        cwd: newDaemonPath,
        shell: false,
    }), filepath);
    } catch (err) {
      console.error("Failed to spawn daemon in daemonRespawn");
    }
  });
}


export const spawnImpervious = () => {
  console.log("Checking for daemon binary file");
  // const filepath = electronDaemonPath + "/impervious";
  const filepath = newDaemonPath + "impervious";
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
        cwd: newDaemonPath,
        shell: false,
    }), filepath);
    } catch (err) {
      console.error("Failed to spawn daemon in spawnImpervious");
    }
  });
};

export const spawnBrowser = () => {
  const filepath =
    // os.platform() === "darwin"
    //   ? electronBrowserPath + "/Impervious.app"
    //   : electronBrowserPath + "/Impervious";

    os.platform() === "darwin"
    ? newBrowserPath + "Impervious.app"
    : newBrowserPath + "Impervious";


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
        detached: false,
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
