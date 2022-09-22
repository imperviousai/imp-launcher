const path = require("path");
const package = require("../package.json");
require("dotenv").config();

const packageAssetsPath = path.join(__dirname, "..", "assets", "package");

module.exports = {
  packagerConfig: {
    asar: false,
    name: "imp-launcher",
    icon: path.join(packageAssetsPath, "icons", "mac", "icon.icns"),
    // osxSign: {
    //   entitlements: "entitlements.plist",
    //   "entitlements-inherit": "entitlements.plist",
    //   "gatekeeper-assess": false,
    //   hardenedRuntime: true,
    //   identity:
    //     "Developer ID Application: Impervious Technologies Inc. (S722DY52YY)",
    // },
    // osxNotarize: {
    //   appleId: "support@impervious.ai",
    //   appleIdPassword: process.env["AC_PASSWORD"],
    // },
  },
  publishers: [
    {
      name: "@electron-forge/publisher-github",
      config: {
        repository: {
          owner: "impervious",
          name: "imp-electron-app",
          authToken: process.env.GITHUB_TOKEN,
        },
        draft: true,
      },
    },
  ],
  makers: [
    // https://www.electronforge.io/config/makers

    // {
    //   name: "@electron-forge/maker-squirrel",
    //   config: {
    //     // https://js.electronforge.io/maker/squirrel/interfaces/makersquirrelconfig
    //     setupExe: "Windows Setup.exe",
    //     iconUrl:
    //       "https://raw.githubusercontent.com/saucesteals/electron-typescript-react-tailwind-redux/main/assets/package/icons/win/icon.ico",
    //     setupIcon: path.join(packageAssetsPath, "icons", "win", "icon.ico"),
    //     authors: "saucesteals & fourwadu",
    //     loadingGif: path.join(packageAssetsPath, "loading.gif"),
    //   },
    // },
    // You can only build the DMG target on macOS machines.
    // {
    //   name: "@electron-forge/maker-dmg",
    //   config: {
    //     // https://js.electronforge.io/maker/dmg/interfaces/makerdmgconfig
    //     icon: path.join(packageAssetsPath, "icons", "mac", "icon.icns"),
    //     background: path.join(packageAssetsPath, "source.png"),
    //     overwrite: true,
    //     name: "Impervious", // NEEDS TO BE SHORTER THAN 27 CHARACTERS
    //   },
    // },

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
