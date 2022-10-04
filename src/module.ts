import { app, BrowserWindow } from "electron";
import fs from "fs";
import { access, constants } from "node:fs";
import { ChildProcess, spawn } from "child_process";
import extract from "extract-zip";
import axios from "axios";
import stream from "stream";
import { promisify } from "util";
import { createWindow } from "./main";
import os from "os";
import psList from "ps-list";


const finished = promisify(stream.finished);
import log from "electron-log";
import { pids } from "./main"; // an array of pids that we want to kill when browser or electron closes



const user = os.userInfo().username;

const homePath =
  os.platform() === "darwin"
    ? `/Users/${user}`
    : `/home/${user}`;
const binDir = homePath + "/Impervious/"
const impDir = homePath + "/.imp/"
fs.mkdirSync(binDir, { recursive: true });
fs.mkdirSync(impDir, { recursive: true });

const newBrowserPath = binDir + "browser/";
const newDaemonPath = binDir + "daemon/";

fs.mkdirSync(newBrowserPath, { recursive: true });
fs.mkdirSync(newDaemonPath, { recursive: true });


let daemonDownloadURL:string = "";
let browserDownloadURL:string = "";
let launcherDownloadURL:string = "";


export const initDownloadInfo = async () => {
  try {
  const latestDaemon = await axios.get('https://releases.impervious.live/imp-daemon');
  const latestBrowser = await axios.get('https://releases.impervious.live/imp-browser');
  const latestLauncher = await axios.get('https://releases.impervious.live/imp-launcher')

  if (os.platform() === "darwin") {
    if (os.arch() === "arm64") {
      latestDaemon.data.assets.forEach((asset: any) => {if (asset.browser_download_url.match(/impervious.*?darwin.*?arm64\.zip$/g)) daemonDownloadURL = asset.browser_download_url});
      latestBrowser.data.assets.forEach((asset: any) => {if (asset.browser_download_url.match(/Impervious\-macosx_arm64\.zip$/g)) browserDownloadURL = asset.browser_download_url});
      latestLauncher.data.assets.forEach((asset: any) => {if (asset.browser_download_url.match(/Impervious.*?darwin.*?arm64.*?\.zip$/g)) launcherDownloadURL = asset.browser_download_url});
    } else {
      latestDaemon.data.assets.forEach((asset: any) => {if (asset.browser_download_url.match(/impervious.*?darwin.*?amd64\.zip$/g)) daemonDownloadURL = asset.browser_download_url});
      latestBrowser.data.assets.forEach((asset: any) => {if (asset.browser_download_url.match(/Impervious\-macosx_amd64\.zip$/g)) browserDownloadURL = asset.browser_download_url});
      latestLauncher.data.assets.forEach((asset: any) => {if (asset.browser_download_url.match(/Impervious.*?darwin.*?x64.*?\.zip$/g)) launcherDownloadURL = asset.browser_download_url});
    }
  }
  else if (os.platform() === "linux") {
    if (os.arch() === "x64") {
      latestDaemon.data.assets.forEach((asset: any) => {if (asset.browser_download_url.match(/impervious.*?linux.*?amd64\.zip$/g)) daemonDownloadURL = asset.browser_download_url});
      latestBrowser.data.assets.forEach((asset: any) => {if (asset.browser_download_url.match(/Impervious\-linux_amd64\.zip$/g)) browserDownloadURL = asset.browser_download_url});
      latestLauncher.data.assets.forEach((asset: any) => {if (asset.browser_download_url.match(/Impervious.*?linux.*?x64.*?\.zip$/g)) launcherDownloadURL = asset.browser_download_url});
    }
  }
  else {
    console.error("Unsupported OS or arch. Exiting");
    process.exit();
  }
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
      daemonRespawn(spawn(filepath, {
        cwd: newDaemonPath,
        shell: false,
    }), filepath);
    } catch (err) {
      console.error("Failed to spawn daemon in daemonRespawn");
    }
  });
}


export const spawnImpervious = () => {
  console.log("Checking for daemon config file");
  const filepath = newDaemonPath + "impervious";
  access(filepath, constants.F_OK, async (err) => {
    if (err) {
      console.error("SpawnImpervious error: ", err.message);
      log.info(`STDERR: ${err.code as string}, REASON: ${err.message}`);
      log.info("[STDERR] The Daemon doesn't exists. Fetching it now ...");
      if (BrowserWindow.getAllWindows().length === 0) createWindow();
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


      daemonRespawn(spawn(filepath, {  // this should ensure daemon always runs as long as electron is alive
        cwd: newDaemonPath,
        shell: false,
    }), filepath);

    if (alreadyRunning) { // if its already running, dont try to start it again
      console.log("Daemon already running...");
      //return;
    }

    try {
      daemonRespawn(spawn(filepath, {  // this should ensure daemon always runs as long as electron is alive
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
    os.platform() === "darwin"
      ? newBrowserPath + "Impervious.app"
      : newBrowserPath + "Impervious";

  try {
    access(filepath, constants.F_OK, (err) => {
      if (err) {
        console.error("SpawnImpervious error: ", err.message);
        log.info(`STDERR: ${err.code as string}, REASON: ${err.message}`);
        log.info("[STDERR] The Daemon doesn't exists. Fetching it now ...");
        if (BrowserWindow.getAllWindows().length === 0) createWindow();
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


const download = async (downloadURL: string, outputPath: string) => {
  const file = fs.createWriteStream(outputPath);
  return await axios({
    method: "get",
    url: downloadURL,
    responseType: "stream",
  })
    .then(async (response) => {
      response.data.pipe(file);
      file
        .on("finish", () => {
          log.info("File download completed.");
        })
        .on("close", () => {
          log.info("File successfully closed");
        })
        .on("error", (err) => {
          log.error("ERROR: ", err);
        });
      return await finished(file);
    })
    .catch((err) => {
      log.info(err);
    });
};

export const downloadDaemon = async (version: string) => {
  try {
    await download(daemonDownloadURL, newDaemonPath + "impervious.zip");
    console.log("Daemon download completed...");
  } catch (err) {
    console.error("Daemon download failure... ", err.message);
  }
  try {
    await extract(newDaemonPath + "impervious.zip", { dir: newDaemonPath });
    console.log("Daemon extract completed...");
  } catch (err) {
    console.error("Daemon extraction failure... ", err.message);
  }
}

export const downloadBrowser = async (version: string) => {
  try {
    await download(browserDownloadURL, newBrowserPath + "impervious-browser.zip")
    console.log("Browser download completed...");
  } catch (err) {
    console.error("Browser download failure... ", err.message);
  }
  try {
    await extract(newBrowserPath + "impervious-browser.zip", { dir: newBrowserPath });
    console.log("Browser extract completed...");
  } catch (err) {
    console.error("Browser extraction failure... ", err.message);
  }
}
