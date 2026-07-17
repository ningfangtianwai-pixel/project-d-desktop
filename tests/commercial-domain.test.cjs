const assert = require("node:assert/strict");
const fs = require("node:fs");
const test = require("node:test");
const ts = require("typescript");

require.extensions[".ts"] = (module, filename) => {
  const source = fs.readFileSync(filename, "utf8");
  const output = ts.transpileModule(source, {
    compilerOptions: {
      esModuleInterop: true,
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022
    },
    fileName: filename,
    reportDiagnostics: true
  });
  module._compile(output.outputText, filename);
};

const {
  CommercialService,
  InMemoryAccountRepository,
  InMemoryAuditRepository,
  InMemoryCommercialTransaction,
  InMemoryDeviceRepository,
  InMemoryEntitlementRepository,
  InMemoryHmacEntitlementSnapshotSigner,
  InMemoryOrderRepository,
  InMemoryPaymentCallbackRepository,
  InMemoryPaymentSignatureVerifier,
  InMemoryProductCatalog
} = require("../server/index.ts");

function createFixture(options = {}) {
  let sequence = 0;
  const clock = { now: () => new Date("2026-07-17T08:00:00.000Z") };
  const ids = { next: (prefix) => `${prefix}_${++sequence}` };
  const accounts = new InMemoryAccountRepository();
  const devices = new InMemoryDeviceRepository();
  const orders = new InMemoryOrderRepository();
  const callbacks = new InMemoryPaymentCallbackRepository();
  const entitlements = new InMemoryEntitlementRepository();
  const audits = new InMemoryAuditRepository();
  const transactions = new InMemoryCommercialTransaction(orders, callbacks, entitlements, audits);
  const verifier = new InMemoryPaymentSignatureVerifier();
  const catalog = options.catalog ?? new InMemoryProductCatalog([
    {
      sku: "projectd.pro.lifetime",
      amountMinor: 9900,
      currency: "CNY",
      entitlement: {
        tier: "pro",
        features: ["dynamic-wallpaper", "luna-chat"],
        durationDays: null
      }
    }
  ]);
  const snapshotSigner = new InMemoryHmacEntitlementSnapshotSigner({
    keyId: "test-key-2026-07",
    secret: "unit-test-only-not-a-production-secret"
  });
  const service = new CommercialService({
    accounts,
    devices,
    orders,
    callbacks,
    entitlements,
    audits,
    verifier,
    catalog,
    snapshotSigner,
    clock,
    ids,
    transactions
  });
  return { service, verifier, orders, callbacks, entitlements, audits, snapshotSigner };
}

test("concurrent order creation claims one idempotency key atomically", async () => {
  const fixture = createFixture();
  const account = await fixture.service.createAccount({ email: "race@example.test", displayName: "Race" });
  const orders = await Promise.all(Array.from({ length: 8 }, () => fixture.service.createOrder({
    accountId: account.id,
    sku: "projectd.pro.lifetime",
    channel: "alipay",
    idempotencyKey: "same-checkout"
  })));

  assert.equal(new Set(orders.map((order) => order.id)).size, 1);
  assert.equal((await fixture.audits.list({ action: "order.created" })).length, 1);
});

test("failed payment settlement rolls back order, entitlement, callback, and audit state", async () => {
  let catalogReads = 0;
  const product = {
    sku: "projectd.pro.lifetime",
    amountMinor: 9900,
    currency: "CNY",
    entitlement: { tier: "pro", features: ["dynamic-wallpaper"], durationDays: null }
  };
  const fixture = createFixture({
    catalog: { getBySku: async () => (++catalogReads === 1 ? structuredClone(product) : null) }
  });
  const { account, order } = await createAccountAndOrder(fixture);
  fixture.verifier.register("paid-rollback-token", {
    channel: "alipay",
    eventId: "alipay-event-rollback-001",
    eventType: "payment.succeeded",
    merchantOrderId: order.id,
    channelOrderId: "alipay-trade-rollback-001",
    amountMinor: 9900,
    currency: "CNY",
    occurredAt: "2026-07-17T08:00:01.000Z"
  });

  await assert.rejects(
    () => fixture.service.handlePaymentCallback(rawCallback("alipay", "paid-rollback-token")),
    /product is no longer available/i
  );
  assert.equal((await fixture.service.getOrder(order.id)).status, "pending");
  assert.equal((await fixture.callbacks.find("alipay", "alipay-event-rollback-001")), null);
  assert.equal((await fixture.entitlements.listByAccount(account.id)).length, 0);
  assert.equal((await fixture.audits.list({ action: "payment.callback.applied" })).length, 0);
});

async function createAccountAndOrder(fixture, overrides = {}) {
  const account = await fixture.service.createAccount({
    email: "owner@example.test",
    displayName: "Owner"
  });
  const order = await fixture.service.createOrder({
    accountId: account.id,
    sku: "projectd.pro.lifetime",
    channel: "alipay",
    idempotencyKey: "checkout-001",
    ...overrides
  });
  return { account, order };
}

function rawCallback(channel, token, body = "{}") {
  return {
    channel,
    headers: { "x-projectd-test-verification": token },
    body,
    receivedAt: "2026-07-17T08:00:00.000Z"
  };
}

