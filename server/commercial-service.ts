import {
  addDays,
  assertPositiveMinorAmount,
  CommercialDomainError,
  normalizeEmail,
  transitionOrder,
  type Account,
  type AuditRecord,
  type Device,
  type EntitlementGrant,
  type EntitlementSnapshotPayload,
  type Order,
  type OrderStatus,
  type PaymentCallbackResult,
  type PaymentChannel,
  type RawPaymentCallback,
  type VerifiedPaymentEvent
} from "./domain";
import type {
  AccountRepository,
  AuditRepository,
  Clock,
  CommercialTransactionRunner,
  DeviceRepository,
  EntitlementRepository,
  EntitlementSnapshotSigner,
  IdGenerator,
  OrderRepository,
  PaymentCallbackRepository,
  PaymentSignatureVerifier,
  ProductCatalog
} from "./ports";

export interface CommercialServiceDependencies {
  accounts: AccountRepository;
  devices: DeviceRepository;
  orders: OrderRepository;
  callbacks: PaymentCallbackRepository;
  entitlements: EntitlementRepository;
  audits: AuditRepository;
  verifier: PaymentSignatureVerifier;
  catalog: ProductCatalog;
  snapshotSigner: EntitlementSnapshotSigner;
  clock: Clock;
  ids: IdGenerator;
  transactions: CommercialTransactionRunner;
}

export class CommercialService {
  constructor(private readonly dependencies: CommercialServiceDependencies) {}

  async createAccount(input: { email: string; displayName: string }): Promise<Account> {
    const email = normalizeEmail(input.email);
    const existing = await this.dependencies.accounts.findByEmail(email);
    if (existing) return existing;
    const now = this.now();
    const account: Account = {
      id: this.dependencies.ids.next("acct"),
      email,
      displayName: input.displayName.trim().slice(0, 80) || "Project D user",
      status: "active",
      createdAt: now,
      updatedAt: now
    };
    await this.dependencies.accounts.insert(account);
    await this.audit(account.id, "account", account.id, "account.created", "account", account.id, {});
    return account;
  }

  async registerDevice(input: {
    accountId: string;
    installationId: string;
    displayName: string;
  }): Promise<Device> {
    await this.requireActiveAccount(input.accountId);
    const installationId = input.installationId.trim();
    if (!installationId) throw new CommercialDomainError("DEVICE_INSTALLATION_ID_REQUIRED", "Installation id is required");
    const existing = await this.dependencies.devices.findByInstallation(input.accountId, installationId);
    if (existing?.status === "active") return existing;
    const now = this.now();
    const device: Device = {
      id: existing?.id ?? this.dependencies.ids.next("dev"),
      accountId: input.accountId,
      installationId,
      displayName: input.displayName.trim().slice(0, 100) || "Windows device",
      status: "active",
      registeredAt: existing?.registeredAt ?? now,
      lastSeenAt: now,
      unboundAt: null
    };
    if (existing) await this.dependencies.devices.update(device);
    else await this.dependencies.devices.insert(device);
    await this.audit(input.accountId, "account", input.accountId, "device.registered", "device", device.id, {});
    return device;
  }

  async listDevices(accountId: string): Promise<readonly Device[]> {
    await this.requireActiveAccount(accountId);
    return this.dependencies.devices.listByAccount(accountId);
  }

  async unbindDevice(input: { accountId: string; deviceId: string }): Promise<Device> {
    await this.requireActiveAccount(input.accountId);
    const device = await this.dependencies.devices.findById(input.deviceId);
    if (!device || device.accountId !== input.accountId) {
      throw new CommercialDomainError("DEVICE_NOT_FOUND", "Device was not found for this account");
    }
    if (device.status === "unbound") return device;
    const now = this.now();
    const updated: Device = { ...device, status: "unbound", unboundAt: now, lastSeenAt: now };
    await this.dependencies.devices.update(updated);
    await this.audit(input.accountId, "account", input.accountId, "device.unbound", "device", device.id, {});
    return updated;
  }

  async createOrder(input: {
    accountId: string;
    sku: string;
    channel: PaymentChannel;
    idempotencyKey: string;
  }): Promise<Order> {
    await this.requireActiveAccount(input.accountId);
    const idempotencyKey = input.idempotencyKey.trim();
    if (!idempotencyKey) throw new CommercialDomainError("ORDER_IDEMPOTENCY_KEY_REQUIRED", "Idempotency key is required");
    if (idempotencyKey.length > 128) {
      throw new CommercialDomainError("ORDER_IDEMPOTENCY_KEY_INVALID", "Idempotency key is too long");
    }
    if (!this.isPaymentChannel(input.channel)) {
      throw new CommercialDomainError("PAYMENT_CHANNEL_INVALID", "Payment channel is not supported");
    }
    const existing = await this.dependencies.orders.findByIdempotencyKey(input.accountId, idempotencyKey);
    if (existing) return existing;
    const product = await this.dependencies.catalog.getBySku(input.sku);
    if (!product) throw new CommercialDomainError("PRODUCT_NOT_FOUND", "Product is not available");
    assertPositiveMinorAmount(product.amountMinor);
    const now = this.now();
    const order: Order = {
      id: this.dependencies.ids.next("ord"),
      accountId: input.accountId,
      sku: product.sku,
      amountMinor: product.amountMinor,
      currency: product.currency,
      channel: input.channel,
      status: "pending",
      idempotencyKey,
      channelOrderId: null,
      createdAt: now,
      updatedAt: now,
      paidAt: null,
      refundedAt: null
    };
    const insertion = await this.dependencies.orders.insertIfAbsent(order);
    if (!insertion.created) return insertion.order;
    await this.audit(input.accountId, "account", input.accountId, "order.created", "order", order.id, {
      sku: order.sku,
      amountMinor: order.amountMinor,
      currency: order.currency,
      channel: order.channel
    });
    return order;
  }

