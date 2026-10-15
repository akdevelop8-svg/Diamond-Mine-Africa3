# Diamond Mine Africa — Staging implementation guide (Amharic)

**Release status: STAGING / NOT LIVE.** This bundle includes code and a Supabase migration for manually reviewed CBE recharge requests, a server-side wallet ledger, one-time withdrawal destinations, withdrawal reservation/refund, admin review, notifications, audit records, and editable CBE account settings. The migration has **not** been executed against your Supabase project and this environment cannot verify bank transfers or send payouts.

## 1. Main member flows now wired in the source

### Registration and login
- Registration fields: Ethiopian phone number, password, confirm password, optional invitation code. The display name is assigned by the server profile trigger.
- Login: phone number and password.
- This no-SMS setup is only appropriate for staging/testing. Turning phone confirmation off allows someone to claim a phone number without proving ownership. Before real launch, configure suitable phone verification or another account-verification process.

### Recharge — CBE only
- Amount limits: 300–200,000 ETB, whole ETB amounts. Presets: 300, 500, 800, 900, 1,700, 15,000, 60,000; a custom amount is also available.
- The user sees the currently active CBE recipient account set in Admin → Payment settings.
- Receipt images are uploaded to the private `recharge-receipts` bucket (JPG/PNG/WebP, maximum 5 MB); the user must enter the transaction reference.
- A 15-minute countdown is shown after submission and the request is sent to the admin queue. The timer is informational only: an admin may approve after it ends if the real CBE account independently confirms the exact transfer.
- Admin opens the private receipt and checks the matching transaction in the real CBE statement/account. Accept requires the same transaction reference and exact confirmed amount; duplicate references are blocked. One approval credits the wallet ledger once, and creates a notification and audit entry. Reject requires a reason and notifies the member.
- A receipt image or transaction code alone is not proof that money arrived.

### Wallet and withdrawal
- The finance migration creates an empty server-side wallet for every existing profile; it does not import demo/local-storage balances.
- Withdrawal destination is saved once: CBE, Telebirr, Awash Bank, or Bank of Abyssinia plus account holder and account number. The UI cannot edit a saved destination later; corrections require a trusted support/admin procedure.
- A withdrawal request requires the destination and at least 150 ETB. The server locks the wallet, verifies the available balance, reserves the gross request amount and writes a ledger entry atomically. The UI calculates the configured 8% fee and net payout.
- Admin must send the net amount separately through the bank/wallet, confirm that transfer succeeded, and then mark the request paid with its real payout reference. The app does not initiate the transfer. Reject returns the reserved gross amount and writes an audit entry/notification.

### Admin / account settings
- Admin access is checked against the database `is_admin()` function, not the client role only.
- Admin → Recharges: view receipt, review transaction details, Accept + credit wallet, or Reject with a reason.
- Admin → Withdrawals: inspect destination, record payout after the manual transfer, or Reject and return the balance.
- Admin → Payment settings: create a new active version of the CBE account details. Only enter an account whose ownership and permitted business use have been verified. The active details are shown to all signed-in members.
- Admin → Audit log: inspect actions created by the finance RPCs. Users can inspect their notifications in the app.

## 2. Apply migrations carefully

1. Use a **separate staging Supabase project** if possible. Back up the existing database first.
2. This assumes your compatible base tables from `supabase_schema.sql` already exist. Do not rerun the full baseline schema blindly against an existing database.
3. In Supabase Dashboard → SQL Editor, review and run `supabase/migrations/202610140003_finance_review_staging.sql` once against the staging project. If the project doesn't already have the baseline tables/policies/helpers, stop and reconcile the schema first rather than running this migration alone.
4. Create a normal member account using the site. Promote only the verified admin account in SQL, following `ADMIN_SETUP_AMHARIC.md`; then sign out/in again.
5. In Admin → Payment settings, set the recipient only after independently confirming account ownership and business use. A provided account is not automatically embedded/activated in this ZIP.
6. Set the Vite environment variables to your staging project. Keep `VITE_DEMO_MODE=true`. Never put `service_role`, secret API keys or a database password in `VITE_` browser variables.
7. Install dependencies and run `npm run lint`, `npm test`, and `npm run build` locally. A previous dependency install attempt timed out in the packaging environment, so a completed dependency build has not been confirmed here.

## 3. Required staging test cases

Use small test payments / a test bank account only; do not solicit public funds.

- Wrong user/role attempts to call each admin RPC are rejected.
- User A cannot read User B's receipt/destination/ledger.
- CBE amount outside 300–200,000, non-integer input, missing receipt, unsupported MIME or >5 MB receipt is rejected.
- Accept with an incorrect amount/reference is rejected; two requests cannot use one transaction reference; double-click/replay cannot credit twice.
- The UI countdown reaches zero after 15 minutes but does not automatically void a real transfer; admin can still accept only after independently confirming its exact reference and amount in the bank.
- Withdrawal without a saved destination or with insufficient balance is rejected; concurrent requests cannot make the wallet negative; rejection refunds once; only an actually completed payout is marked paid.
- Account-settings changes produce one active version and the new version displays to all members.
- Admin finance actions have corresponding audit log entries; failed transactions do not leave partial ledger rows.

## 4. VIP chart calculations and disabled features

The poster's daily amount multiplied by 365 gives these illustrative totals:

| VIP | Price (ETB) | Daily (ETB) | 365-day total (ETB) | Total / price |
|---|---:|---:|---:|---:|
| 1 | 300 | 30 | 10,950 | 36.5× |
| 2 | 500 | 50 | 18,250 | 36.5× |
| 3 | 1,000 | 70 | 25,550 | 25.55× |
| 4 | 3,000 | 225 | 82,125 | 27.38× |
| 5 | 7,000 | 560 | 204,400 | 29.20× |
| 6 | 15,000 | 1,300 | 474,500 | 31.63× |
| 7 | 30,000 | 2,750 | 1,003,750 | 33.46× |
| 8 | 60,000 | 5,700 | 2,080,500 | 34.68× |
| 9 | 120,000 | 11,800 | 4,307,000 | 35.89× |
| 10 | 200,000 | 20,500 | 7,482,500 | 37.41× |

These are arithmetic totals from the supplied poster, **not proof of mined output, revenue, or a promised/guaranteed return**. The claimed totals range from 25.55× to 37.41× of the purchase price over one year. For that reason, server-backed VIP purchase/claim credits and referral/task rewards are deliberately disabled for Supabase-connected accounts in this staging build. Do not enable them until a verifiable revenue source, accounting model, and applicable Ethiopian legal/regulatory review establish that payouts are supportable and lawful.

## 5. What this bundle does NOT do

- It does not connect to your Supabase account or deploy SQL automatically.
- It does not confirm a bank transfer via a provider API; an authorized admin must verify it in the real account.
- It does not transfer withdrawal money to CBE/Telebirr/banks; admins execute transfers manually outside the app.
- It does not make VIP mining claims, task rewards, team commissions, or referral commissions live.
- It is not yet production-certified. Obtain a code/security review and perform the staging test cases before public launch.
