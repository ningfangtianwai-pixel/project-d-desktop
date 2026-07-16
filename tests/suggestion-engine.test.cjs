const assert = require("node:assert/strict");
const test = require("node:test");

const { SuggestionEngine } = require("../dist/main/suggestions/suggestion-engine.js");

function makeStore() {
  const byFingerprint = new Map();
  const records = [];
  let controls = {};
  return {
    getByFingerprint(fingerprint) {
      return structuredClone(byFingerprint.get(fingerprint) ?? null);
    },
    getLatestCreatedAt() {
      return records.at(-1)?.createdAt ?? null;
    },
    getCreatedSince(since) {
      const threshold = Date.parse(since);
      return records
        .filter((record) => record.id && Date.parse(record.createdAt) >= threshold)
        .map((record) => structuredClone(record));
    },
    getLatestCreatedAtForKind(kind) {
      return records.filter((record) => record.kind === kind).at(-1)?.createdAt ?? null;
    },
    save(record, fingerprint) {
      byFingerprint.set(fingerprint, structuredClone(record));
      records.push(structuredClone(record));
    },
    getDeliveryControls() {
      return structuredClone(controls);
    },
    saveDeliveryControls(nextControls) {
      controls = structuredClone(nextControls);
    },
    setLatestCreatedAt(createdAt) {
      records.push({ createdAt });
    },
    seedSuggestion(kind, createdAt, id = `seed-${records.length + 1}`) {
      records.push({ id, kind, createdAt });
    },
    setFirstStatus(status) {
      const [fingerprint, record] = byFingerprint.entries().next().value;
      byFingerprint.set(fingerprint, { ...record, status });
    },
    count() {
      return records.filter((record) => record.id).length;
    },
    controls() {
      return structuredClone(controls);
    }
  };
}

function candidate(id, filename = `file-${id}.txt`, overrides = {}) {
  return {
    id,
    filename,
    fullPath: `C:\\Users\\test\\Desktop\\${filename}`,
    isRegularFile: true,
    ...overrides
  };
}

function makeEngine(store, now = "2026-07-13T08:00:00.000Z", options = {}) {
  return new SuggestionEngine(store, { now: () => new Date(now) }, options);
}

test("reports a machine-readable delivery decision", async () => {
  const decision = await makeEngine(makeStore()).evaluateWithDecision({
    candidates: [candidate(1), candidate(2), candidate(3)],
    runtime: {}
  });

  assert.equal(decision.status, "delivered");
  assert.equal(decision.reason, "delivered");
  assert.equal(decision.kind, "desktop-inbox");
  assert.match(decision.explanation, /3/);
  assert.equal(decision.suggestion?.status, "ready");
});

test("suppresses during configured same-day and overnight quiet-hour ranges", async () => {
  const candidates = [candidate(1), candidate(2), candidate(3)];
  const sameDayPolicy = {
    policy: {
      timeZoneOffsetMinutes: 0,
      quietHours: { enabled: true, start: "09:00", end: "17:00" }
    }
  };
  const overnightPolicy = {
    policy: {
      timeZoneOffsetMinutes: 0,
      quietHours: { enabled: true, start: "22:00", end: "07:00" }
    }
  };

  const sameDay = await makeEngine(makeStore(), "2026-07-13T12:00:00.000Z", sameDayPolicy)
    .evaluateWithDecision({ candidates, runtime: {} });
  const overnightBeforeMidnight = await makeEngine(makeStore(), "2026-07-13T23:30:00.000Z", overnightPolicy)
    .evaluateWithDecision({ candidates, runtime: {} });
  const overnightAfterMidnight = await makeEngine(makeStore(), "2026-07-13T06:30:00.000Z", overnightPolicy)
    .evaluateWithDecision({ candidates, runtime: {} });
  const daytime = await makeEngine(makeStore(), "2026-07-13T12:00:00.000Z", overnightPolicy)
    .evaluateWithDecision({ candidates, runtime: {} });

  for (const decision of [sameDay, overnightBeforeMidnight, overnightAfterMidnight]) {
    assert.equal(decision.status, "suppressed");
    assert.equal(decision.reason, "scheduled-quiet-hours");
    assert.equal(decision.suggestion, null);
  }
  assert.equal(daytime.status, "delivered");
});

