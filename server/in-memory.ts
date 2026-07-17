import { createHmac, timingSafeEqual } from "node:crypto";
import type {
  Account,
  AuditRecord,
  CommercialProduct,
  Device,
  EntitlementGrant,
  EntitlementSnapshotPayload,
  Order,
  PaymentCallbackRecord,
  RawPaymentCallback,
  SignedEntitlementSnapshot,
  VerifiedPaymentEvent
} from "./domain";
import type {
  AccountRepository,
  AuditRepository,
  CommercialTransactionRunner,
  DeviceRepository,
  EntitlementRepository,
  EntitlementSnapshotSigner,
  OrderRepository,
  PaymentCallbackRepository,
  PaymentSignatureVerifier,
  ProductCatalog
} from "./ports";

function clone<T>(value: T): T {
  return structuredClone(value);
}

export class InMemoryAccountRepository implements AccountRepository {
  private readonly records = new Map<string, Account>();

  async insert(account: Account): Promise<void> {
    this.records.set(account.id, clone(account));
  }

  async findById(id: string): Promise<Account | null> {
    const value = this.records.get(id);
    return value ? clone(value) : null;
  }

  async findByEmail(email: string): Promise<Account | null> {
    const value = [...this.records.values()].find((account) => account.email === email);
    return value ? clone(value) : null;
  }
}

export class InMemoryDeviceRepository implements DeviceRepository {
  private readonly records = new Map<string, Device>();

  async insert(device: Device): Promise<void> {
    this.records.set(device.id, clone(device));
  }

  async update(device: Device): Promise<void> {
    this.records.set(device.id, clone(device));
  }

  async findById(id: string): Promise<Device | null> {
    const value = this.records.get(id);
    return value ? clone(value) : null;
  }

  async findByInstallation(accountId: string, installationId: string): Promise<Device | null> {
    const value = [...this.records.values()].find(
      (device) => device.accountId === accountId && device.installationId === installationId
    );
    return value ? clone(value) : null;
  }

  async listByAccount(accountId: string): Promise<readonly Device[]> {
    return [...this.records.values()].filter((device) => device.accountId === accountId).map(clone);
  }
}

export class InMemoryOrderRepository implements OrderRepository {
  private readonly records = new Map<string, Order>();
  private readonly idempotency = new Map<string, string>();

  async insertIfAbsent(order: Order): Promise<{ order: Order; created: boolean }> {
    const key = `${order.accountId}:${order.idempotencyKey}`;
    const existingId = this.idempotency.get(key);
    const existing = existingId ? this.records.get(existingId) : null;
    if (existing) return { order: clone(existing), created: false };
    this.records.set(order.id, clone(order));
    this.idempotency.set(key, order.id);
    return { order: clone(order), created: true };
  }

  async update(order: Order): Promise<void> {
    this.records.set(order.id, clone(order));
  }

  async findById(id: string): Promise<Order | null> {
    const value = this.records.get(id);
    return value ? clone(value) : null;
  }

  async findByIdempotencyKey(accountId: string, idempotencyKey: string): Promise<Order | null> {
    const id = this.idempotency.get(`${accountId}:${idempotencyKey}`);
    const value = id ? this.records.get(id) : null;
    return value ? clone(value) : null;
  }

  snapshot(): Order[] {
    return [...this.records.values()].map(clone);
  }

  restore(snapshot: readonly Order[]): void {
    this.records.clear();
    this.idempotency.clear();
    for (const order of snapshot) {
      this.records.set(order.id, clone(order));
      this.idempotency.set(`${order.accountId}:${order.idempotencyKey}`, order.id);
    }
  }
}

export class InMemoryPaymentCallbackRepository implements PaymentCallbackRepository {
  private readonly records = new Map<string, PaymentCallbackRecord>();

  async begin(record: PaymentCallbackRecord): Promise<boolean> {
    const key = this.key(record.channel, record.eventId);
    if (this.records.has(key)) return false;
    this.records.set(key, clone(record));
    return true;
  }

  async find(channel: string, eventId: string): Promise<PaymentCallbackRecord | null> {
    const value = this.records.get(this.key(channel, eventId));
    return value ? clone(value) : null;
  }

  async complete(channel: string, eventId: string, completedAt: string): Promise<void> {
    const key = this.key(channel, eventId);
    const value = this.records.get(key);
    if (value) this.records.set(key, { ...value, status: "completed", completedAt });
  }

  async abandon(channel: string, eventId: string): Promise<void> {
    this.records.delete(this.key(channel, eventId));
  }

  private key(channel: string, eventId: string): string {
    return `${channel}:${eventId}`;
  }

  snapshot(): PaymentCallbackRecord[] {
    return [...this.records.values()].map(clone);
  }

  restore(snapshot: readonly PaymentCallbackRecord[]): void {
    this.records.clear();
    for (const record of snapshot) this.records.set(this.key(record.channel, record.eventId), clone(record));
  }
}

export class InMemoryEntitlementRepository implements EntitlementRepository {
  private readonly records = new Map<string, EntitlementGrant>();

  async grantIfAbsent(grant: EntitlementGrant): Promise<{ grant: EntitlementGrant; created: boolean }> {
    const existing = [...this.records.values()].find((value) => value.sourceOrderId === grant.sourceOrderId);
    if (existing) return { grant: clone(existing), created: false };
    this.records.set(grant.id, clone(grant));
    return { grant: clone(grant), created: true };
  }

