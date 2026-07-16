const test = require("node:test");
const assert = require("node:assert/strict");

const { EntitlementService } = require("../dist/main/entitlement.js");
const { PRODUCT_CAPABILITIES, createOpenEntitlementSnapshot } = require("../dist/shared/entitlement.js");

test("free entitlement shell keeps every existing product capability enabled", () => {
  const service = new EntitlementService();
  for (const capability of PRODUCT_CAPABILITIES) assert.equal(service.can(capability), true);
  assert.equal(service.getSnapshot().tier, "free");
});

test("future provider can supply a pro snapshot without changing call sites", async () => {
  const snapshot = { ...createOpenEntitlementSnapshot("pro"), source: "provider" };
  const service = new EntitlementService({ getSnapshot: async () => snapshot });
  assert.equal((await service.refresh()).tier, "pro");
  assert.equal(service.can("desktop-organize"), true);
});