test("duplicate verified payment callbacks grant entitlement exactly once", async () => {
  const fixture = createFixture();
  const { account, order } = await createAccountAndOrder(fixture);
  fixture.verifier.register("paid-token", {
    channel: "alipay",
    eventId: "alipay-event-paid-001",
    eventType: "payment.succeeded",
    merchantOrderId: order.id,
    channelOrderId: "alipay-trade-001",
    amountMinor: 9900,
    currency: "CNY",
    occurredAt: "2026-07-17T08:00:01.000Z"
  });

  const first = await fixture.service.handlePaymentCallback(rawCallback("alipay", "paid-token"));
  const second = await fixture.service.handlePaymentCallback(rawCallback("alipay", "paid-token"));
  const grants = await fixture.entitlements.listByAccount(account.id);

  assert.equal(first.duplicate, false);
  assert.equal(second.duplicate, true);
  assert.equal((await fixture.service.getOrder(order.id)).status, "paid");
  assert.equal(grants.length, 1);
  assert.equal(grants[0].status, "active");
  assert.equal(grants[0].sourceOrderId, order.id);
});

test("client input cannot set price or payment status and unsigned callbacks are rejected", async () => {
  const fixture = createFixture();
  const { order } = await createAccountAndOrder(fixture, {
    amountMinor: 1,
    currency: "USD",
    status: "paid"
  });

  assert.equal(order.amountMinor, 9900);
  assert.equal(order.currency, "CNY");
  assert.equal(order.status, "pending");
  assert.equal(typeof fixture.service.setOrderStatus, "undefined");
  await assert.rejects(
    () => fixture.service.handlePaymentCallback(rawCallback("alipay", "forged-token", '{"status":"paid"}')),
    /signature verification failed/i
  );
  assert.equal((await fixture.service.getOrder(order.id)).status, "pending");
});

test("a callback still being processed is not acknowledged as completed", async () => {
  const fixture = createFixture();
  const { order } = await createAccountAndOrder(fixture);
  fixture.verifier.register("concurrent-token", {
    channel: "alipay",
    eventId: "alipay-event-concurrent-001",
    eventType: "payment.succeeded",
    merchantOrderId: order.id,
    channelOrderId: "alipay-trade-concurrent-001",
    amountMinor: 9900,
    currency: "CNY",
    occurredAt: "2026-07-17T08:00:01.000Z"
  });
  await fixture.callbacks.begin({
    channel: "alipay",
    eventId: "alipay-event-concurrent-001",
    merchantOrderId: order.id,
    eventType: "payment.succeeded",
    status: "processing",
    receivedAt: "2026-07-17T08:00:00.000Z",
    completedAt: null
  });

  await assert.rejects(
    () => fixture.service.handlePaymentCallback(rawCallback("alipay", "concurrent-token")),
    /already being processed/i
  );
  assert.equal((await fixture.service.getOrder(order.id)).status, "pending");
});

test("a verified refund revokes the entitlement created by its order", async () => {
  const fixture = createFixture();
  const { account, order } = await createAccountAndOrder(fixture);
  fixture.verifier.register("paid-token", {
    channel: "alipay",
    eventId: "alipay-event-paid-002",
    eventType: "payment.succeeded",
    merchantOrderId: order.id,
    channelOrderId: "alipay-trade-002",
    amountMinor: 9900,
    currency: "CNY",
    occurredAt: "2026-07-17T08:00:01.000Z"
  });
  fixture.verifier.register("refund-token", {
    channel: "alipay",
    eventId: "alipay-event-refund-002",
    eventType: "payment.refunded",
    merchantOrderId: order.id,
    channelOrderId: "alipay-trade-002",
    amountMinor: 9900,
    currency: "CNY",
    occurredAt: "2026-07-17T08:05:00.000Z"
  });

  await fixture.service.handlePaymentCallback(rawCallback("alipay", "paid-token"));
  await fixture.service.handlePaymentCallback(rawCallback("alipay", "refund-token"));
  const grants = await fixture.entitlements.listByAccount(account.id);

  assert.equal((await fixture.service.getOrder(order.id)).status, "refunded");
  assert.equal(grants.length, 1);
  assert.equal(grants[0].status, "revoked");
  assert.equal(grants[0].revocationReason, "payment-refunded");
  assert.ok((await fixture.audits.list({ accountId: account.id })).some((entry) => entry.action === "entitlement.revoked"));
});

test("signed snapshots contain only server-derived active entitlements", async () => {
  const fixture = createFixture();
  const { account, order } = await createAccountAndOrder(fixture);
  const device = await fixture.service.registerDevice({
    accountId: account.id,
    installationId: "install-001",
    displayName: "Lenovo laptop"
  });
  fixture.verifier.register("paid-token", {
    channel: "alipay",
    eventId: "alipay-event-paid-003",
    eventType: "payment.succeeded",
    merchantOrderId: order.id,
    channelOrderId: "alipay-trade-003",
    amountMinor: 9900,
    currency: "CNY",
    occurredAt: "2026-07-17T08:00:01.000Z"
  });
  await fixture.service.handlePaymentCallback(rawCallback("alipay", "paid-token"));

  const signed = await fixture.service.issueEntitlementSnapshot({ accountId: account.id, deviceId: device.id });
  assert.equal(signed.payload.accountId, account.id);
  assert.equal(signed.payload.deviceId, device.id);
  assert.equal(signed.payload.tier, "pro");
  assert.deepEqual(signed.payload.features, ["dynamic-wallpaper", "luna-chat"]);
  assert.equal(fixture.snapshotSigner.verify(signed), true);
});

test("account and device lifecycle writes append-only audit records", async () => {
  const fixture = createFixture();
  const account = await fixture.service.createAccount({ email: "audit@example.test", displayName: "Audit" });
  const device = await fixture.service.registerDevice({
    accountId: account.id,
    installationId: "install-audit",
    displayName: "Test device"
  });
  await fixture.service.unbindDevice({ accountId: account.id, deviceId: device.id });

  const entries = await fixture.audits.list({ accountId: account.id });
  assert.deepEqual(entries.map((entry) => entry.action), [
    "account.created",
    "device.registered",
    "device.unbound"
  ]);
  assert.equal(Object.isFrozen(entries[0]), true);
});
