const assert = require("node:assert/strict");
const test = require("node:test");

const { restoreContainerRect, snapshotDisplays } = require("../dist/main/scenes/display-layout.js");

function display(displayId, width, height, scaleFactor, isPrimary = false) {
  return {
    displayId,
    scaleFactor,
    isPrimary,
    bounds: { x: 0, y: 0, width, height },
    workArea: { x: 0, y: 0, width, height }
  };
}

test("scene container geometry scales in DIP and remains inside the work area", () => {
  const savedDisplays = snapshotDisplays("scene-a", [display("primary", 1920, 1040, 1, true)]);
  const restored = restoreContainerRect({
    id: 1,
    positionX: 240,
    positionY: 120,
    width: 600,
    height: 400,
    isCollapsed: false,
    displayId: "primary",
    scaleFactor: 1,
    workAreaWidth: 1920,
    workAreaHeight: 1040
  }, savedDisplays, [display("primary", 1536, 824, 1.25, true)]);

  assert.deepEqual(restored, {
    id: 1,
    positionX: 192,
    positionY: 95,
    width: 480,
    height: 317,
    isCollapsed: false,
    displayId: "primary",
    scaleFactor: 1.25,
    workAreaWidth: 1536,
    workAreaHeight: 824
  });
});

test("a missing display falls back to the primary display and clamps oversized geometry", () => {
  const restored = restoreContainerRect({
    id: 2,
    positionX: 1600,
    positionY: 900,
    width: 900,
    height: 700,
    isCollapsed: true,
    displayId: "removed-secondary",
    scaleFactor: 1,
    workAreaWidth: 1920,
    workAreaHeight: 1040
  }, [], [display("current-primary", 1280, 680, 1.5, true)]);

  assert.equal(restored.displayId, "current-primary");
  assert.ok(restored.positionX >= 12 && restored.positionX + restored.width <= 1268);
  assert.ok(restored.positionY >= 76 && restored.positionY + restored.height <= 668);
});

test("containers follow the new primary when the saved primary remains connected as a secondary display", () => {
  const restored = restoreContainerRect({
    id: 3,
    positionX: 100,
    positionY: 100,
    width: 300,
    height: 240,
    isCollapsed: false,
    displayId: "old-primary",
    scaleFactor: 1,
    workAreaWidth: 1920,
    workAreaHeight: 1040
  }, [], [
    display("old-primary", 1920, 1040, 1, false),
    display("new-primary", 1536, 824, 1.25, true)
  ]);
  assert.equal(restored.displayId, "new-primary");
  assert.equal(restored.workAreaWidth, 1536);
});
