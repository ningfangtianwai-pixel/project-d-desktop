const assert = require("node:assert/strict");
const test = require("node:test");

const { createAuthorizedSearchPortal, isPathWithinOrSame } = require("../dist/main/portals/portal-authorization.js");

test("portal authorization accepts only the selected folder containing the search result", async () => {
  assert.equal(isPathWithinOrSame("C:/Work", "C:/Work/Reports/brief.pdf"), true);
  assert.equal(isPathWithinOrSame("C:/Work", "C:/Other/brief.pdf"), false);
  const calls = [];
  const portal = await createAuthorizedSearchPortal({
    resultPath: "C:/Work/Reports/brief.pdf",
    selectedFolder: "C:/Work",
    addPortal: async (folderPath, name) => {
      calls.push([folderPath, name]);
      return { id: "portal-approved", name, path: folderPath };
    }
  });
  assert.equal(portal.id, "portal-approved");
  assert.equal(calls.length, 1);
});

test("portal authorization rejects a folder unrelated to the selected search result", async () => {
  await assert.rejects(createAuthorizedSearchPortal({
    resultPath: "C:/Work/brief.pdf",
    selectedFolder: "C:/Other",
    addPortal: async () => { throw new Error("must not run"); }
  }), /包含该搜索结果/);
});
