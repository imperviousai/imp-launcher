const path = require("path");
const { isWhiteSpaceLike } = require("typescript");
const package = require("../package.json");
require("dotenv").config();

const packageAssetsPath = path.join(__dirname, "..", "assets", "package");

module.exports = {
  packagerConfig: {
    asar: false,
    name: "Impervious",
    extraResource: [
      "./src/extraResources/daemon",
      "./src/extraResources/browser",
      "./assets/package/icons/png/whiteIcon16x16.png",
      "./assets/package/icons/png/background500x700.png"
    ],
    "extendInfo": {
      "LSUIElement": true,
    },
    icon: path.join(packageAssetsPath, "icons", "mac", "icon"),
    osxSign: {
      entitlements: "entitlements.plist",
      "entitlements-inherit": "entitlements.plist",
      "gatekeeper-assess": false,
      hardenedRuntime: true,
      identity:
        "Developer ID Application: Impervious Technologies Inc. (S722DY52YY)",
    },
    osxNotarize: {
      appleId: "support@impervious.ai",
      appleIdPassword: process.env["AC_PASSWORD"],
    },
  },
  publishers: [
    {
      name: "@electron-forge/publisher-github",
      config: {
        repository: {
          owner: "imperviousai",
          name: "imp-launcher-staging",
          authToken: process.env.GITHUB_TOKEN,
        },
        draft: true,
      },
    },
  ],
  makers: [
    // https://www.electronforge.io/config/makers

    {
      name: "@electron-forge/maker-squirrel",
      config: {
        // https://js.electronforge.io/maker/squirrel/interfaces/makersquirrelconfig
        // setupExe: "Impervious_Setup.exe",
        iconUrl: path.join(packageAssetsPath, "icons", "win", "icon.ico"),
        setupIcon: path.join(packageAssetsPath, "icons", "win", "icon.ico"),
        authors: "Impervious",
        loadingGif: path.join(packageAssetsPath, "icons", "png", "background500x700.png"),
      },
    },
    // You can only build the DMG target on macOS machines.
    {
      name: "@electron-forge/maker-dmg",
      config: {
        // https://js.electronforge.io/maker/dmg/interfaces/makerdmgconfig
        icon: path.join(packageAssetsPath, "icons", "mac", "icon.icns"),
        background: path.join(packageAssetsPath, "icons", "png", "background500x700.png"),
        "background-color": "#F0FFFF",
        additionalDMGOptions:{
          "window":{
            "size": {
              "width": 700,
              "height": 500
            }
          },
        },
        overwrite: true,
        // name: "Impervious-Launcher", // NEEDS TO BE SHORTER THAN 27 CHARACTERS
      },
    },

    // Use maker-zip to build for mac, but without customizability
    {
      name: "@electron-forge/maker-zip",
      platforms: ["darwin", "linux"],
      // No config choice
    },

    // {
    //   name: "@electron-forge/maker-deb",
    //   config: {
    //     // https://js.electronforge.io/maker/deb/interfaces/makerdebconfig
    //     icon: path.join(packageAssetsPath, "icons", "png", "1024x1024.png"),
    //   },
    // },
  ],
  plugins: [
    [
      "@electron-forge/plugin-webpack",
      {
        mainConfig: "./.config/webpack.main.config.js",
        renderer: {
          config: "./.config/webpack.renderer.config.js",
          entryPoints: [
            {
              html: "./src/render/index.html",
              js: "./src/renderer.ts",
              name: "main_window",
              preload: {
                js: "./src/preload.ts",
              },
            },
          ],
        },
      },
    ],
  ],
};
