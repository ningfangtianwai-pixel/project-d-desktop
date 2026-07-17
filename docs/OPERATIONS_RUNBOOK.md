# Project D Operations Control Runbook

## Scope

This runbook covers the Gate 8 client-side control foundation:

- signed remote configuration and deterministic payload checksums;
- feature, asset, version, and update-distribution controls;
- expiry and replay/rollback protection;
- per-version crash-free metrics;
- P0/P1 crash alerts with deduplication and cooldown.

The modules are deliberately independent from Electron startup and networking. A later integration must provide transport, persistence, public-key provisioning, and alert delivery without weakening these rules.

## Remote configuration contract

Production configuration uses `RemoteConfigEnvelope` from `src/shared/operations.ts`. The signing service must:

1. Build a complete `payload`.
2. Compute lowercase SHA-256 over `canonicalJson(payload)`.
3. Put that digest in `payloadSha256`.
4. Sign `remoteConfigSigningBytes(envelopeWithoutSignature)` with an Ed25519 private key.
5. Encode the signature as base64 and publish the immutable envelope over HTTPS.

The private key must never ship with the desktop client. The client receives only a pinned public key. Key rotation should use a client release that trusts both the outgoing and incoming public keys before retiring the old key.

Production verification must also pass the environment's fixed `expectedConfigId`. The parser rejects unknown fields, so additive schema changes require a new supported schema version instead of silently changing signed semantics.

Unsigned local fixtures are accepted only when all of the following are explicit:

- source is `local-fixture`;
- `allowUnsignedDevelopmentFixture` is `true`;
- the caller is a development-only path.

Never derive the fixture flag from remote input. Production integration must hard-code it to `false`.

## Acceptance and rollback protection

Call `verifyRemoteConfig` before considering revision state. It rejects malformed, expired, future-issued, checksum-mismatched, wrong-environment, unsigned, or incorrectly signed documents.

After verification, call `advanceRemoteConfigCursor` against the last durable cursor:

- a greater revision is accepted;
- the same revision and checksum is idempotent;
- a lower revision is rejected as replay/rollback;
- the same revision with another checksum is rejected as a collision;
- a different `configId` is rejected.

Persist the cursor atomically only after the new configuration is durable. To operationally revert a bad policy, publish the old behavior as a new, higher revision. Do not lower the revision counter.

If fetching or verification fails, continue using the last verified, unexpired configuration. When no valid configuration remains, apply the failure policy below.

## Failure policy and protected desktop core

Every remotely controlled feature must have a local `FeatureDefinition` with a risk level.

| Feature class | No valid remote config |
| --- | --- |
| Low risk, local/visual | Use the local default (fail open) |
| Medium or high risk, online/action-taking | Disable (fail closed) |
| Protected desktop core | Always remain available |

Protected core includes, at minimum:

- static wallpaper and original-wallpaper restoration;
- native desktop icon restoration;
- ESC recovery from clean desktop;
- settings/recovery entry points;
- orderly shutdown and crash recovery.

These keys are also enforced by the immutable `PROTECTED_DESKTOP_FEATURE_KEYS` list. The optional definition flag can protect additional local features, but remote data cannot remove protection from the built-in list.

Remote controls may stop distribution of a broken version and disable its online features, but `desktopCoreAllowed` is always true. Project D must never leave the user with a blocked desktop because the control plane is unavailable or misconfigured.

Asset stops use stable asset IDs, not URLs. A stopped wallpaper or pet asset must fall back to a bundled, commercially cleared static asset. Update distribution pause prevents new delivery; it does not terminate an installed client. A withdrawn version also loses online features but retains local recovery controls.

## Crash telemetry contract

Create one `OperationsSession` when the main process starts. Record a `CrashEvent` with a unique event ID, session ID, exact app version, process, stable fingerprint, timestamp, and startup flag. Do not put filenames, chat text, API keys, user paths, prompts, or personal data into fingerprints.

`aggregateCrashMetrics`:

- deduplicates event IDs;
- groups metrics by exact app version;
- calculates crash-free sessions from known session IDs;
- keeps orphan crash events visible without changing the denominator;
- reports startup crashes and top fingerprints;
- defaults to a rolling 24-hour window.

The production dashboard should display at least 1-hour, 24-hour, and 7-day views. Alerting must use server time and server-side aggregation; the client module is the executable policy reference and local test fixture.

## Default alert policy

| Severity | Condition | Cooldown |
| --- | --- | --- |
| P0 | Crash-free rate below 95% with at least 20 sessions | 15 minutes |
| P1 | Crash-free rate below 99% with at least 20 sessions | 60 minutes |
| P0 | Same version/fingerprint reaches 10 events in 10 minutes | 15 minutes |
| P1 | Same version/fingerprint reaches 5 events in 15 minutes | 60 minutes |

P0 supersedes P1 for the same condition. Repeated observations inside cooldown are suppressed. A severity escalation bypasses cooldown. Once a condition recovers it leaves active state, so a later recurrence alerts immediately.

Suggested response targets:

- P0: acknowledge within 10 minutes; pause the affected asset/update/online feature immediately; appoint incident owner; post user status when impact is visible.
- P1: acknowledge within 30 minutes; confirm scope and regression version; prepare a higher-revision mitigation configuration.

## P0 response checklist

1. Confirm the alert from raw event count and session denominator.
2. Identify version, process, fingerprint, release channel, and first occurrence.
3. Protect the desktop core. Never issue a control that hides recovery or prevents exit.
4. Stop the smallest affected surface: asset, online feature, update distribution, then version online access.
5. Publish a signed higher-revision configuration and verify its checksum/signature independently.
6. Confirm client uptake and crash trend recovery.
7. Preserve logs and configuration envelopes for the incident timeline.
8. Publish the fix as a normal signed client release.
9. Close only after metrics recover and rollback/recovery paths are tested.
10. Write a blameless incident review with prevention actions.

## Integration checklist

- Pin production public keys in the main process, outside renderer-controlled data.
- Fetch over HTTPS with strict size and timeout limits.
- Persist the last verified envelope and cursor atomically.
- Reject expired cached configuration before policy evaluation.
- Keep telemetry opt-in/notice consistent with the privacy policy.
- Rate-limit and batch crash uploads; retain a bounded local queue.
- Redact user content and secrets before persistence or transport.
- Deliver P0/P1 alerts through at least two independent channels.
- Audit every remote policy change with operator, reason, revision, and ticket.
- Exercise config expiry, bad signature, revision replay, asset stop, version withdrawal, and alert cooldown before release.

## Local verification

Build the main process, then run only the operations tests:

```powershell
pnpm build:main
node --test tests/operations-*.test.cjs
```

The full repository gate remains:

```powershell
pnpm typecheck
pnpm test
```
