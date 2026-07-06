export const IPC_CHANNELS = {
  APP_INFO: "app:info",
  WINDOW_SHOW_MAIN: "window:show-main",
  WINDOW_OPEN_SETTINGS: "window:open-settings",
  DESKTOP_ACTIVATE: "desktop:activate",
  DESKTOP_DEACTIVATE: "desktop:deactivate",
  DESKTOP_STATUS: "desktop:status",
  DESKTOP_SCAN: "desktop:scan",
  DESKTOP_GET_FILES: "desktop:get-files",
  DESKTOP_OPEN_FILE: "desktop:open-file",
  DESKTOP_OPEN_FILE_LOCATION: "desktop:open-file-location",
  DESKTOP_MOVE_FILE: "desktop:move-file",
  DESKTOP_RENAME_ALIAS: "desktop:rename-file-alias",
  DESKTOP_HIDE_FILE: "desktop:hide-file",
  DESKTOP_FILES_UPDATED: "desktop:files-updated",
  DATABASE_STATUS: "database:status",
  CONTAINERS_GET_ALL: "containers:get-all",
  CONTAINERS_UPDATE_POSITION: "containers:update-position",
  LAYOUTS_GET_ALL: "layouts:get-all",
  LAYOUTS_APPLY: "layouts:apply",
  PREVIEW_FILE: "preview:file",
  SETTINGS_GET_ALL: "settings:get-all",
  SETTINGS_UPDATE: "settings:update",
  WEATHER_GET_CURRENT: "weather:get-current",
  AI_CHAT_SEND: "ai:chat-send",
  AI_CHAT_HISTORY: "ai:chat-history",
  STATE_GET: "state:get",
  STATE_SET: "state:set",
  PET_GET_WINDOW_BOUNDS: "pet:get-window-bounds",
  PET_MOVE_WINDOW: "pet:move-window",
  PET_RESET_WINDOW: "pet:reset-window",
  PET_SHOW: "pet:show",
  PET_HIDE: "pet:hide",
  LOGS_OPEN: "logs:open",
  MENU_COMMAND: "menu:command"
} as const;

export type IpcChannel = (typeof IPC_CHANNELS)[keyof typeof IPC_CHANNELS];

export const MENU_COMMANDS = {
  SHOW_MAIN: "show-main",
  OPEN_SETTINGS: "open-settings",
  ACTIVATE_DESKTOP: "activate-desktop",
  DEACTIVATE_DESKTOP: "deactivate-desktop",
  QUIT: "quit"
} as const;

export type MenuCommand = (typeof MENU_COMMANDS)[keyof typeof MENU_COMMANDS];
