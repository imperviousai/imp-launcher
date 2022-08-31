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
// import { getS3LikeProviderBaseUrl } from "builder-util-runtime";
const finished = promisify(stream.finished);
import log from "electron-log";
import { pids } from "./main"; // an array of pids that we want to kill when browser or electron closes

// TODO: Check if both the daemon and browser are installed, show installation window if either of them exist
// const daemonPath = path.join(__dirname, "../daemon/");
// const daemonConfigPath = path.join(__dirname, "../daemon/config/config.yml");
// const browserPath = path.join(__dirname, "../browser/");

// fs.mkdirSync(browserPath, { recursive: true });
// fs.mkdirSync(`${daemonPath}/config/`, { recursive: true });

//const homePath = `/Users/${process.env.USER}/Impervious/`;
const user = os.userInfo().username;
//const homePath = "/Users/" + process.env.USER + "/Impervious/"; works 100%
const homePath =
  os.platform() === "darwin"
    ? `/Users/${user}/Impervious/`
    : `/home/${user}/Impervious/`;
console.log(homePath);
fs.mkdirSync(homePath, { recursive: true });

const newBrowserPath = homePath + "browser/";
const newDaemonPath = homePath + "daemon/";

fs.mkdirSync(newBrowserPath, { recursive: true });
fs.mkdirSync(newDaemonPath, { recursive: true });

fs.mkdirSync(`${newDaemonPath}/config/`, { recursive: true });

const newDaemonConfigPath = newDaemonPath + "config/config.yml";

// returns a presigned URL which can then download the file
// api key header: x-api-key
// https://artifacts.imp-api.net/impervious-browser/Impervious.zip
// https://artifacts.imp-api.net/impervious-macos-arm64_darwin_arm64/impervious.zip

const baseURL = "https://artifacts.imp-api.net";
let daemonDownloadURL = `${baseURL}/impervious-daemon/Impervious`;
let browserDownloadURL = `${baseURL}/impervious-browser/Impervious`;
const daemonConfigDownloadURL =
  "https://raw.githubusercontent.com/imperviousai/imp-launcher/master/config.yml";

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
  const filepath = newBrowserPath + "Impervious.app";
  access(filepath, constants.F_OK, (err) => {
    if (err) {
      log.info(`STDERR: ${err.code as string}, REASON: ${err.message}`);
      log.info(
        "[STDERR] The browser doesn't appear to be installed. Fetching it now ..."
      );
      if (BrowserWindow.getAllWindows().length === 0) createWindow();
      return;
    }
    const browserExecutable = `${filepath}/Contents/MacOS/Impervious`;
    const browser = spawn(browserExecutable, {
      cwd: filepath,
      shell: true,
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

// will need to handle this
// const spawnInstallWindow = () => {
//   const mainWindow = new BrowserWindow({
//     width: 800,
//     height: 600,
//     webPreferences: {
//       disableBlinkFeatures: "Auxclick",
//       sandbox:
//         false /* eng-disable SANDBOX_JS_CHECK -- sandbox prevents node integration */,
//       nodeIntegration:
//         true /* eng-disable NODE_INTEGRATION_JS_CHECK -- need to communicate with node */,
//       contextIsolation: false /* eng-disable CONTEXT_ISOLATION_JS_CHECK*/,
//       preload: MAIN_WINDOW_PRELOAD_WEBPACK_ENTRY,
//     },
//   });

//   mainWindow.webContents.on("will-navigate", (event, newURL) => {
//     /* eng-disable LIMIT_NAVIGATION_JS_CHECK -- checked */
//     if (mainWindow.webContents.getURL() !== "http://localhost") {
//       event.preventDefault();
//     }
//   });

//   mainWindow.webContents.on("new-window", (event, newURL) => {
//     /* eng-disable LIMIT_NAVIGATION_JS_CHECK -- checked */
//     if (mainWindow.webContents.getURL() !== "http://localhost") {
//       event.preventDefault();
//     }
//   });

//   // and load the index.html of the app.
//   mainWindow.loadURL(MAIN_WINDOW_WEBPACK_ENTRY);

//   // Open the DevTools if in dev.
//   if (isDev) {
//     mainWindow.webContents.openDevTools();
//   }
// };

const getS3URL = async (url: string) => {
  return axios({
    method: "get",
    url,
  });
};

const downloadDaemonConfig = () => {
  const file = fs.createWriteStream(newDaemonConfigPath);
  return axios({
    method: "get",
    url: daemonConfigDownloadURL,
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

const download = async (downloadURL: string, outputPath: string) => {
  const s3URL = await getS3URL(downloadURL);

  // unable to download private assets for some weird reason, seems like the authorization
  // header is being ignored
  const file = fs.createWriteStream(outputPath);
  return axios({
    method: "get",
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    url: s3URL.data,
    responseType: "stream",
    // TODO: required for pulling resources from private github repo
    // headers: {
    //   authorization: `token ${process.env.GITHUB_PAT}`,
    // },
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

export const downloadDaemon = (version: string) => {
  return new Promise((resolve, reject) => {
    download(daemonDownloadURL, newDaemonPath + "impervious.zip")
      .then(() => {
        // event messaging here
        // extract
        try {
          extract(newDaemonPath + "impervious.zip", { dir: newDaemonPath });
        } catch (err) {
          log.error(err);
        }
        // tar
        //   .x({ file: outputPath, cwd: path.join(__dirname, "../daemon/") })
        //   .then(() => console.log("File successfully extracted"));
        resolve("daemon extracted");
        return;
      })
      .catch((err) => {
        // event message here
        log.error("Unable to download file: ", err);
        reject();
      });
  });
};

export const downloadBrowser = (version: string) => {
  return new Promise((resolve, reject) => {
    download(browserDownloadURL, newBrowserPath + "impervious-browser.zip")
      .then(() => {
        // event messaging here
        // extract
        try {
          extract(newBrowserPath + "impervious-browser.zip", {
            dir: newBrowserPath,
          });
        } catch (err) {
          log.info("Unable to extract: ", err);
        }
        resolve("browser extracted");
      })
      .catch((err) => {
        // event message here
        log.info("Unable to download file: ", err);
        reject();
      });
  });
};
