const assert = require("node:assert/strict");
const fs = require("node:fs/promises");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");

const { PortalService } = require("../dist/main/portals/portal-service.js");

function makeStore() {
  const portals = new Map();
  return {
    savePortalConfig(portal) { portals.set(portal.id, structuredClone(portal)); },
    getPortalConfigs() { return [...portals.values()].map((portal) => structuredClone(portal)); },
    getPortalConfig(id) { return structuredClone(portals.get(id) ?? null); },
    removePortalConfig(id) { portals.delete(id); }
  };
}

test("folder portals enumerate only approved roots and reject path escape", async (t) => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "project-d-portal-"));
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  await fs.writeFile(path.join(root, "brief.md"), "brief");
  await fs.mkdir(path.join(root, "assets"));

  const service = new PortalService(makeStore());
  const portal = await service.add(root, "项目资料");
  const resources = await service.getResources(portal.id);
  assert.equal(resources.every((item) => item.status === "ready"), true);
  assert.deepEqual(resources.map((item) => item.name).sort(), ["assets", "brief.md"]);
  assert.equal(await service.resolveResourcePath(portal.id, "brief.md"), await fs.realpath(path.join(root, "brief.md")));
  await assert.rejects(service.resolveResourcePath(portal.id, "../outside.txt"), /escapes/);
});

test("folder portals reject junctions or symlinks that leave the approved root", async (t) => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "project-d-portal-root-"));
  const outside = await fs.mkdtemp(path.join(os.tmpdir(), "project-d-portal-outside-"));
  t.after(() => Promise.all([
    fs.rm(root, { recursive: true, force: true }),
    fs.rm(outside, { recursive: true, force: true })
  ]));
  await fs.writeFile(path.join(outside, "secret.txt"), "outside");
  const linked = path.join(root, "linked");
  try {
    await fs.symlink(outside, linked, process.platform === "win32" ? "junction" : "dir");
  } catch (error) {
    if (error && ["EPERM", "EACCES"].includes(error.code)) return t.skip("Link creation is not permitted on this host");
    throw error;
  }

  const service = new PortalService(makeStore());
  const portal = await service.add(root, "项目资料");
  await assert.rejects(service.resolveResourcePath(portal.id, path.join("linked", "secret.txt")), /through a link/);
});

test("folder portals reject an authorized root that is later replaced by a junction", async (t) => {
  const parent = await fs.mkdtemp(path.join(os.tmpdir(), "project-d-portal-parent-"));
  const root = path.join(parent, "approved");
  const outside = await fs.mkdtemp(path.join(os.tmpdir(), "project-d-portal-replacement-"));
  await fs.mkdir(root);
  await fs.writeFile(path.join(root, "safe.txt"), "safe");
  await fs.writeFile(path.join(outside, "secret.txt"), "outside");
  t.after(() => Promise.all([
    fs.rm(parent, { recursive: true, force: true }),
    fs.rm(outside, { recursive: true, force: true })
  ]));

  const service = new PortalService(makeStore());
  const portal = await service.add(root, "项目资料");
  await fs.rm(root, { recursive: true, force: true });
  try {
    await fs.symlink(outside, root, process.platform === "win32" ? "junction" : "dir");
  } catch (error) {
    if (error && ["EPERM", "EACCES"].includes(error.code)) return t.skip("Link creation is not permitted on this host");
    throw error;
  }

  await assert.rejects(service.resolveResourcePath(portal.id, "secret.txt"), /identity changed/);
  const resources = await service.getResources(portal.id);
  assert.equal(resources[0].status, "offline");
});
