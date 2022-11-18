import fs from "fs";
import { constants, accessSync } from "node:fs";
import os from "os";
import YAML from 'yaml'


export const changePortNix = () => {
  try {
    const user = os.userInfo().username;

    const homePath =
    os.platform() === "darwin"
      ? `/Users/${user}`
      : `/home/${user}`;
    const impDir = homePath + "/.imp/"
    const configFile = impDir + "config.yml"

    accessSync(configFile, constants.R_OK)
    const file = fs.readFileSync(configFile, 'utf8')
    let yamlConfig = YAML.parse(file)
    if (yamlConfig.server.client_addr === "127.0.0.1:8080") { // if old config is on 8080
      yamlConfig.server.client_addr = "127.0.0.1:8888"
      fs.writeFileSync(configFile, YAML.stringify(yamlConfig));
    }
  } catch (err) {
    console.error(err);
  }
}
