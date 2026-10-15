# Diamond Mine Africa (DMA)

> **Mine Today. Grow Tomorrow.**
> Mobile-first staging prototype with Supabase authentication, private CBE receipt uploads, manual admin review and an initial server-side ledger foundation. **Not live or production-certified.**

---

## 1. Project Overview

**Diamond Mine Africa** is a diamond-themed, mobile-first web app for Ethiopian users. Demo mode continues to use simulated local records. With Supabase configured, this package adds a **staging-only** phone/password auth and admin-reviewed CBE recharge/withdrawal workflow with a server-side ledger foundation. It does not verify a real mining operation, guarantee returns, or initiate bank transfers. It features:

- **Mobile-First Luxury Design**: White canvas, deep royal blue primary actions, emerald success states, restrained gold accents, and dark navy typography.
- **Phone/Password Auth**: Supabase phone/password sign-up and login; registration uses phone, password confirmation and optional invitation code, plus platform rules onboarding.
- **5-Image Rotating Hero Carousel**: 5-second automatic progression, manual controls, touch-swipe gestures, and pause-on-interaction.
- **VIP 1 to VIP 10 Gemstone Catalogue**: 10 visually distinct gemstone cuts (Brilliant Round, Princess, Radiant, Emerald, Cushion, Marquise, Oval, Pear, Heart, Asscher), complete with carat equivalents, clarity grades, and 365-day illustrative daily return profiles.
- **Daily Check-In & Attendance**: Simulated 1 ETB demo reward with 24-hour rate limiting.
- **Earnings & Claim Dashboard**: Simulated claim records, a 24-hour cooldown, historical demo ledger, and remaining-period tracking.
- **100 ETB Registration Bonus & Task Center**: Structured bonus pool allocating 90 ETB across 3 verified tasks (Join Channel: 50 ETB, Mineral Catalogue: 30 ETB, Invite Friend: 10 ETB), and preserving 10 ETB as unallocated demonstration reserve.
- **4-Level Team Network & Commission Infographic**: Comprehensive referral hierarchy (Level 1: 10%, Level 2: 3%, Level 3: 2%, Level 4: 1%), distinguishing active qualifying customers from pending members.
- **Team Recharge Reward Table & Manager Tier**: Interactive 15,000–250,000 ETB team reward table and dedicated 25,000 ETB Regional Manager tier.
- **Staging Recharge & Withdrawal**: CBE-only form, 300–200,000 ETB limits, private receipt upload, transaction reference, 15-minute server expiry, admin approve/reject, one-time saved withdrawal destination, server-side reserve/refund and manual payout recording.
- **Supabase Admin Review**: Database admin authorization, receipt review, Accept/Reject RPCs, editable active CBE settings, manual withdrawal payout reference and finance audit logs. These are staging foundations, not production certification.

---

## 2. Technology Stack

- **Frontend**: React 19, TypeScript, Vite, Tailwind CSS v4, Lucide Icons, Motion
- **Database & Architecture**: Supabase Auth/profile lookup and a staging finance migration are included. Recharge approvals can credit the staging wallet only after manual bank verification; the app never transfers funds automatically.
- **State & Storage**: Reactive demo state stored in browser `localStorage`; this is not suitable for live user or banking data.
- **Deployment**: Can be run as a demo frontend after installing dependencies. It is not production-ready for real-money transactions.

---

## 3. Directory Structure

