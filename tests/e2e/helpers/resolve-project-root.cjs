const fs = require("node:fs");
const path = require("node:path");

function resolveProjectRoot(argv, shimFilename) {
  const normalizedShim = path.resolve(shimFilename);
  const shimIndex = argv.findIndex((argument) => path.resolve(argument) === normalizedShim);
  const candidates = argv
    .slice(shimIndex >= 0 ? shimIndex + 1 : 1)
    .filter((argument) => typeof argument === "string" && argument.length > 0 && !argument.startsWith("-"))
    .map((argument) => path.resolve(argument));

  const projectRoot = candidates.find((candidate) => {
    try {
      return fs.statSync(candidate).isDirectory()
        && fs.existsSync(path.join(candidate, "package.json"))
        && fs.existsSync(path.join(candidate, "dist", "main", "bootstrap.js"));
    } catch {
      return false;
    }
  });

  if (!projectRoot) {
    throw new Error(`Project D root argument is missing. Received: ${argv.slice(1).join(" ")}`);
  }
  return projectRoot;
}

module.exports = { resolveProjectRoot };
