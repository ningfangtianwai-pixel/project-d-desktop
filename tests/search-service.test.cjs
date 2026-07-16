const assert = require("node:assert/strict");
const test = require("node:test");

const { SearchService } = require("../dist/main/search/search-service.js");

const desktop = [
  { id: "desktop-report", title: "Quarterly Report.pdf", fullPath: "C:/Users/me/Desktop/Quarterly Report.pdf", category: "document", modifiedAt: "2026-07-12T10:00:00.000Z" },
  { id: "desktop-notes", title: "report-notes.txt", fullPath: "C:/Users/me/Desktop/report-notes.txt", category: "document", modifiedAt: "2026-07-13T10:00:00.000Z" },
  { id: "desktop-image", title: "report-cover.png", fullPath: "C:/Users/me/Desktop/report-cover.png", category: "image", modifiedAt: "2026-07-11T10:00:00.000Z" }
];

const portal = [
  { id: "portal-report", title: "Report Archive.pdf", fullPath: "D:/Work/Archive/Report Archive.pdf", category: "document", modifiedAt: "2026-07-13T12:00:00.000Z" },
  { id: "portal-image", title: "Landscape.png", fullPath: "D:/Work/Reports/report-cover.png", category: "image", modifiedAt: "2026-07-13T09:00:00.000Z" }
];

function service() {
  return new SearchService({
    getDesktopCandidates: () => desktop,
    getPortalCandidates: () => portal
  });
}

test("search filters extension and origin without scanning outside providers", async () => {
  const results = await service().search("in:desktop ext:.pdf");
  assert.deepEqual(results.map((item) => item.id), ["desktop-report"]);
  assert.equal(results[0].origin, "desktop");
});

test("search ranks title exact and prefix matches above path matches", async () => {
  const results = await service().search("report");
  assert.deepEqual(results.map((item) => item.id), [
    "portal-report",
    "desktop-notes",
    "desktop-image",
    "desktop-report",
    "portal-image"
  ]);
});

test("search accepts dot extension shorthand and limits results", async () => {
  const results = await service().search(".png in:portal", { limit: 1 });
  assert.deepEqual(results.map((item) => item.id), ["portal-image"]);
  assert.equal(results[0].origin, "portal");
});