```
├── .env.example                     # Environment variable definitions
├── index.html                       # HTML5 entry with Plus Jakarta Sans & Outfit typography
├── metadata.json                    # Application metadata and capabilities
├── package.json                     # Project manifest and scripts
├── supabase_schema.sql              # PostgreSQL DDL schema with 16 tables, Auth profile trigger and RLS policies
├── src/
│   ├── assets/
│   │   └── images/                  # High-fidelity brand and hero photography assets
│   ├── components/
│   │   ├── BottomNav.tsx            # Strictly 4-item bottom navigation
│   │   ├── CustomerSupportModal.tsx # Telegram support (@DiamondMineAfricaSupport)
│   │   ├── DailyCheckInCard.tsx     # 1 ETB daily check-in attendance widget
│   │   ├── GemstoneIcon.tsx         # 10 unique SVG faceted gemstone cuts
│   │   ├── Header.tsx               # Top navigation contract & admin switcher
│   │   ├── HeroCarousel.tsx         # 5-slide rotating hero carousel
│   │   ├── MineralCatalogueModal.tsx# African mineral archive (completes Task #2)
│   │   ├── NotificationDrawer.tsx   # In-app notifications center
│   │   ├── ProductCard.tsx          # VIP 1-10 product cards (mobile 2-col)
│   │   ├── ProductDetailModal.tsx   # Product specifications and purchase modal
│   │   ├── RechargeModal.tsx        # CBE transfer instructions & 15min timer
│   │   ├── TaskCenterModal.tsx      # 100 ETB registration bonus tasks
│   │   ├── TeamCommissionInfographic.tsx # 4-level commission visual card
│   │   ├── TeamRechargeRewardTable.tsx # 15k–250k ETB team reward table
│   │   └── WithdrawalModal.tsx      # Min 150 ETB, 8% fee calculation
│   ├── data/
│   │   └── constants.ts             # 10 VIP tiers, tasks, team rewards, CBE defaults
│   ├── hooks/
│   │   └── useStore.ts              # Reactive store state hook
│   ├── services/
│   │   ├── store.ts                 # Central business engine & persistence
│   │   └── store.test.ts            # Verification test suite for business rules
│   ├── views/
│   │   ├── AccountView.tsx          # Profile, avatar, transaction history, menu
│   │   ├── AdminDashboardView.tsx   # Protected admin portal (DIAMOND MINE AFRICA)
│   │   ├── AuthView.tsx             # Register & login with ref_by prefill
│   │   ├── EarningsView.tsx         # Mining claims, remaining days, ledger
│   │   ├── HomeView.tsx             # Carousel, actions, VIP grid, check-in
│   │   ├── PlatformRulesView.tsx    # Introductory platform rules onboarding
│   │   └── ShareView.tsx            # Referral link, 4-level team, manager tier
│   ├── App.tsx                      # Root application router and workflow container
│   ├── index.css                    # Global Tailwind CSS and typography rules
│   └── main.tsx                     # React application entry point
```

---

## 4. VIP Product Configuration (Demonstration Parameters)

| VIP Level | Price (ETB) | Reference Daily Return (ETB) | Period (Days) | Illustrative Total (ETB) | Gemstone Cut |
|:---:|:---:|:---:|:---:|:---:|:---|
| **VIP 1** | 300 | 30 | 365 | 10,950 | Brilliant Round Cut |
| **VIP 2** | 500 | 50 | 365 | 18,250 | Princess Cut |
| **VIP 3** | 1,000 | 70 | 365 | 25,550 | Radiant Cut |
| **VIP 4** | 3,000 | 225 | 365 | 82,125 | Emerald Step Cut |
| **VIP 5** | 7,000 | 560 | 365 | 204,400 | Cushion Modified Cut |
| **VIP 6** | 15,000 | 1,300 | 365 | 474,500 | Navette Marquise Cut |
| **VIP 7** | 30,000 | 2,750 | 365 | 1,003,750 | Imperial Oval Cut |
| **VIP 8** | 60,000 | 5,700 | 365 | 2,080,500 | Royal Pear Cut |
| **VIP 9** | 120,000 | 11,800 | 365 | 4,307,000 | Prestige Heart Cut |
| **VIP 10** | 200,000 | 20,500 | 365 | 7,482,500 | Crown Royal Asscher Cut |

*Note: All returns are illustrative demonstration values in an evaluation sandbox. Totals are calculated as daily figure × period; they are not verified mining revenue, guaranteed returns, or a basis for real deposits.*

---

## 5. Quick Test & Demo Credentials

- **Customer Account**:
  - Name: `Abebe Bekele`
  - Phone: `+251911234567`
  - Password: `Password123!`
  - Role: Customer (owns active VIP 1 plan with populated 4-tier network)
- **Admin Account**:
  - Name: `DIAMOND MINE AFRICA`
  - Phone: `+251900000000`
  - Password: `diamond mine Africa 1421$$$`
  - Role: Master Administrator (sign in through the standard form, then use the Admin button in the header).

---

## 6. Development & Build

```bash
# Install dependencies
npm install

# Start local development server (port 3000)
npm run dev

# Build production bundle
npm run build
```


## Demonstration safety mode

This build is **STAGING ONLY, NOT LIVE**. When Supabase is absent, recharge, withdrawal, earnings, task rewards, and referral amounts are simulated local records. When Supabase is configured, the reviewed CBE recharge and withdrawal request workflows use staging database records and wallet ledger RPCs, but admins must verify and manually execute bank transfers outside the app. The application never initiates real money transfers. `VITE_DEMO_MODE` must remain `true`; setting it to `false` intentionally blocks the application rather than activating a live-money system.

