const fs = require("node:fs");
const path = require("node:path");
const { spawnSync } = require("node:child_process");

const root = path.resolve(__dirname, "..");
const outputDir = path.resolve(readArgument("--output") ?? path.join(root, "artifacts", "security"));
const auditLevel = readArgument("--audit-level") ?? "high";
const auditRegistry = readArgument("--registry") ?? "https://registry.npmjs.org";
const allowedLevels = ["low", "moderate", "high", "critical"];
if (!allowedLevels.includes(auditLevel)) throw new Error(`Unsupported audit level: ${auditLevel}`);
if (!/^https:\/\/[a-z0-9.-]+(?::\d+)?(?:\/.*)?$/i.test(auditRegistry)) throw new Error(`Unsupported audit registry: ${auditRegistry}`);
fs.mkdirSync(outputDir, { recursive: true });

function readArgument(name) {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : null;
}

function runPnpm(args) {
  const command = process.platform === "win32"
    ? `pnpm ${args.map((argument) => `"${String(argument).replace(/"/g, '""')}"`).join(" ")}`
    : "pnpm";
  return spawnSync(command, process.platform === "win32" ? [] : args, {
    cwd: root,
    encoding: "utf8",
    windowsHide: true,
    maxBuffer: 64 * 1024 * 1024,
    shell: process.platform === "win32"
  });
}

function packageMetadata(packagePath) {
  try {
    const manifest = JSON.parse(fs.readFileSync(path.join(packagePath, "package.json"), "utf8"));
    return {
      licenses: manifest.license ? [{ license: { id: String(manifest.license) } }] : undefined,
      description: manifest.description || undefined
    };
  } catch {
    return {};
  }
}

function purl(name, version) {
  const encodedName = name.startsWith("@")
    ? name.split("/").map(encodeURIComponent).join("/")
    : encodeURIComponent(name);
  return `pkg:npm/${encodedName}@${encodeURIComponent(version)}`;
}

const listResult = runPnpm(["list", "--json", "--depth", "Infinity"]);
if (listResult.error) throw listResult.error;
if (listResult.status !== 0) throw new Error(`pnpm list failed: ${listResult.stderr || listResult.stdout}`);
const roots = JSON.parse(listResult.stdout);
const project = Array.isArray(roots) ? roots[0] : roots;
const components = new Map();
const dependencyGraph = new Map();

function visitCollection(collection, parentRef) {
  for (const [name, dependency] of Object.entries(collection ?? {})) {
    if (!dependency || typeof dependency !== "object" || !dependency.version) continue;
    const ref = purl(name, dependency.version);
    if (!components.has(ref)) {
      components.set(ref, {
        type: "library",
        "bom-ref": ref,
        name,
        version: dependency.version,
        purl: ref,
        scope: dependency.dev === true ? "optional" : "required",
        ...packageMetadata(dependency.path)
      });
    }
    if (!dependencyGraph.has(parentRef)) dependencyGraph.set(parentRef, new Set());
    dependencyGraph.get(parentRef).add(ref);
    if (!dependencyGraph.has(ref)) dependencyGraph.set(ref, new Set());
    visitCollection(dependency.dependencies, ref);
    visitCollection(dependency.devDependencies, ref);
    visitCollection(dependency.optionalDependencies, ref);
  }
}

const rootRef = purl(project.name, project.version);
visitCollection(project.dependencies, rootRef);
visitCollection(project.devDependencies, rootRef);
visitCollection(project.optionalDependencies, rootRef);

const sbom = {
  bomFormat: "CycloneDX",
  specVersion: "1.5",
  serialNumber: `urn:uuid:${cryptoRandomUuid()}`,
  version: 1,
  metadata: {
    timestamp: new Date().toISOString(),
    tools: [{ vendor: "Project D", name: "generate-supply-chain-evidence.cjs", version: "1" }],
    component: { type: "application", "bom-ref": rootRef, name: project.name, version: project.version, purl: rootRef }
  },
  components: [...components.values()].sort((a, b) => a.purl.localeCompare(b.purl)),
  dependencies: [...dependencyGraph.entries()]
    .map(([ref, dependencies]) => ({ ref, dependsOn: [...dependencies].sort() }))
    .sort((a, b) => a.ref.localeCompare(b.ref))
};
const sbomPath = path.join(outputDir, "projectd-sbom.cdx.json");
fs.writeFileSync(sbomPath, JSON.stringify(sbom, null, 2), "utf8");

const auditResult = runPnpm(["audit", "--json", "--registry", auditRegistry]);
let audit;
try {
  audit = JSON.parse(auditResult.stdout || auditResult.stderr);
} catch {
  audit = { error: { code: "INVALID_AUDIT_OUTPUT", message: (auditResult.stderr || auditResult.stdout).trim() } };
}
const auditPath = path.join(outputDir, "pnpm-audit.json");
fs.writeFileSync(auditPath, JSON.stringify(audit, null, 2), "utf8");

const vulnerabilities = audit.metadata?.vulnerabilities ?? {};
const thresholdIndex = allowedLevels.indexOf(auditLevel);
const blockingCount = allowedLevels
  .slice(thresholdIndex)
  .reduce((total, level) => total + Number(vulnerabilities[level] ?? 0), 0);
const auditAvailable = !audit.error;
const report = {
  schemaVersion: 1,
  generatedAt: new Date().toISOString(),
  sbom: { path: sbomPath, componentCount: components.size, dependencyNodeCount: dependencyGraph.size },
  audit: { path: auditPath, registry: auditRegistry, auditLevel, available: auditAvailable, blockingCount, vulnerabilities },
  passed: auditAvailable && blockingCount === 0
};
const reportPath = path.join(outputDir, "supply-chain-report.json");
fs.writeFileSync(reportPath, JSON.stringify(report, null, 2), "utf8");
console.log(JSON.stringify({ ...report, reportPath }, null, 2));
process.exitCode = report.passed ? 0 : 1;

function cryptoRandomUuid() {
  return require("node:crypto").randomUUID();
}