  async getOrder(orderId: string): Promise<Order> {
    const order = await this.dependencies.orders.findById(orderId);
    if (!order) throw new CommercialDomainError("ORDER_NOT_FOUND", "Order was not found");
    return order;
  }

  async handlePaymentCallback(callback: RawPaymentCallback): Promise<PaymentCallbackResult> {
    const event = await this.dependencies.verifier.verify(callback);
    if (!event) {
      throw new CommercialDomainError("PAYMENT_SIGNATURE_INVALID", "Payment callback signature verification failed");
    }
    this.validateVerifiedEvent(callback, event);
    const existing = await this.dependencies.callbacks.find(event.channel, event.eventId);
    if (existing) {
      if (existing.status !== "completed") {
        throw new CommercialDomainError("PAYMENT_CALLBACK_IN_PROGRESS", "Payment callback is already being processed; retry later");
      }
      const order = await this.getOrder(existing.merchantOrderId);
      await this.audit(order.accountId, "payment-provider", event.channel, "payment.callback.duplicate", "order", order.id, {
        eventId: event.eventId,
        eventType: event.eventType
      });
      return { duplicate: true, order };
    }

    const began = await this.dependencies.callbacks.begin({
      channel: event.channel,
      eventId: event.eventId,
      merchantOrderId: event.merchantOrderId,
      eventType: event.eventType,
      status: "processing",
      receivedAt: callback.receivedAt,
      completedAt: null
    });
    if (!began) {
      const concurrent = await this.dependencies.callbacks.find(event.channel, event.eventId);
      if (concurrent?.status === "completed") {
        return { duplicate: true, order: await this.getOrder(concurrent.merchantOrderId) };
      }
      throw new CommercialDomainError("PAYMENT_CALLBACK_IN_PROGRESS", "Payment callback is already being processed; retry later");
    }

    try {
      const order = await this.dependencies.transactions.run(async () => {
        const updated = await this.applyPaymentEvent(event);
        await this.dependencies.callbacks.complete(event.channel, event.eventId, this.now());
        await this.audit(updated.accountId, "payment-provider", event.channel, "payment.callback.applied", "order", updated.id, {
          eventId: event.eventId,
          eventType: event.eventType,
          channelOrderId: event.channelOrderId
        });
        return updated;
      });
      return { duplicate: false, order };
    } catch (error) {
      await this.dependencies.callbacks.abandon(event.channel, event.eventId);
      throw error;
    }
  }

  async issueEntitlementSnapshot(input: { accountId: string; deviceId: string }) {
    await this.requireActiveAccount(input.accountId);
    const device = await this.dependencies.devices.findById(input.deviceId);
    if (!device || device.accountId !== input.accountId || device.status !== "active") {
      throw new CommercialDomainError("DEVICE_NOT_ACTIVE", "An active account device is required");
    }
    const now = this.now();
    const grants = (await this.dependencies.entitlements.listByAccount(input.accountId)).filter(
      (grant) => grant.status === "active" && (!grant.endsAt || Date.parse(grant.endsAt) > Date.parse(now))
    );
    const payload: EntitlementSnapshotPayload = {
      schema: "projectd.entitlement.v1",
      snapshotId: this.dependencies.ids.next("snap"),
      accountId: input.accountId,
      deviceId: input.deviceId,
      tier: grants.some((grant) => grant.tier === "pro") ? "pro" : "free",
      features: [...new Set(grants.flatMap((grant) => grant.features))].sort(),
      issuedAt: now,
      expiresAt: new Date(Date.parse(now) + 15 * 60 * 1000).toISOString(),
      offlineGraceUntil: new Date(Date.parse(now) + 72 * 60 * 60 * 1000).toISOString(),
      entitlementVersion: grants.map((grant) => `${grant.id}:${grant.updatedAt}`).sort().join("|") || "free"
    };
    const signed = await this.dependencies.snapshotSigner.sign(payload);
    await this.audit(input.accountId, "account", input.accountId, "entitlement.snapshot.issued", "device", input.deviceId, {
      snapshotId: payload.snapshotId,
      tier: payload.tier,
      expiresAt: payload.expiresAt
    });
    return signed;
  }

