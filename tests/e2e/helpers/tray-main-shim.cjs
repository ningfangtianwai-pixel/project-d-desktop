const electron = require("electron");
const path = require("node:path");
const { resolveProjectRoot } = require("./resolve-project-root.cjs");

const projectRoot = resolveProjectRoot(process.argv, __filename);
process.chdir(projectRoot);
electron.app.setAppPath(projectRoot);

const buildFromTemplate = electron.Menu.buildFromTemplate.bind(electron.Menu);
electron.Menu.buildFromTemplate = (template) => {
  const quitItem = template.find((item) => item.id === "quit" && typeof item.click === "function");
  globalThis.__PROJECTD_E2E_INVOKE_TRAY_QUIT__ = () => {
    if (!quitItem) throw new Error("Project D tray quit item was not registered");
    quitItem.click();
  };
  return buildFromTemplate(template);
};

require(path.join(projectRoot, "dist", "main", "bootstrap.js"));
