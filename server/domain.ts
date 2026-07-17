export type AccountStatus = "active" | "disabled" | "deleted";
export type DeviceStatus = "active" | "unbound";
export type PaymentChannel = "alipay" | "wechat_pay" | "bank_card";
export type CurrencyCode = "CNY";
export type OrderStatus = "pending" | "paid" | "failed" | "cancelled" | "expired" | "refunded";
export type PaymentEventType =
  | "payment.succeeded"
  | "payment.failed"
  | "payment.cancelled"
  | "payment.refunded";
export type EntitlementStatus = "active" | "revoked" | "expired";

export interface Account {
  id: string;
  email: string;
  displayName: string;
  status: AccountStatus;
  createdAt: string;
  updatedAt: string;
}

export interface Device {
  id: string;
  accountId: string;
  installationId: string;
  displayName: string;
  status: DeviceStatus;
  registeredAt: string;
  lastSeenAt: string;
  unboundAt: string | null;
}

export interface ProductEntitlementDefinition {
  tier: "free" | "pro";
  features: readonly string[];
  durationDays: number | null;
}

export interface CommercialProduct {
  sku: string;
  amountMinor: number;
  currency: CurrencyCode;
  entitlement: ProductEntitlementDefinition;
}

export interface Order {
  id: string;
  accountId: string;
  sku: string;
  amountMinor: number;
  currency: CurrencyCode;
  channel: PaymentChannel;
  status: OrderStatus;
  idempotencyKey: string;
  channelOrderId: string | null;
  createdAt: string;
  updatedAt: string;
  paidAt: string | null;
  refundedAt: string | null;
}

export interface RawPaymentCallback {
  channel: PaymentChannel;
  headers: Readonly<Record<string, string | undefined>>;
  body: string;
  receivedAt: string;
}

export interface VerifiedPaymentEvent {
  channel: PaymentChannel;
  eventId: string;
  eventType: PaymentEventType;
  merchantOrderId: string;
  channelOrderId: string;
  amountMinor: number;
  currency: CurrencyCode;
  occurredAt: string;
}

export interface PaymentCallbackRecord {
  channel: PaymentChannel;
  eventId: string;
  merchantOrderId: string;
  eventType: PaymentEventType;
  status: "processing" | "completed";
  receivedAt: string;
  completedAt: string | null;
}

export interface EntitlementGrant {
  id: string;
  accountId: string;
  sourceOrderId: string;
  sku: string;
  tier: "free" | "pro";
  features: readonly string[];
  status: EntitlementStatus;
  startsAt: string;
  endsAt: string | null;
  createdAt: string;
  updatedAt: string;
  revokedAt: string | null;
  revocationReason: string | null;
}

export interface EntitlementSnapshotPayload {
  schema: "projectd.entitlement.v1";
  snapshotId: string;
  accountId: string;
  deviceId: string;
  tier: "free" | "pro";
  features: readonly string[];
  issuedAt: string;
  expiresAt: string;
  offlineGraceUntil: string;
  entitlementVersion: string;
}

export interface SignedEntitlementSnapshot {
  payload: EntitlementSnapshotPayload;
  algorithm: string;
  keyId: string;
  signature: string;
}

export interface AuditRecord {
  id: string;
  accountId: string | null;
  actorType: "system" | "account" | "payment-provider" | "administrator";
  actorId: string | null;
  action: string;
  targetType: string;
  targetId: string;
  occurredAt: string;
  metadata: Readonly<Record<string, string | number | boolean | null>>;
}

export interface PaymentCallbackResult {
  duplicate: boolean;
  order: Order;
}

export class CommercialDomainError extends Error {
  constructor(
    readonly code: string,
    message: string
  ) {
    super(message);
    this.name = "CommercialDomainError";
  }
}

const ORDER_TRANSITIONS: Readonly<Record<OrderStatus, readonly OrderStatus[]>> = {
  pending: ["paid", "failed", "cancelled", "expired"],
  failed: ["paid"],
  cancelled: ["paid"],
  expired: ["paid"],
  paid: ["refunded"],
  refunded: []
};

export function transitionOrder(order: Order, nextStatus: OrderStatus, occurredAt: string): Order {
  if (order.status === nextStatus) return order;
  if (!ORDER_TRANSITIONS[order.status].includes(nextStatus)) {
    throw new CommercialDomainError(
      "ORDER_TRANSITION_INVALID",
      `Order ${order.id} cannot transition from ${order.status} to ${nextStatus}`
    );
  }

  return {
    ...order,
    status: nextStatus,
    updatedAt: occurredAt,
    paidAt: nextStatus === "paid" ? occurredAt : order.paidAt,
    refundedAt: nextStatus === "refunded" ? occurredAt : order.refundedAt
  };
}

export function assertPositiveMinorAmount(value: number): void {
  if (!Number.isSafeInteger(value) || value <= 0) {
    throw new CommercialDomainError("ORDER_AMOUNT_INVALID", "Order amount must be a positive integer in minor units");
  }
}

export function normalizeEmail(value: string): string {
  const normalized = value.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)) {
    throw new CommercialDomainError("ACCOUNT_EMAIL_INVALID", "A valid account email is required");
  }
  return normalized;
}

export function addDays(isoTimestamp: string, days: number): string {
  return new Date(Date.parse(isoTimestamp) + days * 24 * 60 * 60 * 1000).toISOString();
}

