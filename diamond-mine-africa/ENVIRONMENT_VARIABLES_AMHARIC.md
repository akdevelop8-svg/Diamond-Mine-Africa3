# Diamond Mine Africa — Environment Variables & Deployment (Amharic)

## Vercel Environment Variables

Open Vercel → Diamond Mine Africa project → Settings → Environment Variables. Add these three values for Production, Preview, and Development:

`VITE_SUPABASE_URL`

`https://tetcwuirxyejgewxzsyb.supabase.co`

`VITE_SUPABASE_PUBLISHABLE_KEY`

Copy your project's `sb_publishable_...` key from Supabase → Project Settings → API Keys. Use the publishable key, not a secret key.

`VITE_DEMO_MODE`

`true`

Click Save and redeploy. Environment variable changes only apply to new deployments. Vercel documentation: https://vercel.com/docs/environment-variables/managing-environment-variables

## Supabase, without SMS

1. Open https://supabase.com/dashboard/project/tetcwuirxyejgewxzsyb
2. Authentication → Sign In / Providers (menu labels can vary).
3. Enable Phone sign-in.
4. Turn OFF Phone confirmation / verification.
5. Do not configure an SMS provider.

When confirmation is enabled, phone signup needs SMS verification. With confirmation disabled, a user can register an unverified phone number; this is only suitable for demo/testing, because phone-number recycling or impersonation can put accounts at risk. Supabase official docs: https://supabase.com/docs/guides/auth/passwords

## Existing database

The owner already ran the initial SQL schema and confirmed 16 public tables via screenshot. Do not run `supabase_schema.sql` again. If the Platform Rules migration has not been run yet, run only `supabase/migrations/202610130001_accept_platform_rules.sql` once in Supabase SQL Editor.

## Deployment

1. Extract the full ZIP.
2. Upload the contents of its inner `diamond-mine-africa` folder into the root of the existing GitHub repository, preserving all paths. Uploading only the ZIP is not enough; Vercel does not extract it into source files.
3. Commit the changes.
4. Ensure Vercel uses Framework `Vite`, Build Command `npm run build`, Output `dist`, Root Directory `./` if source files are at repository root.
5. Check the Vercel Build Log. Test register, login, Rules acknowledgement, refresh and logout.

Keep `VITE_DEMO_MODE=true`. When Supabase is configured, CBE recharge review, wallet ledger, saved withdrawal destinations, withdrawal reserve/refund and admin queues use the added staging migration. The migration is not yet applied by this package, and the application does not automatically transfer or bank-verify money. VIP activities and referral/task/team commissions remain demo/disabled for server wallet credit. Do not handle real funds with this staging build.
