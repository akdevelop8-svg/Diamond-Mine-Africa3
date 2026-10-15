# Diamond Mine Africa — Audit and Next Steps

Current status: **STAGING / NOT LIVE.** See `VERIFICATION_STATUS_AMHARIC.md` and `STAGING_IMPLEMENTATION_GUIDE_AMHARIC.md`.

## Staging source updates

- Supabase phone/password auth integration with phone, password, password confirmation, and optional invitation code registration; phone/password login.
- CBE-only recharge form with amount constraints and presets, receipt upload into a private Storage bucket, transaction reference, and 15-minute database expiry.
- Finance migration `supabase/migrations/202610140003_finance_review_staging.sql`: wallet ledger, one-time withdrawal destination, atomic withdrawal reservation/release, unique verified payment reference, secure Admin Accept/Reject functions, notification/audit events, and admin-editable CBE account versioning.
- Admin interface for private receipt inspection, exact amount/reference confirmation, rejection reasons, manual withdrawal payout references, and account settings.
- Supabase-connected VIP, check-in, task reward and local reward credits are blocked pending validation of real revenue and legal eligibility.

## Validation limits

The code has not been deployed to Supabase and the SQL migration has not been executed against a test database. Dependency installation timed out in the packaging environment; therefore a complete type-check, test suite and Vite build are not yet certified. Do not call this production-ready.

Keep `VITE_DEMO_MODE=true`. Do not hardcode or activate the user-provided bank account automatically; admin must first verify ownership/authorization and set it in Admin → Payment settings. The app does not independently confirm deposits or send payouts—bank transfers are checked/executed manually by the administrator. The poster's VIP daily figures imply ~25.55×–37.41× of purchase price over 365 days and are not verified revenue/guaranteed returns, so those credits remain disabled.
