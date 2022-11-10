import { app, Tray, Menu, dialog } from "electron";
import fs from "fs";
import { access, constants, accessSync } from "node:fs";
import { ChildProcess, spawn, spawnSync } from "child_process";
import extract from "extract-zip";
import os, { homedir } from "os";
import psList from "ps-list";
import { rootPath as root } from 'electron-root-path';
import path, { resolve } from 'path'

import log from "electron-log";
import { pids } from "./main"; // an array of pids that we want to kill when browser or electron closes


// eslint-disable-next-line @typescript-eslint/no-unsafe-argument
const electronDaemonPath = path.join(root, 'daemon');
// eslint-disable-next-line @typescript-eslint/no-unsafe-argument
const electronBrowserPath = path.join(root, 'browser');

const binDir = path.join(homedir(), "Impervious")
const impDir = path.join(homedir(), ".imp")

const newBrowserPath = path.join(binDir, "browser")
const newDaemonPath = path.join(binDir, "daemon")

fs.mkdirSync(newBrowserPath, { recursive: true });
fs.mkdirSync(newDaemonPath, { recursive: true });
fs.mkdirSync(binDir, { recursive: true });
fs.mkdirSync(impDir, { recursive: true });

const versioningFile:string = path.join(impDir, "versioning.json");


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

          console.log("Clean up directories")
          fs.rmdirSync(newBrowserPath, { recursive: true });
          fs.rmdirSync(newDaemonPath, { recursive: true });

          console.log("Recreating empty dirs");
          fs.mkdirSync(newBrowserPath, { recursive: true });
          fs.mkdirSync(newDaemonPath, { recursive: true });

          console.log("Attempting to unzip Resources");

          if (process.platform === "darwin"){ // cause we are special
            dittoExtract(path.join(electronBrowserPath, "Impervious.zip"), newBrowserPath);
            dittoExtract(path.join(electronDaemonPath, "impervious.zip"), newDaemonPath);
          } else {
            await extract(path.join(electronBrowserPath, "Impervious.zip") , {dir: newBrowserPath});
            await extract(path.join(electronDaemonPath, "impervious.zip") , {dir: newDaemonPath});
            console.log("Resources extracted");
          }

      } catch (err) {
        console.error("Error in extract block of initDownloads", err.message);
      }
      }
}

const dittoExtract = (sourceZip:string, outDir:string) => {
  try {
    const ditto = spawnSync(
      "ditto",
      ["-x", "-k", sourceZip, outDir],
      {
        cwd: binDir
      }
      );
    if (ditto.error){
      console.error(ditto.error);
      dialog.showErrorBox("Error in Ditto Extraction", "There was an error while trying to extract resources via ditto.");
      app.quit();
      return;
    }
  } catch (err) {
    console.error(err);
  }

}

export const macMoveToApplications = async () => {
    return new Promise(() => {
      try {
          app.moveToApplicationsFolder(); // ensure we arent a translocated app in r/o
          resolve() // resolve once this block completes
      } catch (err){
        console.error("Error in main when moving to /applications");
      }
    })
}

export const macUpdaterLogic = () => {
  if (process.platform === "darwin"){
    try {
        if (app.isInApplicationsFolder()){

        // eslint-disable-next-line @typescript-eslint/no-var-requires
        require('update-electron-app')({
          repo: 'imperviousai/imp-launcher',
          updateInterval: '1 hour',
          logger: log
         })
        }
      } catch (err){
        console.error("Error in macUpdaterLogic");
      }
   }
}

export const winUpdaterLogic = () => {
  if (process.platform === "win32"){
    try {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        require('update-electron-app')({
          repo: 'imperviousai/imp-launcher',
          updateInterval: '1 hour',
          logger: log
         })
      } catch (err){
        console.error("Error in winUpdaterLogic");
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
    if (data.toString().includes("bind: address already in use")){
      dialog.showErrorBox("Error In Daemon Spawn: Port Already In Use", "It appears the config file that was used references a port that is already in use. Impervious requires TCP ports 8881, 8882, 8883, and 8888.")
      app.quit()
      return
    }
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
  //const filepath = newDaemonPath + "impervious";
  const filepath =
    process.platform !== "win32"
    ? path.join(newDaemonPath, "impervious")
    : path.join(newDaemonPath, "impervious.exe")
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

        if (process.platform !== "win32"){
          if (proc.cmd?.includes("daemon/impervious")) {
            console.log("Found running match: ", proc.cmd)
            alreadyRunning = true;
            process.kill(proc.pid); // kill any previous daemons in process list
          }
        // } else {
        //   if (proc.name?.includes("impervious.exe")) {
        //     console.log("Found running match: ", proc.name)
        //     alreadyRunning = true;
        //     process.kill(proc.pid); // kill any previous daemons in process list
        //   }
        }
      }
      // if (process.platform === "win32" && alreadyRunning){
      //   app.relaunch();
      //   app.quit();
      // }
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

  let browserExecutable:string;

  const filepath =
    process.platform === "darwin"
    ? path.join(newBrowserPath, "Impervious.app")
    : path.join(newBrowserPath, "Impervious");


  try {
    access(filepath, constants.F_OK, (err) => {
      if (err) {
        console.error("SpawnImpervious error: ", err.message);
        log.info(`STDERR: ${err.code as string}, REASON: ${err.message}`);
        log.info("[STDERR] The Daemon doesn't exists. Fetching it now ...");
        return;
      }
    // const browserExecutable =
    //   os.platform() === "darwin"
    //     ? `${filepath}/Contents/MacOS/Impervious`
    //     : `${filepath}/Impervious`;



        switch(process.platform){
          case "darwin":
            browserExecutable = path.join(filepath, "Contents", "MacOS", "Impervious");
            break;
          case "linux":
            browserExecutable = path.join(filepath, "Impervious");
            break;
          case "win32":
            browserExecutable = path.join(filepath, "Impervious.exe"); // default to windows for now
            break;
        }

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