  private async applyPaymentEvent(event: VerifiedPaymentEvent): Promise<Order> {
    const order = await this.getOrder(event.merchantOrderId);
    if (order.channel !== event.channel) {
      throw new CommercialDomainError("PAYMENT_CHANNEL_MISMATCH", "Payment callback channel does not match the order");
    }
    if (order.amountMinor !== event.amountMinor || order.currency !== event.currency) {
      throw new CommercialDomainError("PAYMENT_AMOUNT_MISMATCH", "Payment callback amount or currency does not match the order");
    }
    if (order.channelOrderId && order.channelOrderId !== event.channelOrderId) {
      throw new CommercialDomainError("PAYMENT_ORDER_MISMATCH", "Payment provider order id does not match the existing order");
    }

    const nextStatus = this.statusForEvent(event.eventType);
    const updated = transitionOrder({ ...order, channelOrderId: event.channelOrderId }, nextStatus, event.occurredAt);
    await this.dependencies.orders.update(updated);

    if (event.eventType === "payment.succeeded") await this.grantOrderEntitlement(updated, event.occurredAt);
    if (event.eventType === "payment.refunded") await this.revokeOrderEntitlement(updated, event.occurredAt);
    return updated;
  }

  private async grantOrderEntitlement(order: Order, occurredAt: string): Promise<void> {
    const product = await this.dependencies.catalog.getBySku(order.sku);
    if (!product) throw new CommercialDomainError("PRODUCT_NOT_FOUND", "Order product is no longer available");
    const grant: EntitlementGrant = {
      id: this.dependencies.ids.next("ent"),
      accountId: order.accountId,
      sourceOrderId: order.id,
      sku: order.sku,
      tier: product.entitlement.tier,
      features: [...product.entitlement.features].sort(),
      status: "active",
      startsAt: occurredAt,
      endsAt: product.entitlement.durationDays === null ? null : addDays(occurredAt, product.entitlement.durationDays),
      createdAt: occurredAt,
      updatedAt: occurredAt,
      revokedAt: null,
      revocationReason: null
    };
    const result = await this.dependencies.entitlements.grantIfAbsent(grant);
    if (result.created) {
      await this.audit(order.accountId, "system", null, "entitlement.granted", "entitlement", result.grant.id, {
        sourceOrderId: order.id,
        sku: order.sku
      });
    }
  }

  private async revokeOrderEntitlement(order: Order, occurredAt: string): Promise<void> {
    const revoked = await this.dependencies.entitlements.revokeBySourceOrder(
      order.id,
      occurredAt,
      "payment-refunded"
    );
    for (const grant of revoked) {
      await this.audit(order.accountId, "system", null, "entitlement.revoked", "entitlement", grant.id, {
        sourceOrderId: order.id,
        reason: "payment-refunded"
      });
    }
  }

  private statusForEvent(eventType: VerifiedPaymentEvent["eventType"]): OrderStatus {
    if (eventType === "payment.succeeded") return "paid";
    if (eventType === "payment.failed") return "failed";
    if (eventType === "payment.cancelled") return "cancelled";
    return "refunded";
  }

  private validateVerifiedEvent(callback: RawPaymentCallback, event: VerifiedPaymentEvent): void {
    if (callback.channel !== event.channel) {
      throw new CommercialDomainError("PAYMENT_CHANNEL_MISMATCH", "Verified event channel does not match callback channel");
    }
    if (!event.eventId || !event.merchantOrderId || !event.channelOrderId) {
      throw new CommercialDomainError("PAYMENT_EVENT_INVALID", "Verified payment event is incomplete");
    }
    assertPositiveMinorAmount(event.amountMinor);
    if (Number.isNaN(Date.parse(event.occurredAt)) || Number.isNaN(Date.parse(callback.receivedAt))) {
      throw new CommercialDomainError("PAYMENT_EVENT_TIME_INVALID", "Verified payment event timestamp is invalid");
    }
  }

  private isPaymentChannel(value: unknown): value is PaymentChannel {
    return value === "alipay" || value === "wechat_pay" || value === "bank_card";
  }

  private async requireActiveAccount(accountId: string): Promise<Account> {
    const account = await this.dependencies.accounts.findById(accountId);
    if (!account || account.status !== "active") {
      throw new CommercialDomainError("ACCOUNT_NOT_ACTIVE", "An active account is required");
    }
    return account;
  }

  private async audit(
    accountId: string | null,
    actorType: AuditRecord["actorType"],
    actorId: string | null,
    action: string,
    targetType: string,
    targetId: string,
    metadata: AuditRecord["metadata"]
  ): Promise<void> {
    await this.dependencies.audits.append({
      id: this.dependencies.ids.next("audit"),
      accountId,
      actorType,
      actorId,
      action,
      targetType,
      targetId,
      occurredAt: this.now(),
      metadata
    });
  }

  private now(): string {
    return this.dependencies.clock.now().toISOString();
  }
}