  async revokeBySourceOrder(
    sourceOrderId: string,
    occurredAt: string,
    reason: string
  ): Promise<readonly EntitlementGrant[]> {
    const changed: EntitlementGrant[] = [];
    for (const [id, grant] of this.records.entries()) {
      if (grant.sourceOrderId !== sourceOrderId || grant.status !== "active") continue;
      const revoked: EntitlementGrant = {
        ...grant,
        status: "revoked",
        updatedAt: occurredAt,
        revokedAt: occurredAt,
        revocationReason: reason
      };
      this.records.set(id, revoked);
      changed.push(clone(revoked));
    }
    return changed;
  }

  async listByAccount(accountId: string): Promise<readonly EntitlementGrant[]> {
    return [...this.records.values()].filter((grant) => grant.accountId === accountId).map(clone);
  }

  snapshot(): EntitlementGrant[] {
    return [...this.records.values()].map(clone);
  }

  restore(snapshot: readonly EntitlementGrant[]): void {
    this.records.clear();
    for (const grant of snapshot) this.records.set(grant.id, clone(grant));
  }
}

export class InMemoryAuditRepository implements AuditRepository {
  private readonly records: AuditRecord[] = [];

  async append(record: AuditRecord): Promise<void> {
    const metadata = Object.freeze({ ...record.metadata });
    this.records.push(Object.freeze({ ...record, metadata }));
  }

  async list(filter: { accountId?: string; action?: string } = {}): Promise<readonly AuditRecord[]> {
    return this.records
      .filter((record) => filter.accountId === undefined || record.accountId === filter.accountId)
      .filter((record) => filter.action === undefined || record.action === filter.action)
      .map((record) => Object.freeze({ ...record, metadata: Object.freeze({ ...record.metadata }) }));
  }

  snapshot(): AuditRecord[] {
    return this.records.map(clone);
  }

  restore(snapshot: readonly AuditRecord[]): void {
    this.records.splice(0, this.records.length, ...snapshot.map((record) => Object.freeze({
      ...clone(record),
      metadata: Object.freeze({ ...record.metadata })
    })));
  }
}

export class InMemoryCommercialTransaction implements CommercialTransactionRunner {
  private tail: Promise<void> = Promise.resolve();

  constructor(
    private readonly orders: InMemoryOrderRepository,
    private readonly callbacks: InMemoryPaymentCallbackRepository,
    private readonly entitlements: InMemoryEntitlementRepository,
    private readonly audits: InMemoryAuditRepository
  ) {}

  async run<T>(operation: () => Promise<T>): Promise<T> {
    const previous = this.tail;
    let release = (): void => undefined;
    this.tail = new Promise<void>((resolve) => { release = resolve; });
    await previous;
    const snapshots = {
      orders: this.orders.snapshot(),
      callbacks: this.callbacks.snapshot(),
      entitlements: this.entitlements.snapshot(),
      audits: this.audits.snapshot()
    };
    try {
      return await operation();
    } catch (error) {
      this.orders.restore(snapshots.orders);
      this.callbacks.restore(snapshots.callbacks);
      this.entitlements.restore(snapshots.entitlements);
      this.audits.restore(snapshots.audits);
      throw error;
    } finally {
      release();
    }
  }
}

export class InMemoryProductCatalog implements ProductCatalog {
  private readonly products: Map<string, CommercialProduct>;

  constructor(products: readonly CommercialProduct[]) {
    this.products = new Map(products.map((product) => [product.sku, clone(product)]));
  }

  async getBySku(sku: string): Promise<CommercialProduct | null> {
    const value = this.products.get(sku);
    return value ? clone(value) : null;
  }
}

/** Test adapter only. Production channels must use their official SDK and key service. */
export class InMemoryPaymentSignatureVerifier implements PaymentSignatureVerifier {
  private readonly verifiedEvents = new Map<string, VerifiedPaymentEvent>();

  register(verificationToken: string, event: VerifiedPaymentEvent): void {
    this.verifiedEvents.set(verificationToken, clone(event));
  }

  async verify(callback: RawPaymentCallback): Promise<VerifiedPaymentEvent | null> {
    const token = callback.headers["x-projectd-test-verification"];
    if (!token) return null;
    const event = this.verifiedEvents.get(token);
    if (!event || event.channel !== callback.channel) return null;
    return clone(event);
  }
}

/** Test adapter only. Production snapshots should use an asymmetric KMS-backed signer. */
export class InMemoryHmacEntitlementSnapshotSigner implements EntitlementSnapshotSigner {
  readonly keyId: string;
  private readonly secret: string;

  constructor(options: { keyId: string; secret: string }) {
    this.keyId = options.keyId;
    this.secret = options.secret;
  }

  async sign(payload: EntitlementSnapshotPayload): Promise<SignedEntitlementSnapshot> {
    return {
      payload: clone(payload),
      algorithm: "HS256-test-only",
      keyId: this.keyId,
      signature: this.signatureFor(payload)
    };
  }

  verify(snapshot: SignedEntitlementSnapshot): boolean {
    if (snapshot.algorithm !== "HS256-test-only" || snapshot.keyId !== this.keyId) return false;
    const expected = Buffer.from(this.signatureFor(snapshot.payload));
    const actual = Buffer.from(snapshot.signature);
    return expected.length === actual.length && timingSafeEqual(expected, actual);
  }

  private signatureFor(payload: EntitlementSnapshotPayload): string {
    return createHmac("sha256", this.secret).update(canonicalJson(payload)).digest("base64url");
  }
}

function canonicalJson(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`;
  if (value && typeof value === "object") {
    const record = value as Record<string, unknown>;
    return `{${Object.keys(record).sort().map((key) => `${JSON.stringify(key)}:${canonicalJson(record[key])}`).join(",")}}`;
  }
  return JSON.stringify(value);
}
