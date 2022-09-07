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

const finished = promisify(stream.finished);
import log from "electron-log";
import { pids } from "./main"; // an array of pids that we want to kill when browser or electron closes



const user = os.userInfo().username;

const homePath =
  os.platform() === "darwin"
    ? `/Users/${user}`
    : `/home/${user}`;
console.log(homePath);
const impDir = homePath + "/Impervious/"
fs.mkdirSync(impDir, { recursive: true });
fs.mkdirSync(homePath + "/.imp/", { recursive: true });

const newBrowserPath = impDir + "browser/";
const newDaemonPath = impDir + "daemon/";

fs.mkdirSync(newBrowserPath, { recursive: true });
fs.mkdirSync(newDaemonPath, { recursive: true });

fs.mkdirSync(`${newDaemonPath}/config/`, { recursive: true });

const newDaemonConfigPath = newDaemonPath + "config/config.yml";


const baseURL = "https://artifacts.imp-api.net";
let daemonDownloadURL = `${baseURL}/impervious-daemon/Impervious`;
let browserDownloadURL = `${baseURL}/impervious-browser/Impervious`;
const daemonConfigDownloadURL =
  "https://raw.githubusercontent.com/imperviousai/imp-launcher/enable-linux-build/config.yml";

if (os.platform() === "darwin") {
  if (os.arch() === "arm64") {
    daemonDownloadURL = `${daemonDownloadURL}-macosx_arm64.zip`;
    browserDownloadURL = `${browserDownloadURL}-macosx_arm64.zip`;
  } else {
    daemonDownloadURL = `${daemonDownloadURL}-macosx_amd64.zip`;
    browserDownloadURL = `${browserDownloadURL}-macosx_amd64.zip`;
  }
} else {
  // default to linux for now
  daemonDownloadURL = `${daemonDownloadURL}-linux_amd64.zip`;
  browserDownloadURL = `${browserDownloadURL}-linux_amd64.zip`;
}

export const spawnImpervious = () => {
  console.log("Checking for daemon config file");
  access(newDaemonConfigPath, constants.F_OK, (err) => {
    if (err) {
      log.info(`STDERR: ${err.code as string}, REASON: ${err.message}`);
      log.info(
        "[STDERR] The Daemon config file doesn't exists. Fetching it now ..."
      );
      downloadDaemonConfig();
    }
  });
  const filepath = newDaemonPath + "impervious";
  access(filepath, constants.F_OK, (err) => {
    if (err) {
      log.info(`STDERR: ${err.code as string}, REASON: ${err.message}`);
      log.info("[STDERR] The Daemon doesn't exists. Fetching it now ...");
      if (BrowserWindow.getAllWindows().length === 0) createWindow();
      return;
    }

    const imp = spawn(filepath, ["--config", newDaemonConfigPath], {
      cwd: newDaemonPath,
      shell: true,
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

const getS3URL = async (url: string) => {
  return axios({
    method: "get",
    url,
  });
};


const downloadDaemonConfig = async () => {
  try {
    const file = fs.createWriteStream(newDaemonConfigPath);
    const response = await axios.get(daemonConfigDownloadURL, { responseType: "stream"} );
    console.log(response);
    await response.data.pipe(file);
    console.log("Downloaded config file...");
  } catch (err) {
    console.error("Failed to download config file...", err.message);
  }
}

const download = async (downloadURL: string, outputPath: string) => {
  const s3URL = await getS3URL(downloadURL);

  const file = fs.createWriteStream(outputPath);
  return axios({
    method: "get",
    url: s3URL.data,
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
    console.error("Daemon download failure...");
  }
  try {
    await extract(newDaemonPath + "impervious.zip", { dir: newDaemonPath });
    console.log("Daemon extract completed...");
  } catch (err) {
    console.error("Daemon extraction failure...");
  }
}

export const downloadBrowser = async (version: string) => {
  try {
    await download(browserDownloadURL, newBrowserPath + "impervious-browser.zip")
    console.log("Browser download completed...");
  } catch (err) {
    console.error("Browser download failure...");
  }
  try {
    await extract(newBrowserPath + "impervious-browser.zip", { dir: newBrowserPath });
    console.log("Browser extract completed...");
  } catch (err) {
    console.error("Browser extraction failure...");
  }
}