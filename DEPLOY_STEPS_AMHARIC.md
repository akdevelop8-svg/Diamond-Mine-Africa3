# Diamond Mine Africa — Staging deploy алхмууд (Amharic)

**ЧУХАЛ: Энэ build LIVE биш.** Бодит мөнгө цуглуулах/гаргахын өмнө migration, RLS, Build, банкны reconciliation, security болон хууль/зохицуулалтын review амжилттай дууссан байх ёстой. `VITE_DEMO_MODE=true` хэвээр байлга.

## 1. ZIP болон GitHub

1. `Diamond_Mine_Africa_STAGING_REVIEW_FLOW_NOT_LIVE.zip`-ийг татаж Extract хийнэ.
2. `diamond-mine-africa/` доторх агуулгыг GitHub repository root-д ижил замаар хуулна. ZIP-г дангаар нь upload хийх нь source code-г deploy хийхгүй.
3. Root дээр `package.json`, `index.html`, `vite.config.ts`, `vercel.json`, `src/`, `supabase/` байгаа эсэхийг шалга.
4. Commit хийхээс өмнө `.env` эсвэл secret файл ороогүйг шалга.

## 2. Staging Supabase

1. Боломжтой бол live өгөгдлөөс тусдаа staging project үүсгэ; одоогийн DB-ээ backup хий.
2. Хэрэв compatible base tables, policies болон helper functions аль хэдийн байгаа бол `supabase_schema.sql`-ийг дахин бүхэлд нь бүү ажиллуул.
3. Өмнөх migrations-ууд ажилласан эсэхийг шалга. Дутуу байвал зөв дарааллаар review хийж ажиллуул: `202610130001_accept_platform_rules.sql`, `202610140001_profile_status_guard.sql`, дараа нь `202610140003_finance_review_staging.sql`.
4. Санхүүгийн migration нь existing base schema-г шаарддаг. `profiles`, `recharge_requests`, `withdrawal_requests`, `business_payment_config`, `notifications`, `audit_logs` эсвэл `current_profile_id()`/`is_admin()` байхгүй/өөр бүтэцтэй байвал бүү ажиллуул; schema-г эхлээд нийцүүл.
5. SQL Editor-д migration бүрийг review хийгээд нэг нэгээр нь ажиллуул. Алдаа гарвал давтан бүтэн ажиллуулахын оронд алдааг судалж, backup-аас хамгаал.
6. `ADMIN_SETUP_AMHARIC.md`-ийг дагаж зөвхөн итгэмжлэгдсэн admin account-д `role=admin` тохируул.
7. Admin → Payment settings дотор account holder, CBE account number, instruction тохируулна. Үүнийг зөвхөн дансны эзэмшил ба бизнесийн зөвшөөрлийг тусад нь баталсны дараа идэвхжүүл. ZIP дотор хэрэглэгчийн өгсөн дансыг автоматаар active болгож тавиагүй.

## 3. Auth settings

- Staging-д phone/password Auth ашиглана.
- Phone confirmation-ийг унтраах нь хэрэглэгч утас эзэмшдэгийг шалгахгүй гэсэн үг тул зөвхөн тестийн орчинд хэрэглэ. Live гаргахын өмнө OTP эсвэл өөр баталгаажуулалт төлөвлө.
- `VITE_SUPABASE_URL` болон `VITE_SUPABASE_PUBLISHABLE_KEY`-г өөрийн staging project-оос ав.
- `VITE_DEMO_MODE=true` байлга.
- `service_role`, secret API key, database password зэргийг `VITE_` environment-д эсвэл client-side code-д бүү оруул.

## 4. Build ба шалгалт

Dependency-үүд суусны дараа локал компьютер дээр:

```bash
npm install
npm run lint
npm test
npm run build
```

Энэ packaging environment-д `npm install` timeout болсон. Тиймээс энэ ZIP-д бүрэн type-check, automated tests, Vite production build амжилттай болсон гэж батлахгүй. Эдгээрийг өөрийн орчинд амжилттай ажиллуулах хүртэл public production deploy бүү хий.

## 5. Заавал staging дээр шалгах урсгал

- Өөр account-оос өөр хүний receipt, wallet, bank destination унших оролдлого хаагддаг эсэх.
- Recharge amount 300-аас бага/200,000-аас их, receipt байхгүй/5 MB-аас их, эсвэл зөвшөөрөгдөөгүй төрлийн файл оруулахад татгалзаж байгаа эсэх.
- Банкны хуулга дээрх code болон amount таарахгүй бол Accept ажиллахгүй эсэх; нэг transaction reference хоёр удаа credit үүсгэхгүй эсэх.
- 15 минутын countdown дууссан ч бодит CBE шилжүүлгийг банкны хуулгаар баталгаажуулсан админ Accept хийж болох; таймер ганцаараа төлбөрийг хүчингүй болгохгүй. Reject reason нь хэрэглэгчийн notification-д ирэх эсэх.
- Withdrawal destination заавал хадгалсан, баланс хүрэлцсэн, өрсөлдөөнт хоёр request баланс сөрөг болгохгүй; Reject буцаалт нэг л удаа хийх эсэх.
- Админ мөнгийг гаднаас бодитоор шилжүүлсний дараа л Mark Paid дарж, reference бүртгэдэг эсэх.
- Account setting өөрчлөхөд зөвхөн нэг active version үлдэж, хэрэглэгчид шинэ данс хардаг эсэх.
- Approve/reject/refund/payout бүх шийдвэр audit log болон notification үүсгэдэг эсэх.

## 6. Vercel

1. Framework Preset: `Vite`, Build Command: `npm run build`, Output Directory: `dist`, Root Directory: `./`.
2. Өөрийн staging Supabase `VITE_` variables-ийг нэмээд `VITE_DEMO_MODE=true` байлга.
3. Build log шалгаж, хувийн staging URL дээр турш. Бодит хэрэглэгчийн мөнгө, public payment account ашиглахгүй.

## Одоогоор идэвхгүй үлдсэн зүйл

- App банк руу мөнгө шилжүүлэхгүй, CBE transfer-ийг API-аар автоматаар баталгаажуулахгүй; admin банкны хуулгатай тулгаж гараар шалгана.
- VIP purchase/daily claim, daily check-in rewards, task/team/referral commissions Supabase mode-д бодит wallet credit хийхгүй.
- Poster-ийн VIP daily × 365 тооцоо худалдан авсан дүнгийн ~25.55×–37.41× хүрдэг. Үүнийг бодит mining revenue гэж нотлох мэдээлэл байхгүй тул бодит мөнгөний өгөөж хэлбэрээр идэвхжүүлээгүй.