test("enforces a daily delivery budget and resets it at the configured local day boundary", async () => {
  const store = makeStore();
  store.seedSuggestion("desktop-inbox", "2026-07-13T01:00:00.000Z");
  store.seedSuggestion("desktop-inbox", "2026-07-13T07:00:00.000Z");
  const options = {
    cooldownMs: 0,
    policy: { timeZoneOffsetMinutes: 0, dailyBudget: 2 }
  };
  const candidates = [candidate(1), candidate(2), candidate(3)];

  const exhausted = await makeEngine(store, "2026-07-13T08:00:00.000Z", options)
    .evaluateWithDecision({ candidates, runtime: {} });
  const nextDay = await makeEngine(store, "2026-07-14T00:00:01.000Z", options)
    .evaluateWithDecision({ candidates, runtime: {} });

  assert.equal(exhausted.status, "suppressed");
  assert.equal(exhausted.reason, "daily-budget-exhausted");
  assert.match(exhausted.explanation, /2/);
  assert.equal(nextDay.status, "delivered");
});

test("fails closed with an explicit reason when an enabled budget has no history adapter", async () => {
  const store = makeStore();
  delete store.getCreatedSince;

  const decision = await makeEngine(store, "2026-07-13T08:00:00.000Z", {
    cooldownMs: 0,
    policy: { dailyBudget: 1 }
  }).evaluateWithDecision({
    candidates: [candidate(1), candidate(2), candidate(3)],
    runtime: {}
  });

  assert.equal(decision.status, "suppressed");
  assert.equal(decision.reason, "policy-history-unavailable");
});

test("enforces a per-kind cooldown independently from the global cooldown", async () => {
  const store = makeStore();
  store.seedSuggestion("desktop-inbox", "2026-07-13T07:30:00.000Z");
  const options = {
    cooldownMs: 0,
    policy: {
      perKind: { "desktop-inbox": { cooldownMs: 60 * 60 * 1000 } }
    }
  };
  const candidates = [candidate(1), candidate(2), candidate(3)];

  const coolingDown = await makeEngine(store, "2026-07-13T08:00:00.000Z", options)
    .evaluateWithDecision({ candidates, runtime: {} });
  const resumed = await makeEngine(store, "2026-07-13T08:30:01.000Z", options)
    .evaluateWithDecision({ candidates, runtime: {} });

  assert.equal(coolingDown.status, "suppressed");
  assert.equal(coolingDown.reason, "kind-cooldown");
  assert.equal(resumed.status, "delivered");
});

test("counts only matching suggestion kinds against a per-kind daily budget", async () => {
  const store = makeStore();
  store.seedSuggestion("wallpaper", "2026-07-13T01:00:00.000Z");
  store.seedSuggestion("wallpaper", "2026-07-13T02:00:00.000Z");
  store.seedSuggestion("desktop-inbox", "2026-07-13T03:00:00.000Z");

  const decision = await makeEngine(store, "2026-07-13T08:00:00.000Z", {
    cooldownMs: 0,
    policy: {
      timeZoneOffsetMinutes: 0,
      perKind: { "desktop-inbox": { dailyBudget: 1 } }
    }
  }).evaluateWithDecision({
    candidates: [candidate(1), candidate(2), candidate(3)],
    runtime: {}
  });

  assert.equal(decision.status, "suppressed");
  assert.equal(decision.reason, "kind-daily-budget-exhausted");
  assert.match(decision.explanation, /desktop-inbox/);
});

test("accepts legacy persisted controls and lets persisted policy override defaults", async () => {
  const candidates = [candidate(1), candidate(2), candidate(3)];
  const legacyStore = makeStore();
  legacyStore.saveDeliveryControls({
    snoozedUntil: "2026-07-13T09:00:00.000Z",
    mutedUntil: null,
    disabled: false
  });
  const legacyDecision = await makeEngine(legacyStore, "2026-07-13T08:00:00.000Z")
    .evaluateWithDecision({ candidates, runtime: {} });

  const policyStore = makeStore();
  policyStore.saveDeliveryControls({
    snoozedUntil: null,
    mutedUntil: null,
    disabled: false,
    policy: {
      timeZoneOffsetMinutes: 0,
      quietHours: { enabled: true, start: "07:00", end: "09:00" }
    }
  });
  const policyDecision = await makeEngine(policyStore, "2026-07-13T08:00:00.000Z", {
    policy: { quietHours: { enabled: false, start: "00:00", end: "00:00" } }
  }).evaluateWithDecision({ candidates, runtime: {} });

  assert.equal(legacyDecision.reason, "delivery-snoozed");
  assert.ok(legacyDecision.explanation.length > 0);
  assert.equal(policyDecision.reason, "scheduled-quiet-hours");
});

