const assert = require("node:assert/strict");
const test = require("node:test");

const {
  makeLunaSystemInstruction,
  parseLunaIntent
} = require("../dist/main/luna/intent-parser.js");

const readyDesktopPlan = {
  id: "plan-desktop-1",
  source: "desktop-inbox",
  riskLevel: "L2",
  status: "ready"
};

test("creates only a desktop inbox preview request for supported Chinese desktop prompts", () => {
  for (const message of ["\u6574\u7406\u684c\u9762", "\u6536\u7eb3\u684c\u9762", "\u5e2e\u6211\u6536\u62fe\u684c\u9762"]) {
    const intent = parseLunaIntent({ message, actionPlan: readyDesktopPlan });
    assert.equal(intent.kind, "desktop-inbox-preview");
    assert.equal(intent.actionPlanId, "plan-desktop-1");
  }
});

test("keeps wallpaper requests separate from desktop actions", () => {
  const intent = parseLunaIntent({ message: "\u5e2e\u6211\u6362\u4e00\u5f20\u58c1\u7eb8" });
  assert.deepEqual(intent, { kind: "wallpaper", message: "\u5e2e\u6211\u6362\u4e00\u5f20\u58c1\u7eb8" });
});

test("rejects destructive, command, and path-moving wording before intent selection", () => {
  for (const message of ["\u5220\u9664\u684c\u9762", "\u6e05\u7a7a\u6587\u4ef6", "\u8986\u76d6\u5df2\u6709\u6587\u4ef6", "\u79fb\u52a8\u5230 D:\\temp", "\u8fd0\u884c\u547d\u4ee4", "powershell", "cmd", "\u811a\u672c"]) {
    const intent = parseLunaIntent({ message });
    assert.equal(intent.kind, "unsupported");
    assert.match(intent.reason, /cannot delete, overwrite, move files, run commands, or execute scripts/i);
  }
});

test("falls back safely for unknown requests while retaining normal chat", () => {
  const unknown = parseLunaIntent({ message: "\u6253\u5f00\u7cfb\u7edf\u8bbe\u7f6e" });
  assert.equal(unknown.kind, "unsupported");

  const chat = parseLunaIntent({ message: "\u4f60\u597d\uff0c\u5728\u5417\uff1f" });
  assert.deepEqual(chat, { kind: "chat", message: "\u4f60\u597d\uff0c\u5728\u5417\uff1f" });
});

test("system instruction limits providers to JSON intents and denies execution claims", () => {
  const instruction = makeLunaSystemInstruction();
  assert.match(instruction, /exactly one JSON object/i);
  assert.match(instruction, /desktop-inbox-preview/i);
  assert.match(instruction, /never request or claim delete, overwrite, move, command, script, shell, network, or file execution/i);
  assert.match(instruction, /Do not claim that any action has already happened/i);
});
