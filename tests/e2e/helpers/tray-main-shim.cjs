const path = require("node:path");
const electron = require("electron");

const projectRoot = path.resolve(process.argv[2]);
process.chdir(projectRoot);
electron.app.setAppPath(projectRoot);

const buildFromTemplate = electron.Menu.buildFromTemplate.bind(electron.Menu);
electron.Menu.buildFromTemplate = (template) => {
  const actionableItems = template.filter((item) => item.type !== "separator" && typeof item.click === "function");
  const quitItem = actionableItems.at(-1);
  globalThis.__PROJECTD_E2E_INVOKE_TRAY_QUIT__ = () => {
    if (!quitItem) throw new Error("Project D tray quit item was not registered");
    quitItem.click();
  };
  return buildFromTemplate(template);
};

require(path.join(projectRoot, "dist", "main", "bootstrap.js"));
