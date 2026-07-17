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

export interface AccountRepository {
  insert(account: Account): Promise<void>;
  findById(id: string): Promise<Account | null>;
  findByEmail(email: string): Promise<Account | null>;
}

export interface DeviceRepository {
  insert(device: Device): Promise<void>;
  update(device: Device): Promise<void>;
  findById(id: string): Promise<Device | null>;
  findByInstallation(accountId: string, installationId: string): Promise<Device | null>;
  listByAccount(accountId: string): Promise<readonly Device[]>;
}

export interface OrderRepository {
  insertIfAbsent(order: Order): Promise<{ order: Order; created: boolean }>;
  update(order: Order): Promise<void>;
  findById(id: string): Promise<Order | null>;
  findByIdempotencyKey(accountId: string, idempotencyKey: string): Promise<Order | null>;
}

export interface CommercialTransactionRunner {
  run<T>(operation: () => Promise<T>): Promise<T>;
}

export interface PaymentCallbackRepository {
  begin(record: PaymentCallbackRecord): Promise<boolean>;
  find(channel: string, eventId: string): Promise<PaymentCallbackRecord | null>;
  complete(channel: string, eventId: string, completedAt: string): Promise<void>;
  abandon(channel: string, eventId: string): Promise<void>;
}

export interface EntitlementRepository {
  grantIfAbsent(grant: EntitlementGrant): Promise<{ grant: EntitlementGrant; created: boolean }>;
  revokeBySourceOrder(sourceOrderId: string, occurredAt: string, reason: string): Promise<readonly EntitlementGrant[]>;
  listByAccount(accountId: string): Promise<readonly EntitlementGrant[]>;
}

export interface AuditRepository {
  append(record: AuditRecord): Promise<void>;
  list(filter?: { accountId?: string; action?: string }): Promise<readonly AuditRecord[]>;
}

export interface ProductCatalog {
  getBySku(sku: string): Promise<CommercialProduct | null>;
}

export interface PaymentSignatureVerifier {
  verify(callback: RawPaymentCallback): Promise<VerifiedPaymentEvent | null>;
}

export interface EntitlementSnapshotSigner {
  sign(payload: EntitlementSnapshotPayload): Promise<SignedEntitlementSnapshot>;
}

export interface Clock {
  now(): Date;
}

export interface IdGenerator {
  next(prefix: string): string;
}