test("creates a desktop-inbox suggestion only when three ordinary files are eligible", async () => {
  const store = makeStore();
  const engine = makeEngine(store);

  assert.equal(await engine.evaluate({ candidates: [candidate(1), candidate(2)], runtime: {} }), null);
  assert.equal(await engine.evaluate({
    candidates: [
      candidate(1),
      candidate(2),
      candidate(3, "shortcut.lnk", { isShortcut: true }),
      candidate(4, "folder", { isDirectory: true })
    ],
    runtime: {}
  }), null);

  const suggestion = await engine.evaluate({ candidates: [candidate(1), candidate(2), candidate(3)], runtime: {} });
  assert.equal(suggestion.kind, "desktop-inbox");
  assert.equal(suggestion.status, "ready");
  assert.equal(suggestion.planId, null);
  assert.match(suggestion.detail, /3/);
});

test("suppresses suggestions during quiet time, fullscreen, and low-power states", async () => {
  const states = [
    { quietHours: true },
    { fullscreen: true },
    { batterySaver: true },
    { isBatteryLow: true },
    { batteryLevel: 20 }
  ];

  for (const runtime of states) {
    const store = makeStore();
    const suggestion = await makeEngine(store).evaluate({ candidates: [candidate(1), candidate(2), candidate(3)], runtime });
    assert.equal(suggestion, null);
    assert.equal(store.count(), 0);
  }
});

test("enforces the default six-hour global cooldown", async () => {
  const store = makeStore();
  store.setLatestCreatedAt("2026-07-13T03:00:01.000Z");

  const blocked = await makeEngine(store).evaluate({ candidates: [candidate(1), candidate(2), candidate(3)], runtime: {} });
  assert.equal(blocked, null);

  const allowed = await makeEngine(store, "2026-07-13T09:00:02.000Z").evaluate({ candidates: [candidate(1), candidate(2), candidate(3)], runtime: {} });
  assert.equal(allowed?.status, "ready");
});

test("is idempotent for stable input and never re-pushes an existing dismissed or completed batch", async () => {
  const candidates = [candidate(3), candidate(1), candidate(2)];
  const store = makeStore();
  const engine = makeEngine(store);

  const first = await engine.evaluate({ candidates, runtime: {} });
  const repeated = await engine.evaluate({ candidates: [...candidates].reverse(), runtime: {} });
  assert.ok(first);
  assert.equal(repeated, null);
  assert.equal(store.count(), 1);

  const dismissedStore = makeStore();
  const dismissedEngine = makeEngine(dismissedStore);
  const dismissed = await dismissedEngine.evaluate({ candidates, runtime: {} });
  dismissedStore.setFirstStatus("dismissed");
  const dismissedRepeat = await dismissedEngine.evaluate({ candidates, runtime: {} });
  assert.ok(dismissed);
  assert.equal(dismissedRepeat, null);

  const completedStore = makeStore();
  const completedEngine = makeEngine(completedStore);
  await completedEngine.evaluate({ candidates, runtime: {} });
  completedStore.setFirstStatus("completed");
  assert.equal(await completedEngine.evaluate({ candidates, runtime: {} }), null);
});

test("snoozes delivery until the requested time, then resumes after expiry", async () => {
  const store = makeStore();
  const engine = makeEngine(store, "2026-07-13T08:00:00.000Z");
  const candidates = [candidate(1), candidate(2), candidate(3)];

  await engine.snoozeUntil(new Date("2026-07-13T10:00:00.000Z"));
  assert.equal(store.controls().snoozedUntil, "2026-07-13T10:00:00.000Z");
  assert.equal(await engine.evaluate({ candidates, runtime: {} }), null);

  const resumed = await makeEngine(store, "2026-07-13T10:00:01.000Z").evaluate({ candidates, runtime: {} });
  assert.equal(resumed?.status, "ready");
});

test("permanent mute disables all future suggestion delivery", async () => {
  const store = makeStore();
  const engine = makeEngine(store);

  await engine.disable();
  assert.equal(store.controls().disabled, true);
  assert.equal(await engine.evaluate({ candidates: [candidate(1), candidate(2), candidate(3)], runtime: {} }), null);
  assert.equal(store.count(), 0);
});

test("temporary mute expires and allows a new suggestion", async () => {
  const store = makeStore();
  const candidates = [candidate(1), candidate(2), candidate(3)];
  const engine = makeEngine(store, "2026-07-13T08:00:00.000Z");

  await engine.muteUntil(new Date("2026-07-13T09:00:00.000Z"));
  assert.equal(await engine.evaluate({ candidates, runtime: {} }), null);

  const afterMute = await makeEngine(store, "2026-07-13T09:00:01.000Z").evaluate({ candidates, runtime: {} });
  assert.equal(afterMute?.status, "ready");
});
