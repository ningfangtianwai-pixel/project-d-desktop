const assert = require("node:assert/strict");
const test = require("node:test");

const { createPetMenuTemplate } = require("../dist/main/pet-menu.js");

test("pet menu exposes conversation, outfits, personalities, settings, and close actions", () => {
  const calls = [];
  const template = createPetMenuTemplate(
    { characterId: "luna-q", personality: "gentle", autoOutfit: true, currentOutfit: "default" },
    {
      openConversation: () => calls.push("conversation"),
      openSettings: () => calls.push("settings"),
      updatePet: (patch) => calls.push(patch)
    }
  );

  assert.deepEqual(template.map((item) => item.label ?? item.type), [
    "和桌宠对话", "separator", "角色", "换装", "人格", "separator", "打开设置", "关闭桌宠"
  ]);
  assert.equal(template[2].submenu.length, 5);
  assert.equal(template[3].submenu.length, 7);
  assert.equal(template[4].submenu.length, 8);
  template[2].submenu.find((item) => item.label === "林予曦").click();
  template[4].submenu.find((item) => item.label === "冷淡").click();
  template.at(-1).click();
  assert.deepEqual(calls, [{ characterId: "lin-yuxi" }, { personality: "cold" }, { isVisible: false }]);
});
