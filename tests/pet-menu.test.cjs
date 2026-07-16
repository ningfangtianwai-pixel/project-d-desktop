const assert = require("node:assert/strict");
const test = require("node:test");

const { createPetMenuTemplate } = require("../dist/main/pet-menu.js");

test("pet menu exposes conversation, outfits, personalities, settings, and close actions", () => {
  const calls = [];
  const template = createPetMenuTemplate(
    { personality: "gentle", autoOutfit: true, currentOutfit: "default" },
    {
      openConversation: () => calls.push("conversation"),
      openSettings: () => calls.push("settings"),
      updatePet: (patch) => calls.push(patch)
    }
  );

  assert.deepEqual(template.map((item) => item.label ?? item.type), [
    "和 Luna 对话", "separator", "换装", "人格", "separator", "打开设置", "关闭桌宠"
  ]);
  assert.equal(template[2].submenu.length, 7);
  assert.equal(template[3].submenu.length, 8);
  template[3].submenu.find((item) => item.label === "冷淡").click();
  template.at(-1).click();
  assert.deepEqual(calls, [{ personality: "cold" }, { isVisible: false }]);
});
