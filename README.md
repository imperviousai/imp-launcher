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

## **Ubuntu APT Installation Instructions**

> Install Impervious via APT on Ubuntu 22.04

1. Install the Impervious.gpg key into your APT keyring.

```sh
$ sudo mkdir -p /etc/apt/keyrings
$ curl -fsSL https://repo.imp-api.net/Impervious.gpg | sudo gpg --dearmor -o /etc/apt/keyrings/Impervious.gpg
```

2. Add the repo information to a new apt list file

```sh
$ echo "deb [arch=amd64 signed-by=/etc/apt/keyrings/Impervious.gpg] https://repo.imp-api.net stable main" | sudo tee /etc/apt/sources.list.d/impervious.list
```

3. Now you can apt update/install

```sh
$ sudo apt update
$ sudo apt install impervious
```

4. The binary is located in the following location:

```sh
/usr/bin/impervious
```

## **Factory Reset Instructions**

> How to perform a "Factory Reset" on your Impervious Browser

Maybe you want to delete all your data and start from scratch?

Maybe you need to recovery your Decentralized Identity ("DID") and are unable to log into the browser?

Maybe the application crashed due to an unforeseen bug?

Regardless of the reason, a "factory reset" - which also enables account recovery - involves deleting all local data and downloaded artifacts (i.e. saved contacts, message content, application data, etc.), allowing you to start from scratch while recovering your Decentralized Identity (DID).

> In future updates, the Impervious Browser provide an action to quickly perform an automated factory reset, so the following steps will no longer be needed.

In short, the following destinations contain artifacts that are necessary for core functionality, and removing these will allow the Browser to restart in a fresh state.

- `~/.imp` - contains core data storage and configuration information
- `~/Impervious` - contains downloaded artifacts that work together to make the Impervious Browser, the Browser itself and the embedded Impervious Daemon
- `~/Library/Application\ Support/Impervious*` - **(Mac Only)** contains any additional configurations and storage regarding both the Impervious Installer and the Browser itself

**Deleting these folders will reset the application.**

In a terminal, you can run the following commands to delete these folders.

> Be sure to close the application before running the following commands. Open "Activity Monitor" on Mac, search for "Impervious" and force close any listed items.

```
$ rm -rf ~/Library/Application\ Support/Impervious*
$ rm -rf ~/.imp
$ rm -rf ~/Impervious
```

After this, starting the Impervious Browser again will repeat the installation process, download fresh resources, and allow you to Get Started once again, or perform a Recovery with your Recovery Kit to recovery your decentralized identifier.

That's all there is to it! :)

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
