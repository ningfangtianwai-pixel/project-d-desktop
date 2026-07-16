const assert = require("node:assert/strict");
const fs = require("node:fs/promises");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");

const { ActionEngine } = require("../dist/main/actions/action-engine.js");

function makeStore() {
  const plans = new Map();
  const executions = new Map();
  return {
    saveActionPlan(plan) { plans.set(plan.id, structuredClone(plan)); },
    getActionPlan(id) { return structuredClone(plans.get(id) ?? null); },
    saveActionExecution(execution) { executions.set(execution.id, structuredClone(execution)); },
    getActionExecution(id) { return structuredClone(executions.get(id) ?? null); },
    getActionHistory() { return [...executions.values()].map((item) => structuredClone(item)); }
  };
}

function makeFile(id, root, filename, category) {
  return {
    id,
    filename,
    displayName: null,
    fullPath: path.join(root, filename),
    extension: path.extname(filename),
    category,
    sizeBytes: 3,
    modifiedAt: new Date().toISOString(),
    isShortcut: false,
    customCategory: null,
    containerId: null,
    sortOrder: 0,
    isMissing: false
  };
}

test("desktop inbox moves only reviewed files and restores them without overwriting", async (t) => {
  const desktop = await fs.mkdtemp(path.join(os.tmpdir(), "project-d-action-"));
  t.after(() => fs.rm(desktop, { recursive: true, force: true }));
  await fs.writeFile(path.join(desktop, "brief.md"), "one");
  await fs.writeFile(path.join(desktop, "cover.png"), "two");
  await fs.mkdir(path.join(desktop, "Project D 收纳", "文档"), { recursive: true });
  await fs.writeFile(path.join(desktop, "Project D 收纳", "文档", "brief.md"), "existing");

  const engine = new ActionEngine(makeStore(), { info() {}, warn() {}, error() {} }, desktop);
  const plan = engine.createDesktopInboxPlan([
    makeFile(1, desktop, "brief.md", "document"),
    makeFile(2, desktop, "cover.png", "image"),
    { ...makeFile(3, desktop, "shortcut.lnk", "program"), isShortcut: true }
  ]);

  assert.equal(plan.riskLevel, "L2");
  assert.equal(plan.items.length, 2);
  assert.equal(plan.items.find((item) => item.label === "brief.md").conflict, "target-exists");

  const execution = await engine.execute(plan.id);
  assert.equal(execution.status, "completed");
  assert.equal(execution.undoable, true);
  await assert.rejects(fs.access(path.join(desktop, "cover.png")));
  await fs.access(path.join(desktop, "Project D 收纳", "图片", "cover.png"));
  assert.equal(await fs.readFile(path.join(desktop, "Project D 收纳", "文档", "brief.md"), "utf8"), "existing");

  const undone = await engine.undo(execution.id);
  assert.equal(undone.status, "undone");
  assert.equal(undone.undoable, false);
  await fs.access(path.join(desktop, "cover.png"));
});

test("interrupted execution resumes with a journal and rolls back without overwriting", async (t) => {
  const desktop = await fs.mkdtemp(path.join(os.tmpdir(), "project-d-recovery-"));
  t.after(() => fs.rm(desktop, { recursive: true, force: true }));
  const sourcePath = path.join(desktop, "recover.md");
  const targetPath = path.join(desktop, "Project D 收纳", "文档", "recover.md");
  await fs.writeFile(sourcePath, "recoverable");

  const store = makeStore();
  const engine = new ActionEngine(store, { info() {}, warn() {}, error() {} }, desktop);
  store.saveActionExecution({
    id: "interrupted-execution",
    planId: "interrupted-plan",
    status: "executing",
    startedAt: new Date().toISOString(),
    completedAt: null,
    undoable: false,
    summary: "interrupted",
    items: [{ id: "item-1", kind: "move", sourcePath, targetPath, label: "recover.md", category: "document", sizeBytes: 11, status: "pending" }]
  });

  const resumed = await engine.resume("interrupted-execution");
  assert.equal(resumed.status, "completed");
  assert.equal(resumed.items[0].status, "completed");
  assert.ok(resumed.items[0].journalPreIdentity);
  await fs.access(targetPath);

  store.saveActionExecution({ ...resumed, status: "executing", completedAt: null });
  const rolledBack = await engine.rollback("interrupted-execution");
  assert.equal(rolledBack.status, "undone");
  assert.equal(rolledBack.items[0].status, "undone");
  assert.equal(await fs.readFile(sourcePath, "utf8"), "recoverable");
});
