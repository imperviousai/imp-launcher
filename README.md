# imp-launcher

> The parent application responsible for managing both the Impervious Browser and Impervious Daemon. Currently, the launcher is in ALPHA. It is not production ready yet. 

---

## **Setup and Launch Instructions**

### **Download**

Extract the `.zip`, and move `Impervious.app` to your preferred destination. (i.e. `~/Downloads` or `/Applications`)

### **Launch the application**

1. Navigate to the file that you just downloaded and double-click it. If you experience any strange behaviors with the browser, you can locate and launch the Impervious executable via the command line.

```sh
cd ~/Downloads/Impervious.app/Contents/MacOS && ./Impervious

```

2. Complete the Setup Guide, which will download the resources (browser and daemon) locally into the `~/Impervious` folder. The folder structure should look like:

```sh
$ tree -L 2 ~/Impervious
/Users/<username>/Impervious
├── browser
│   ├── Impervious.app
│   └── impervious-browser.zip
└── daemon
    ├── config
    ├── impervious
    └── impervious.zip
```

Above, you can see both the browser and daemon have been downloaded locally. A default `config.yml` file will be located within `daemon/config/config.yml`. If these files exist locally, then you are good to go.

 **Note:** There may be a case where the screen will not progress to the final screen that reads "You're ready to rock and roll!". If this does not happen (give it 1-2 minutes first), you can (fully!) close the application and launch it again (Step 1.). To close the application, kill the process that you started in Step 1 and confirm that you see the files shown in the tree above.

If everything went well, clicking the `Close and Launch` button will fire up both the daemon and the browser at the same time.

Launching and closing the browser will also start or stop the background daemon respectively.

## **Factory Reset Instructions**

Since the application is rapidly developing, there may be several times where you may want to perform a "factory reset" and start over from scratch. The best way to do that is to follow the instructions below:

1. Stop the application if it is currently running. `Ctrl-C` in the existing Terminal session.
2. Kill all or any existing Impervious processes.
   - Open `Activity Monitor`
   - Search for `Impervious`
   - Kill all Impervious processes
3. Be sure to have your initial recovery seed handy as this will delete the local database. Delete the `~/Impervious` folder completely.

```sh
$ rm -rf ~/Impervious
```

4. Start the application over from scratch. See Step 1 in `Launch the Application`.
5. (Optionally) Remove the Impervious Browser profile data.

```sh
$ rm -rf ~/Library/Application\ Support/Impervious*
```
6. If upon browser launch you see an error message that says your firefox profile cannot be loaded, you may have some lingering files at the following locations or maybe you moved/deleted your firefox profile data. To remedy this, delete the following files:

```sh
$ rm -rf ~/Library/Application\ Support/Impervious\ Browser/Profiles/installs.ini
```

```sh
$ rm -rf ~/Library/Application\ Support/Impervious\ Browser/Profiles/profiles.ini
```

## **Soft Reset Instructions**

Other times, it's good to do a "soft" reset of the application and just wipe data. This is helpful for testing out new features or hunting for bugs. Be sure to have your initial recovery seed handy as this will delete the local database.

1. Perform Step 1 and Step 2 in the above `Factory Reset Instructions`
2. Delete the `.imp` folder in `~/Impervious/daemon/`

```sh
$ rm -rf ~/Impervious/daemon/.imp/
```

## **Development Instructions**

The application is an Electron application, using [Electron Forge](https://www.electronforge.io/) for managing the application. It's definitely overkill, but we aim to no longer need a launcher application and just serve the browser along side the daemon. 

### **Installation**

Clone the repository locally.

```sh
$ git clone https://github.com/imperviousai/imp-launcher
$ cd imp-launcher
$ yarn
```

### **Starting Development**

Start the app in the `dev` environment:

```sh
yarn start
```

### **Building**

To build apps into a local executable, run one of the following commands to build for your preferred platform:

```sh
# yarn make:mac
# yarn make:win
# yarn make:linux
```

This will produce executables in the `out/` folder. 

```sh
$ yarn make:mac
...
$ tree -L 2 out
out
├── Impervious-darwin-arm64
│   ├── Impervious.app
│   │   └── Contents
│   │       ├── CodeResources
│   │       ├── Frameworks
│   │       ├── Info.plist
│   │       ├── MacOS
│   │       ├── PkgInfo
│   │       ├── Resources
│   │       └── _CodeSignature
│   ├── LICENSE
│   ├── LICENSES.chromium.html
│   └── version
├── Impervious-darwin-x64
│   ├── Impervious.app
│   │   └── Contents
│   │       ├── CodeResources
│   │       ├── Frameworks
│   │       ├── Info.plist
│   │       ├── MacOS
│   │       ├── PkgInfo
│   │       ├── Resources
│   │       └── _CodeSignature
│   ├── LICENSE
│   ├── LICENSES.chromium.html
│   └── version
└── make
    └── zip
        └── darwin
            ├── arm64
            └── x64
```

**TIP:** You can build for specific architectures using the `--arch` flag. i.e. `yarn make:mac --arch=x64`

You can personalize the forge **maker** configs at `/.config/forge.config.js`. See [Electron Forge configuration docs](https://www.electronforge.io/configuration) for more information.

See `package.json` for additional build and package options. 

---

## TODO

- [ ] Not need this Electron application to manage both the Browser and the Daemon
