# YonelMa — Phased delivery plan

**Response to Functional Specifications Rev SF-002-EN (16 November 2026)**
Working document · November 2026

This document answers §12 of the specification: a review of the current build,
a phased delivery plan with estimates, and the open points requiring a
decision before Phase 1 is signed off.

> **Commercial note:** effort is expressed in working days. Day rates and
> totals are deliberately left blank — they are a commercial decision, not a
> technical one, and must be filled in before this document goes to the
> founder.

---

## 1. Review of the existing build

| Item | Finding |
|---|---|
| Stack | Next.js 16, React 19, Tailwind 4, Supabase (PostgreSQL + Auth), deployed on Vercel |
| Reusable | Design system, authentication, order model, CSV/Excel exports, e-mail layer, PWA shell, admin console patterns |
| Smartphone scanning | Supported through the browser's built-in barcode detector — **no scanner hardware and no native app required** |
| Recurring costs today | Supabase free tier, Vercel hobby tier, domain. A paid Supabase plan (~25 USD/month) is advisable before launch to avoid automatic pausing of inactive projects |
| Costs not yet incurred | Transactional e-mail provider, SMS/WhatsApp messaging, card payment fees |

**Security issues found and fixed during the review**, all pre-existing:

1. The partner workspace was reachable without authentication — anyone with
   the URL could advance parcel statuses. Now guarded.
2. Tracking numbers were sequential, so one customer's number could be used to
   browse other customers' parcels. Tracking numbers are now unguessable.
3. Status updates accepted the operator's identity from the browser, making
   every tracking event forgeable. Identity is now taken from the
   authenticated session.

---

## 2. Phase 1 — Senegal domestic

**Status: built, pending acceptance testing.**

Delivered:

- Role model and access control (customer, administrator, relay merchant,
  driver, support) with shop-scoped access and an audit log
- Relay shop network: creation, approval lifecycle, opening hours, capacity,
  permitted services, CSV export
- Geographical zones with progressive commercial activation
- Administrator-managed pricing by zone, weight band and delivery method
- Operating schedule: transport days, collection cut-off, delivery promise,
  exceptional closures
- Customer booking journey with multiple parcels per booking, each parcel
  carrying its own identifier, QR label, weight, status and history
- Printable QR labels
- Smartphone scanning with manual entry fallback
- Two-step custody: driver handover followed by separate merchant acceptance
- One-time pickup codes, readable by the sender, sent to the recipient, never
  shown publicly
- Home delivery confirmed by recipient code, recording date, time and driver
- Driver rounds with parcel assignment
- Public tracking, per parcel
- Operations dashboard with filters and Excel export
- Staff account management, including credential resets

Remaining Phase 1 work:

| Work | Estimate |
|---|---|
| Acceptance testing of AT-01 … AT-10 and correction of defects found | 2–3 days |
| Transactional e-mail provider setup (domain verification, templates) | 0.5 day |
| Production environment: separate project, environment variables, deployment | 1 day |
| Founder walkthrough, adjustments to wording and layout after feedback | 1–2 days |
| **Total to Phase 1 sign-off** | **4.5–6.5 days** |

### Phase 1 exclusions, as specified

Real payments, public launch, costly third-party integrations, and any change
to the France → Senegal commercial model.

---

## 3. Phase 2 — Senegal → France

**Not started. Architecture in place.**

The shared data model already carries route type, consolidated lots, air
waybill mapping and configurable logistics partners, so Phase 2 extends the
existing platform rather than duplicating it.

| Work | Estimate |
|---|---|
| Home collection booking journey and pricing | 3–4 days |
| Consolidation: grouping parcels into lots, lot management screens | 3–4 days |
| Export formalities: document checklist, customs references per lot | 2–3 days |
| Air freight milestones, air waybill mapping, partner status import (CSV) | 3–4 days |
| French import clearance and final-mile handover | 2–3 days |
| Partner onboarding, testing, corrections | 3–4 days |
| **Total** | **16–22 days** |

**Dependency:** cannot start until the air freight partner (other than TAF),
the customs broker and the French last-mile carrier are confirmed, with their
operating rules and interfaces.

---

## 4. Phase 3 — France → Senegal adjustments

**Blocked by Legal Gate G0.** No commercial, payment, contractual or invoicing
change will be implemented before counsel confirms the permitted operating
model.

Scope once unblocked, from FR-01 … FR-06: booking fee model, professional
subscription, single checkout with visible breakdown of providers and payment
distribution, invoicing, and the terms and liability framework.

Estimate cannot be given responsibly until the legal model is known; a
provisional range of **10–15 days** assumes no change to the payment
architecture beyond what is described in the specification.

---

## 5. Open decisions

Required before Phase 1 sign-off:

1. **Offline scanning** — to be quoted separately per the specification.
   Recommendation: exclude from Phase 1. Manual entry of the parcel number
   already covers weak connectivity. If required later, estimate **4–6 days**
   for an offline queue with conflict resolution.
2. **Price validation** — current amounts are provisional test values.
3. **Parcels above 20 kg** — the price grid stops at 20 kg. Currently such a
   booking is accepted "on quotation" with no automatic price. A new band, a
   refusal rule, or confirmation of the quotation process is needed.

Required before public launch:

4. **Payments and compliance** — real collection requires separate operational
   and compliance approval.
5. **Hosting plan** — a paid database plan before launch, to prevent automatic
   pausing and to obtain daily backups.
6. **Data retention policy** — how long parcel and event records are kept, and
   the process for export and deletion requests.

---

## 6. Assumptions

- The pilot covers the Dakar administrative region as specified, with Thiès
  available for demonstration only.
- Transport runs three days per week; relay shops open daily on their own
  hours.
- No native mobile application: the responsive web interface serves ordinary
  Android phones.
- Notifications in Phase 1 are e-mail only; SMS and WhatsApp are designed for
  but not activated.
- One developer working on the project; estimates assume no parallel work.

---

## 7. Approval

Per the specification, Phase 1 development is considered started only once the
founder approves scope, cost and schedule, and real payments and commercial
operations require separate compliance and operational approval.

| | Name | Date |
|---|---|---|
| Prepared by | | |
| Approved by | | |
