# Diamond Mine Africa — Admin account ба санхүүгийн хяналт (Amharic)

**Зөвхөн staging project дээр турш.** Admin тохиргоог browser-оос өөрөө role сонгож нээдэггүй; Supabase database дээр тусгай эрхтэй хүн нэг удаа тохируулна.

## 1. Admin хэрэглэгч үүсгэх

1. Staging сайтад өөрийн баталгаажсан phone number болон password-аар энгийн хэрэглэгч болж бүртгүүл.
2. Supabase Dashboard → SQL Editor руу ор.
3. Доорх query-г ажиллуулж, зөвхөн өөрийн бүртгэл гарч ирж байгаа эсэхийг шалга. Утсаа өөрийн жинхэнэ бүртгэлтэй дугаараар солино.

```sql
select id, user_id, name, phone, role
from public.profiles
where phone = '+2519XXXXXXXX';
```

Нэг мөр мөн эсэх, `user_id` нь өөрийн Auth account-тай тохирч байгаа эсэхийг батал. Хэрэв олон мөр гарвал UPDATE бүү ажиллуул.

```sql
update public.profiles
set role = 'admin'::public.user_role_enum
where phone = '+2519XXXXXXXX';

select id, user_id, name, phone, role
from public.profiles
where phone = '+2519XXXXXXXX';
```

## 2. Dashboard

1. Сайтаас sign out хийгээд дахин sign in хий.
2. Admin товч гарч ирвэл нээ. Dashboard нээгдэх бүрт DB-ийн `is_admin()` RPC-аар эрх шалгадаг.
3. `Recharges` таб дээр хэрэглэгчийн transaction code болон private receipt-ийг хар. Бодит CBE account/statement дээр мөнгө орсныг өөрөө шалгалгүй Accept бүү дар.
4. Accept үед яг ижил transaction reference болон хүссэн дүнтэй тэнцүү баталгаажсан дүн шаарддаг. Reject үед дор хаяж 3 тэмдэгттэй тодорхой шалтгаан өг.
5. `Withdrawals` таб дээр хүсэлтийн банк/Telebirr мэдээлэл болон net payout-ийг шалга. Өөрөө гадаа банк/Telebirr-ээр мөнгийг шилжүүлж, бодит transfer reference-ийг авсны дараа л Mark Paid дар. Reject нь reserved amount-ийг wallet-д буцаадаг.
6. `Audit log` дээр finance actions-ийг шалга.

## 3. CBE collection account тохируулах

Admin → **Payment settings** дотор account holder, CBE account number, instruction бичээд шинэ version хадгал. Энэ нь шинэ дансыг бүх нэвтэрсэн хэрэглэгчдэд харуулна. Дансны эзэмшил, бүртгэлийн нэр, бизнесийн эрх ба зорилгыг тусад нь баталгаажуулах хүртэл бодит мөнгө авахад ашиглаж болохгүй. ZIP дотор account-ийн хувийн мэдээллийг автоматаар идэвхжүүлээгүй.

## 4. Хамгаалалт

- Хэзээ ч `service_role` key, database password эсвэл нууц түлхүүрийг чат, GitHub, `VITE_` variable-д бүү хий.
- Бүх санхүүгийн өөрчлөлт сервер талын RPC-аар явж, browser wallet/ledger хүснэгт рүү шууд write эрхгүй байхаар migration тохируулсан.
- Receipt bucket private; хэрэглэгч зөвхөн өөрийнхийгөө харж, admin зөвшөөрөлтэйгээр түр signed URL-аар харна.
- Энэ migration Supabase дээр хараахан ажиллуулаагүй/тестлээгүй. Backup хий, эхлээд тусдаа staging project дээр турш.
- VIP зураг дээрх өгөөж батлагдаагүй тул VIP claim, referral/team/task commission-ийг server wallet-д бодит credit хийхээр нээгээгүй.