The demo store uses browser `localStorage`, and seeded demo accounts are for testing only. Do not enter real banking details, do not use the demo for real customer funds, and do not treat any return or mining figure as a guarantee or evidence of real mining revenue. A live release requires an authenticated server-side backend, proper authorization and row-level controls, independently verified payment providers, secure handling of bank details, reconciliation, monitoring, and legal/compliance review.

### Commands

- `npm run dev` — launch the local demo.
- `npm run lint` — TypeScript check.
- `npm run build` — production bundle check.
- `npm test` — demonstration store test suite.


## Business bank account settings (important)

In Supabase mode, Admin → **Payment settings** saves a new server-side CBE account version using an admin-only RPC. The active version is shown to signed-in members. No user-provided account is auto-activated by this ZIP; verify account ownership and business authorization before enabling collection details. In offline demo mode, settings remain demo data only.

## Supabase Auth integration status (development only; no SMS)

The app includes an optional Supabase phone-number + password registration/login path through `@supabase/supabase-js`. It is enabled when both `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` (or the compatibility alias `VITE_SUPABASE_ANON_KEY`) are configured. `VITE_DEMO_MODE` must remain `true`; this flag keeps financial activity clearly in demo mode and does not enable live transactions.

### Environment variables

Set these in Vercel Project → Settings → Environment Variables:

- `VITE_SUPABASE_URL` — your Supabase Project URL.
- `VITE_SUPABASE_PUBLISHABLE_KEY` — the `sb_publishable_...` public browser key.
- `VITE_DEMO_MODE` — `true`.

The `.env.example` file intentionally contains placeholders. Do not commit a real `.env` file. Never place an `sb_secret` key, `service_role` key, database password, or private credentials into any `VITE_` variable; Vite variables are delivered to the browser.

### Phone + password without SMS

In Supabase Dashboard → Authentication → Sign In / Providers (exact wording can vary), enable Phone and turn OFF phone confirmation/verification. Do not configure an SMS provider. If the dashboard requires phone confirmation, this flow will not complete signup without SMS; do not fake a successful registration. Disabling verification means users can claim unverified phone numbers, so this setup is for demonstration/testing only and is not a strong production identity check. Supabase describes phone + password auth and its phone-recycling risk in its [official password-based Auth docs](https://supabase.com/docs/guides/auth/passwords).

The initial `supabase_schema.sql` adds a profile trigger on `auth.users`. Run `supabase/migrations/202610130001_accept_platform_rules.sql` once in SQL Editor to let authenticated users persist acknowledgement of the Platform Rules without general profile-update permission. Do not rerun the entire schema against the existing project.

### Important functionality boundary

The new `supabase/migrations/202610140003_finance_review_staging.sql` adds a private receipt bucket, server wallet ledger, one-time withdrawal destinations, manual admin approve/reject/payout functions, notifications and audit entries. Apply it only after reviewing/backing up a compatible base schema on a separate staging project. The migration has **not** been run against the user's Supabase project. The package environment's `npm install` timed out, so full type-check, automated tests and Vite build remain unverified here. Keep `VITE_DEMO_MODE=true`; do not solicit real funds until end-to-end staging and compliance reviews pass.


## Important release boundary (updated 2026-10-14)

- The Admin Dashboard is only shown to an account whose `public.profiles.role` is `admin`; in a Supabase-configured deployment the screen verifies this again with `public.is_admin()` and reads Supabase user/request/audit records. See `ADMIN_SETUP_AMHARIC.md`.
- Recharge requests from Supabase-configured forms upload receipts to the private `recharge-receipts` bucket. Admin Accept checks a matching transaction reference, confirmed amount, request expiry, and uniqueness before atomically crediting the staging ledger. A receipt image/code is not sufficient proof of payment; admins must verify the real CBE account.
- Withdrawal submission atomically reserves the gross amount, rejects insufficient balance, and uses the saved withdrawal destination. Admin Reject returns the amount; Mark Paid records a real manual payout reference after the admin has already sent the net amount outside the app. The app does not transfer money.
- VIP purchases/claims, daily check-ins, task rewards and commissions cannot issue server wallet credits for Supabase users. Poster figures are illustrative only; no mining output/revenue has been verified.
- The CBE recipient is configured via Admin → Payment settings and is not automatically seeded as active. Keep `VITE_DEMO_MODE=true`, do not accept public deposits, and complete staging tests/security/legal review before any production launch.
