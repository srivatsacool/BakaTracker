# Phase 9 — v2.1 · Proactive BakaSur: Production Pipeline + Web Push Delivery

Status: **NEXT** (defined; not implemented) · Builds on Phase 7 engine (`notifications/`)

---

## 1. Pipeline (track 3D) — production shape

```
scheduler (cron */15, WHEN)
  → active users
  → deterministic candidates (WHETHER)      ← existing high-value set only
  → policy suppression (SAFETY)             ← cap, quiet hours, cooldown, dedup, categories
  → bounded user context (candidate.context)
  → Workers AI message (HOW)                ← phrasing only, ≤280 chars, zod-validated
  → message validation (fail-closed)
  → delivery (WHERE)                        ← NotificationDelivery (WebPushDelivery | LogDelivery)
```

**Invariants (unchanged, enforced by tests):**
- Rules decide WHETHER; AI decides HOW. AI never decides frequency, policy bypass, quiet hours, daily cap, or authorization.
- AI is never called when deterministic policy suppresses (cost + spam protection).
- AI failure ⇒ skip candidate; core BakaTracker unaffected.
- Persist-before-deliver: delivery failure ≠ duplicate on next tick.

**Candidate sources:** v2.1 keeps the existing four (task overdue, deadline, streak-at-risk, streak-milestone). Notes/journal/activity candidates are documented future work — **do not explode the rule engine now.**

## 2. Web Push delivery (track 3E)

### 2.1 Feasibility verdict
**Clean implementation on the current architecture. No new infrastructure. No external notification providers.**

| Component | Approach | Verified |
|---|---|---|
| VAPID keys | `VAPID_PUBLIC_KEY` / `VAPID_PRIVATE_KEY` worker secrets (application-server keys) | standard |
| Client subscribe | `PushManager.subscribe({ userVisibleOnly: true, applicationServerKey })` in a custom service worker | API standard |
| Service worker | `vite-plugin-pwa` **injectManifest** with a custom `sw.js` hosting `push` + `notificationclick` handlers — the current `generateSW` config (vite.config.ts) cannot host a `push` listener, so this is a required config change | vite-plugin-pwa docs |
| Subscription storage | KV `baka:push:subs:{sub}` → array of `{ endpoint, keys:{p256dh,auth}, device, created_at }`; per-device, user-scoped; REST `GET/PUT/DELETE /push/subscription` | existing KV infra |
| Worker-side send | **`@block65/webcrypto-web-push`** v1.0.2 (MIT) — pure WebCrypto RFC 8291 (VAPID JWT + AES-128-GCM), explicitly supports Cloudflare Workers; deps are tiny (`type-fest`, `base64-arraybuffer`, `@block65/custom-error`). Alternative `web-push` (3.6.7) is Node-bound (`http_ece`, `https-proxy-agent`) — rejected | npm registry + package docs |
| Expired subscriptions | Push service returns 404/410 → prune from KV, mark device dead, log | standard |

### 2.2 Architecture
- `WebPushDelivery implements NotificationDelivery` sits beside `LogDelivery`. Engine unchanged: `runNotificationEvaluation(env, ctx, { delivery: new WebPushDelivery(env) })` in production; tests keep a recording delivery.
- No subscription for the user/device ⇒ **fall back to log delivery** (never fail the pipeline).
- Notification payload: `{ title, body, tag: "baka:{type}:{entity_id}", data: { url } }` — clicking opens the app page; `tag` dedupes at the OS level.
- Permission lifecycle: PWA settings surface requests permission; revoked/denied → subscription removed; re-granted → resubscribe. `pushsubscriptionchange` handler re-subscribes.
- **Mobile limits (documented):** iOS 16.4+ supports Web Push only for PWAs installed to the home screen; permission prompts are per-browser; silent pushes unsupported (userVisibleOnly).

### 2.3 Separation (Task 3E interfaces)
`NotificationCandidate` · `NotificationPolicy` · `AIMessageGenerator` (`generateNotificationMessage`) · `NotificationDelivery` — already distinct modules; Web Push only touches the last one.

## 3. Personality (Task 4)

- **Enum (v2.1):** `gentle | motivational | funny | tsundere | savage | celebratory`.
- **Migration:** Phase 7 shipped `gentle|funny|tsundere|professional`. On settings load, normalize legacy values (`professional` → `motivational`); unknown → `gentle`. Zod schema accepts the new enum; stored KV JSON with legacy values must not reset the user's other settings — normalize, don't reject.
- **Scope:** wording only. Enforced architecturally: `message.ts` passes the configured tone into a fixed per-tone system prompt; the record always carries the **configured** tone (model echo ignored). Never affects authorization, policy, business logic, or data access (tested).
- Storage: existing `baka:notif:settings:{sub}` — a `tone` field already exists; **no new tables/services**.

## 4. Notification controls (Task 5)

Already implemented in Phase 7 (settings REST GET/PUT + policy): opt-in/out, per-category toggles, quiet hours, timezone, daily cap, cooldown, deduplication, history ring buffer (KV, ≤50 entries). v2.1 adds:
1. **Minimal functional settings surface in the PWA** (opt-out, quiet hours, tone) — privacy requirement before push goes live; not the v2.3 design.
2. **History endpoint** `GET /notifications/history` (exists in KV; expose read-only REST + optional "mark read").
3. **Push-specific control:** per-device subscription list UI (basic) + category delivery.

AI is never called when policy suppresses — covered by the existing test suite and re-asserted in v2.1 specs.

## 5. Testing (unit, no live inference)

- Delivery abstraction: recording delivery; WebPushDelivery unit-tested with a stubbed push client (endpoint/keys validated, 404/410 pruning, no-subscription → log fallback).
- Personality: all six tones produce valid messages via fake provider; configured tone always recorded; policy/auth never affected by tone.
- Controls: settings normalization (legacy `professional`), caps/quiet hours/dedup regression (existing suite preserved).
- Engine: unchanged invariants re-run against the new delivery seam.
