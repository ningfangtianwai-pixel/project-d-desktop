const assert = require("node:assert/strict");
const test = require("node:test");

const { SearchResultRegistry } = require("../dist/main/search/search-result-registry.js");

test("search result handles are opaque and support one-digit desktop ids", () => {
  const registry = new SearchResultRegistry(() => 1_000, 5_000, 10);
  const handle = registry.register({ id: "desktop:1", origin: "desktop" });

  assert.match(handle, /^search:[0-9a-f-]{36}$/);
  assert.deepEqual(registry.resolve(handle), { origin: "desktop", fileId: 1 });
  assert.throws(() => registry.resolve("desktop:1"), /invalid or has expired/);
});

test("search result handles expire and reject malformed portal candidates", () => {
  let now = 1_000;
  const registry = new SearchResultRegistry(() => now, 100, 10);
  const handle = registry.register({ id: "portal:approved-id:brief.md", origin: "portal" });
  assert.deepEqual(registry.resolve(handle), { origin: "portal", portalId: "approved-id", relativePath: "brief.md" });

  now = 1_101;
  assert.throws(() => registry.resolve(handle), /invalid or has expired/);
  assert.throws(() => registry.register({ id: "portal:broken", origin: "portal" }), /Invalid portal/);
});

test("external provider paths remain behind opaque expiring handles", () => {
  const registry = new SearchResultRegistry(() => 1_000, 5_000, 10);
  const handle = registry.register({ id: "windows-search:1", origin: "windows-search", fullPath: "C:\\Work\\brief.pdf" });
  assert.match(handle, /^search:[0-9a-f-]{36}$/);
  assert.deepEqual(registry.resolve(handle), { origin: "external", provider: "windows-search", fullPath: "C:\\Work\\brief.pdf" });
  assert.throws(() => registry.register({ id: "windows-search:2", origin: "windows-search", fullPath: "" }), /Invalid external/);
});
