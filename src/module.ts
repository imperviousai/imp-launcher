import { app, BrowserWindow } from "electron";
import fs from "fs";
import { access, constants } from "node:fs";
import { spawn } from "child_process";
import extract from "extract-zip";
import axios from "axios";
import stream from "stream";
import { promisify } from "util";
import { createWindow } from "./main";
import os from "os";
import tar from "tar";

const finished = promisify(stream.finished);
import log from "electron-log";
import { pids } from "./main"; // an array of pids that we want to kill when browser or electron closes



const user = os.userInfo().username;

const homePath =
  os.platform() === "darwin"
    ? `/Users/${user}`
    : `/home/${user}`;
const impDir = homePath + "/Impervious/"
fs.mkdirSync(impDir, { recursive: true });
fs.mkdirSync(homePath + "/.imp/", { recursive: true });

const newBrowserPath = impDir + "browser/";
const newDaemonPath = impDir + "daemon/";

fs.mkdirSync(newBrowserPath, { recursive: true });
fs.mkdirSync(newDaemonPath, { recursive: true });


let daemonDownloadURL:string = "";
let browserDownloadURL:string = "";


(async () => {
  const latestDaemon = await axios.get('https://api.github.com/repos/imperviousai/imp-daemon/releases/latest');
  const latestBrowser = await axios.get('https://api.github.com/repos/imperviousai/imp-browser/releases/latest');

  if (os.platform() === "darwin") {
    if (os.arch() === "arm64") {
      latestDaemon.data.assets.forEach((asset: any) => {if (asset.browser_download_url.match(/impervious.*?darwin.*?arm64\.zip$/g)) daemonDownloadURL = asset.browser_download_url});
      latestBrowser.data.assets.forEach((asset: any) => {if (asset.browser_download_url.match(/Impervious\-macosx_arm64\.zip$/g)) browserDownloadURL = asset.browser_download_url});
    } else {
      latestDaemon.data.assets.forEach((asset: any) => {if (asset.browser_download_url.match(/impervious.*?darwin.*?amd64\.zip$/g)) daemonDownloadURL = asset.browser_download_url});
      latestBrowser.data.assets.forEach((asset: any) => {if (asset.browser_download_url.match(/Impervious\-macosx_amd64\.zip$/g)) browserDownloadURL = asset.browser_download_url});
    }
  }
  else if (os.platform() === "linux") {
    if (os.arch() === "x64") {
      latestDaemon.data.assets.forEach((asset: any) => {if (asset.browser_download_url.match(/impervious.*?linux.*?amd64\.zip$/g)) daemonDownloadURL = asset.browser_download_url});
      latestBrowser.data.assets.forEach((asset: any) => {if (asset.browser_download_url.match(/Impervious\-linux_amd64\.zip$/g)) browserDownloadURL = asset.browser_download_url});
    }
  }
  else {
    console.error("Unsupported OS or arch. Exiting");
    process.exit();
  }

})();


export const spawnImpervious = () => {
  console.log("Checking for daemon config file");
  const filepath = newDaemonPath + "impervious";
  access(filepath, constants.F_OK, (err) => {
    if (err) {
      console.error("SpawnImpervious error: ", err.message);
      log.info(`STDERR: ${err.code as string}, REASON: ${err.message}`);
      log.info("[STDERR] The Daemon doesn't exists. Fetching it now ...");
      if (BrowserWindow.getAllWindows().length === 0) createWindow();
      return;
    }

    const imp = spawn(filepath, {
      cwd: newDaemonPath,
      shell: false,
    });

    try {
      if (imp.pid) {
        pids.push(imp.pid);
      } else {
        console.log("Failed to spawn daemon and push pid");
      }
    } catch (error) {
      log.error(error);
    }

    imp.stdout.on("data", (data: string) => {
      log.info(`[STDOUT] ${data.toString()}`);
    });
    imp.stderr.on("data", (data: string) => {
      log.error(`[STDERR] ${data.toString()}`);
    });
    imp.on("close", () => {
      log.info("[INFO] The Daemon has shut off");
    });
  });
};

export const spawnBrowser = () => {
  const filepath =
    os.platform() === "darwin"
      ? newBrowserPath + "Impervious.app"
      : newBrowserPath + "Impervious";
  access(filepath, constants.F_OK, (err) => {
    if (err) {
      log.info(`STDERR: ${err.code as string}, REASON: ${err.message}`);
      log.info(
        "[STDERR] The browser doesn't appear to be installed. Fetching it now ..."
      );
      if (BrowserWindow.getAllWindows().length === 0) createWindow();
      return;
    }
    const browserExecutable =
      os.platform() === "darwin"
        ? `${filepath}/Contents/MacOS/Impervious`
        : `${filepath}/Impervious`;
    const browser = spawn(browserExecutable, {
      cwd: filepath,
      detached: true,
    });

    app.focus(); // bring app back to foreground

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
  });
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