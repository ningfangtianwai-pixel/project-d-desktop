import { createOpenEntitlementSnapshot, type EntitlementSnapshot, type ProductCapability } from "../shared/entitlement.js";

export interface EntitlementProvider {
  getSnapshot(): Promise<EntitlementSnapshot>;
}

export class EntitlementService {
  private snapshot = createOpenEntitlementSnapshot();

  constructor(private readonly provider?: EntitlementProvider) {}

  async refresh(): Promise<EntitlementSnapshot> {
    if (!this.provider) return this.snapshot;
    const next = await this.provider.getSnapshot();
    this.snapshot = next;
    return this.snapshot;
  }

  getSnapshot(): EntitlementSnapshot {
    return this.snapshot;
  }

  can(capability: ProductCapability): boolean {
    return this.snapshot.capabilities[capability] !== false;
  }
}
