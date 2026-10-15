# የሙከራ ሁኔታ — 2026-10-14

## የተጨመሩ የStaging ስራዎች

- Registration ከphone/password/confirm password/invitation code ብቻ የሚሰራ ተጠቃሚ ቅጽ ነው፤ login ደግሞ phone/password ይጠቀማል። Supabase profile trigger ለተጠቃሚው default ስም ይሰጣል።
- Recharge UI 300–200,000 ETB ያስፈቅዳል፣ preset/custom amount ይሰጣል፣ የCBE አካውንትን ከactive admin settings ያነባል፣ receipt-ን private Storage bucket ላይ ይጭናል፣ transaction reference እና 15-minute expiry ያስቀምጣል።
- `supabase/migrations/202610140003_finance_review_staging.sql` wallet account/ledger, unique transaction references, private receipts, one-time withdrawal destination, server-side withdrawal reservation/refund, admin recharge approve/reject RPC, manual-payout recording, notifications, editable CBE settings, and audit entries-ийг нэмж өгдөг.
- Admin Dashboard дээр receipt харах, bank reference/amount-ийг нэмж баталгаажуулан Accept + credit хийх, Reject-ийг шалтгаантай хийх, withdrawal-г manual payout-ийн дараа Mark Paid хийх эсвэл reject/refund хийх, CBE settings өөрчлөх хэсгүүд нэмэгдсэн.
- Supabase-д холбогдсон хэрэглэгчдийн VIP claim/ purchase, daily check-in, task reward зэрэг demo credit олгодог товчнууд хаалттай байна. Demo/localStorage balance нь server wallet-д импортлогдохгүй.
- Withdrawal refresh товч server wallet balance болон хадгалсан destination-ийг дахин уншина.

## Баталгаажсан зүйлс ба хязгаар

- ZIP-ийн эх кодыг шалгасан; TSX syntax parser-ийг ажиллуулах шаардлагатай. `npm install` энэ packaging environment-д timeout болсон тул бүрэн TypeScript type-check, automated tests эсвэл production build амжилттай гэж хараахан батлагдаагүй.
- Шинэ SQL migration Supabase-д хараахан ажиллуулаагүй, bank/payment flows бодит дансан дээр тестлээгүй. Энэ хүрээлэнгээс Supabase руу login/deploy хийгдээгүй.
- `VITE_DEMO_MODE=true` хэвээр үлдээ. Үүнийг `false` болгох нь Live Mode нээхгүй; апп өөрөө live mode-ийг хаадаг.
- CBE дансны дугаарыг ZIP дотор автоматаар active болгож суулгаагүй. Admin → Payment settings дээр эзэмшил, зориулалт нь батлагдсан дансыг админ өөрөө тохируулна.
- VIP зураг дээрх 365 өдрийн тооцоо 25.55×–37.41× үнэд хүрч байгаа учраас эдгээрийг баталгаатай бодит орлого гэж үзэх боломжгүй. Supabase wallet-д VIP claims, commissions автоматаар кредитлэхийг идэвхжүүлээгүй.

## Дараагийн алхам

`STAGING_IMPLEMENTATION_GUIDE_AMHARIC.md`-ийг уншаад эхлээд тусдаа staging Supabase project дээр migration-ийг backup хийж, schema review-ийн дараа гар аргаар ажиллуул. Дараа нь `npm run lint`, `npm test`, `npm run build`-ийг өөрийн компьютерт dependency install дууссаны дараа ажиллуул. Тестүүд амжилттай болохоос өмнө бодит хэрэглэгчдийн мөнгө бүү хүлээн ав.
