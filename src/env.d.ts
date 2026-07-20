/// <reference types="vite/client" />

declare module "*.vue" {
  import type { DefineComponent } from "vue";

  const component: DefineComponent<object, object, unknown>;
  export default component;
}

declare global {
  const __PROJECTD_VERSION__: string;

  interface Window {
    projectD: import("./shared/types").ProjectDApi;
  }
}

export {};
