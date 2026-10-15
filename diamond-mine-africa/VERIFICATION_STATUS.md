# Diamond Mine Africa — Verification Status

## Implemented in this staging bundle

- Supabase phone/password signup and login UI (phone confirmation is not used by the UI; this is not suitable for live financial accounts without phone ownership verification).
- Ethiopian phone normalization and basic validation; a profile trigger links each Auth user to a non-admin profile.
- CBE recharge request with 300–200,000 ETB whole-unit limits, private receipt upload, customer transaction reference, and database-issued 15-minute countdown timestamp.
- Manual Admin Accept/Reject RPCs: exact bank-confirmed amount/reference matching, unique verified transaction references, one-time wallet credit, notification and audit log.
- Server-side wallet accounts and ledger; withdrawal destination saved once; atomic balance reservation, 8% fee calculation, refund on rejection, and recording of a manual payout reference after an outside-app transfer.
- Admin dashboard with users, recharge/withdraw queues, ledger, audit log and versioned CBE account settings.
- VIP claims/check-ins/tasks/referral/team commissions deliberately do not credit Supabase wallets. Poster arithmetic is not proof of real revenue or guaranteed returns.
- `VITE_DEMO_MODE=true` is mandatory; setting it to false intentionally blocks the app.

## Checks performed in this packaging environment

- TypeScript/TSX parser check: 34 files parsed with 0 syntax diagnostics. This is a syntax parse only, not a complete type-check.
- `npm install --ignore-scripts --no-audit --no-fund` timed out; a fresh full `npm run lint`, test suite and Vite build could not be run.
- The SQL migration has not been executed or validated against the user's live/staging Supabase project. No live auth end-to-end, browser/mobile, banking transfer, payout or production deployment test was performed.

## Boundaries

This ZIP is a staging integration foundation, not a live financial product. Admins must independently verify transfers against the real CBE account. The app does not automatically verify payments or send payouts. The 15-minute countdown is informational; it does not alone void a real bank transfer. Use a separate staging project, back up the database and complete security/compliance review before any public launch.
