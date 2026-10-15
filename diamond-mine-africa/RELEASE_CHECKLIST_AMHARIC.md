# Diamond Mine Africa — Staging release checklist

- [ ] Тусдаа staging Supabase project ашигласан, backup авсан.
- [ ] Base schema, helper functions, RLS policies хоорондоо нийцэж байгааг шалгасан.
- [ ] Өмнөх migrations байгаа эсэхийг нягтлаад л дутуу migrations-ийг зөв дарааллаар ажиллуулсан.
- [ ] `202610140003_finance_review_staging.sql`-ийг review хийж staging-д ажиллуулсан.
- [ ] Admin role-ийг зөв Auth account/profile дээр тавьж sign-out/sign-in хийсэн.
- [ ] CBE collection account-ийн эзэмшил/эрхийг баталгаажуулж Admin → Payment settings дээр тохируулсан.
- [ ] Receipt Storage privacy, user/admin RLS, amount/ref mismatch, duplicate reference, expiry, reject reason тестүүд амжилттай.
- [ ] Withdrawal destination one-time save, balance reserve, concurrent request, reject refund, manual payout mark test хийсэн.
- [ ] All finance RPC actions notifications болон audit logs гаргаж байгааг шалгасан.
- [ ] `npm install`, `npm run lint`, `npm test`, `npm run build` өөрийн орчинд бүгд амжилттай.
- [ ] Auth phone ownership verification/live security settings төлөвлөгдсөн.
- [ ] VIP/task/referral credits идэвхгүй хэвээр; бодит revenue source, accounting, compliance approval гараагүй л бол нээхгүй.
- [ ] `VITE_DEMO_MODE=true`, ямар ч secret/service-role key client bundle-д байхгүй.

**Эдгээр зүйлс бүрэн хийгдээгүй бол production money workflow гэж зарлахгүй.**
