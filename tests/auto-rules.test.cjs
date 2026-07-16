const assert = require("node:assert/strict");
const test = require("node:test");

const { planAutoRuleExecutions } = require("../dist/main/auto-rules/auto-rules-service.js");

function rule(id, priority, enabled, value) {
  return {
    id,
    name: id,
    conditions: [{ field: "extension", operator: "equals", value }],
    action: { type: "move-to-container", target: "2" },
    priority,
    enabled,
    runCount: 0,
    lastRunAt: null,
    createdAt: "2026-07-16T00:00:00.000Z"
  };
}

test("automatic rules preview respects priority and disabled rules without mutating files", () => {
  const files = [
    { id: 1, filename: "brief.pdf", extension: ".pdf", category: "document", modifiedAt: "2026-07-15T00:00:00.000Z" },
    { id: 2, filename: "notes.md", extension: ".md", category: "document", modifiedAt: "2026-07-15T00:00:00.000Z" }
  ];
  const result = planAutoRuleExecutions([
    rule("late-pdf", 20, true, ".pdf"),
    rule("disabled-md", 0, false, ".md"),
    rule("early-pdf", 5, true, ".pdf")
  ], files);

  assert.deepEqual(result.map((item) => item.ruleId), ["early-pdf", "late-pdf"]);
  assert.deepEqual(result.map((item) => item.fileIds), [[1], [1]]);
  assert.equal(files[0].extension, ".pdf");
});
