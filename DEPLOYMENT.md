# YonelMa — Deployment & Ownership Guide

YonelMa is a Next.js (App Router) application backed by Supabase (database +
auth), deployable on Vercel. This document covers setup, the environment
variables, what to switch on for launch, and how ownership is transferred.

## 1. Tech stack

- **Frontend/Backend**: Next.js 16 (App Router, React 19, TypeScript, Tailwind)
- **Database & Auth**: Supabase (Postgres + Supabase Auth)
- **Payments**: Stripe Checkout (optional, env-gated)
- **Emails**: Resend HTTP API (optional, env-gated)
- **Hosting**: Vercel (recommended)

## 2. Environment variables (`.env.local` / Vercel project settings)

| Variable | Required | Purpose |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | ✅ | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | ✅ | Supabase anon/publishable key (auth) |
| `SUPABASE_SECRET_KEY` | ✅ | Supabase service key (server-side data access) |
| `ADMIN_USERNAME` / `ADMIN_PASSWORD` | ✅ | Admin console login |
| `STRIPE_SECRET_KEY` | ⛳ | Enables online card payment |
| `STRIPE_WEBHOOK_SECRET` | ⛳ | Verifies Stripe webhook calls |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | ⛳ | Shows the "Pay online" UI |
| `NEXT_PUBLIC_APP_URL` | ⛳ | Public site URL (Stripe redirects, reset links) |
| `RESEND_API_KEY` | ⛳ | Enables transactional emails |
| `EMAIL_FROM` | ⛳ | Verified sender, e.g. `YonelMa <no-reply@yourdomain.com>` |

⛳ = optional; the related feature stays cleanly disabled until set.

## 3. Database setup (Supabase)

1. Create a Supabase project.
2. In **SQL Editor**, run `supabase/schema.sql` (creates tables + seed data).
3. Run `supabase/migration-extra-columns.sql` (adds `dropoff_point`,
   `parcel_category`, `chargeable_weight`). Safe to run anytime.
4. **Authentication → Providers → Email**: enable **"Confirm email"** so new
   sign-ups must verify their address. For reliable delivery, configure
   **custom SMTP** (Settings → Auth → SMTP) — the built-in sender is rate-limited.
5. Helper scripts (run locally with Node): `scripts/check-db.mjs` (verify
   tables), `scripts/update-pricing.mjs` (sync pricing), `scripts/migrate-statuses.mjs`.

## 4. Deploy on Vercel

1. Push the repo to GitHub.
2. In Vercel, **Import** the GitHub repo.
3. Add all environment variables (section 2) in Vercel project settings.
4. Deploy. Set `NEXT_PUBLIC_APP_URL` to the final domain.
5. **Stripe webhook**: in Stripe → Developers → Webhooks, add
   `https://<your-domain>/api/stripe/webhook`, event `checkout.session.completed`,
   and put the signing secret in `STRIPE_WEBHOOK_SECRET`.

## 5. Ownership transfer checklist

- **Supabase**: transfer the project to the client's Supabase organization
  (Project Settings → General → Transfer), or recreate under their account and
  run the SQL files.
- **Vercel**: transfer the project to the client's Vercel team, or let them
  import the GitHub repo into their own Vercel account.
- **GitHub**: transfer the repository to the client's GitHub account/org
  (Settings → Transfer ownership), or add them as owner.
- **Source code**: the full source lives in this repository — nothing is hidden
  or external.
- **Secrets**: rotate all keys (Supabase, Stripe, Resend, admin password) after
  handover so prior values are invalidated.

## 6. Local development

```bash
npm install
npm run dev      # http://localhost:3000
npm run build    # production build
```
