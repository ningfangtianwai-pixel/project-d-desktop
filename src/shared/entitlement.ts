export type EntitlementTier = "free" | "pro";

export const PRODUCT_CAPABILITIES = [
  "desktop-organize",
  "dynamic-wallpaper",
  "weather-effects",
  "luna-chat",
  "folder-portals",
  "workspace-scenes",
  "diagnostics-export"
] as const;

export type ProductCapability = (typeof PRODUCT_CAPABILITIES)[number];

export interface EntitlementSnapshot {
  tier: EntitlementTier;
  source: "local-default" | "provider";
  capabilities: Record<ProductCapability, boolean>;
  updatedAt: string;
}

export function createOpenEntitlementSnapshot(tier: EntitlementTier = "free", now = new Date()): EntitlementSnapshot {
  return {
    tier,
    source: "local-default",
    capabilities: Object.fromEntries(PRODUCT_CAPABILITIES.map((capability) => [capability, true])) as Record<ProductCapability, boolean>,
    updatedAt: now.toISOString()
  };
}

export function hasCapability(snapshot: EntitlementSnapshot, capability: ProductCapability): boolean {
  return snapshot.capabilities[capability] !== false;
}
