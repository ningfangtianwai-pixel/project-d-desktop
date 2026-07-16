import type { MenuItemConstructorOptions } from "electron";
import { PET_PERSONALITIES } from "../shared/pet-behavior.js";
import type { SettingsPatch, SettingsSnapshot } from "../shared/types.js";

interface PetMenuActions {
  openConversation: () => void;
  openSettings: () => void;
  updatePet: (patch: NonNullable<SettingsPatch["pet"]>) => void;
}

type PetMenuSettings = Pick<SettingsSnapshot["pet"], "personality" | "autoOutfit" | "currentOutfit">;

export function createPetMenuTemplate(settings: PetMenuSettings, actions: PetMenuActions): MenuItemConstructorOptions[] {
  const outfits = [
    ["default", "日常装"],
    ["raincoat", "雨衣"],
    ["winter", "冬装"],
    ["summer", "夏装"],
    ["pajamas", "睡衣"]
  ] as const;

  return [
    { label: "和 Luna 对话", click: actions.openConversation },
    { type: "separator" },
    {
      label: "换装",
      submenu: [
        {
          label: "跟随天气",
          type: "radio",
          checked: settings.autoOutfit,
          click: () => actions.updatePet({ autoOutfit: true })
        },
        { type: "separator" },
        ...outfits.map(([id, label]) => ({
          label,
          type: "radio" as const,
          checked: !settings.autoOutfit && settings.currentOutfit === id,
          click: () => actions.updatePet({ autoOutfit: false, currentOutfit: id })
        }))
      ]
    },
    {
      label: "人格",
      submenu: PET_PERSONALITIES.map(([id, label]) => ({
        label,
        type: "radio" as const,
        checked: settings.personality === id,
        click: () => actions.updatePet({ personality: id })
      }))
    },
    { type: "separator" },
    { label: "打开设置", click: actions.openSettings },
    { label: "关闭桌宠", click: () => actions.updatePet({ isVisible: false }) }
  ];
}
