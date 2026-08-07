# GreenEdu — AR/VR yashil ta'lim platformasi

Maktab o'quvchilari uchun ekologiya, biologiya va geografiya mavzularini AR va VR
texnologiyalari orqali interaktiv o'rgatadigan platforma.

Texnologiyalar: **Next.js 16** (App Router) · **Supabase** (Auth, Postgres, Storage) · **Vercel**

---

## Ishga tushirish

### 1. Baza sxemasi

Supabase Dashboard → **SQL Editor** → quyidagi faylni to'liq nusxalab, **Run** bosing:

- **Yangi loyiha** uchun: `supabase/schema.sql`
- **Mavjud baza** uchun: `supabase/update-v2.3.sql` (bir necha marta ishga tushirsa ham xato bermaydi)

Bu SQL jadvallar, RLS siyosatlari va ikkita Storage bucket (`avatars`, `content`) yaratadi.

### 2. Muhit o'zgaruvchilari

`.env.local` faylida:

```
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
ADMIN_EMAIL=...
ADMIN_PASSWORD=...
NEXT_PUBLIC_SITE_URL=https://greenedu.uz
```

`NEXT_PUBLIC_SITE_URL` — canonical havolalar, sitemap va Open Graph uchun.
O'rnatilmasa, Vercel bergan domen ishlatiladi.

> **Xavfsizlik:** `SUPABASE_SERVICE_ROLE_KEY` bazaga to'liq kirish beradi.
> Uni hech qachon brauzerga chiqarmang va production'dan oldin rotate qiling.

### 3. Ishga tushirish

```bash
npm install
npm run seed:admin   # .env.local dagi ADMIN_EMAIL/PASSWORD bilan admin yaratadi
npm run dev
```

Admin panel: `/admin-login` · O'quvchi paneli: `/user`

---

## Loyiha tuzilishi

```
src/
├─ app/
│  ├─ page.jsx                  Landing sahifa (SEO + JSON-LD)
│  ├─ layout.js                 Root layout, metadata, skip-link
│  ├─ sitemap.js robots.js manifest.js
│  ├─ login/ register/ forgot-password/ terms/ admin-login/
│  ├─ user/                     O'quvchi paneli
│  │  ├─ page.jsx               Boshqaruv paneli (1 ta API so'rovi)
│  │  ├─ courses/[id]/          Dars ko'rish, AR/VR, test
│  │  ├─ notifications/ settings/
│  ├─ admin/                    Admin paneli
│  │  ├─ dashboard/ users/ courses/ courses/[id]/ ar-vr-content/ statistics/
│  └─ api/
│     ├─ admin/                 courses, lessons, users, stats, activity, results, upload
│     └─ user/                  dashboard, enroll, complete-lesson, test-result
├─ components/                  Icons, Modal, Skeleton, CourseManager, PasswordInput, JsonLd
├─ lib/
│  ├─ api/                      respond, validate, rateLimit, client
│  ├─ seo/                      config, schema
│  ├─ supabase/                 client, server, service, adminGuard, userGuard
│  ├─ constants.js date.js gamify.js format.js
└─ proxy.js                     Marshrut himoyasi (Next 16: middleware → proxy)
```

---

## Kontent yuklash

To'liq qo'llanma: `supabase/OQITUVCHI-QOLLANMA.md`

Qisqacha — har bir dars 4 qismdan iborat bo'lishi mumkin:

| Qism | Format | Cheklov |
|---|---|---|
| Ma'ruza matni | Matn | 50 000 belgi |
| 3D model | `.glb` / `.gltf` | 120 MB |
| Embed havola | `https://` URL | Sketchfab, Assemblr, CoSpaces |
| Test | `.html` | 5 MB |

Test namunasi: `supabase/namuna-test.html` — faqat `QUESTIONS` massivini almashtiring.
Natija avtomatik qayd etilishi uchun fayldagi `postMessage` bloki saqlanishi shart.

---

## Xavfsizlik yechimlari

- Barcha API kirish nuqtalarida server tomonda validatsiya (`lib/api/validate.js`)
- Havolalar faqat `https://` — `javascript:` va `data:` bloklanadi
- Rate limit: admin login, enroll, dars tugatish, test natijasi
- `postMessage` faqat test fayli joylashgan manbadan qabul qilinadi
- Open redirect himoyasi (`safePath`)
- CSP, HSTS, X-Frame-Options, Permissions-Policy (`next.config.mjs`)
- Cookie: `httpOnly`, `sameSite=lax`, production'da `secure`
- `/admin/*` fail-closed: profil o'qishda xato bo'lsa ham kirish berilmaydi

---

## Buyruqlar

```bash
npm run dev          # ishlab chiqish serveri
npm run build        # production build
npm start            # production server
npm run lint         # ESLint
npm run seed:admin   # admin hisobini yaratish/yangilash
```
