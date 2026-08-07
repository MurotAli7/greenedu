# GreenEdu — kontent yuklash qo'llanmasi

## 1. Dars ichida nima yuklash mumkin

Har bir dars 4 qismdan iborat bo'lishi mumkin (hammasi ixtiyoriy — kerakligini to'ldirasiz):

| Qism | Nima uchun | Format |
|---|---|---|
| **Ma'ruza matni** | O'quvchi o'qiydigan nazariy qism | Matn (to'g'ridan-to'g'ri formaga yoziladi) |
| **3D model** | O'zingiz yaratgan AR/VR kontent | `.glb` yoki `.gltf` (60 MB gacha) |
| **Embed havola** | Tashqi platformadagi modul | URL (Sketchfab, Assemblr EDU, CoSpaces, MyWebAR) |
| **Test** | Mavzu bo'yicha nazorat | `.html` fayl (5 MB gacha) |

Yuklash joyi: **Admin → Kurslar → [kurs] → Yangi dars / Tahrirlash**

---

## 2. O'zim yaratgan VR kontentni qanday yuklayman

### A variant — .glb fayl (tavsiya etiladi)
Bu eng qulay yo'l: fayl saytga yuklanadi, o'quvchi telefonida **AR tugmasi** paydo bo'ladi va model xonasida ko'rinadi.

1. Blender / Sketchfab / Tinkercad'da modelni yarating
2. **Eksport: glTF Binary (.glb)** formatida saqlang
3. Hajmni kamaytiring (60 MB gacha; 5–15 MB ideal):
   - Blender: `File → Export → glTF 2.0`, "Compression" (Draco) yoqing
   - Teksturalarni 1024×1024 dan oshirmang
4. Admin panelda dars formasida **"3D model fayli" → Model yuklash**
5. Dars turini **AR modul** yoki **VR modul** deb belgilang

Natijada o'quvchi modelni aylantiradi, kattalashtiradi, telefonda AR rejimga o'tadi. VR ko'zoynak uchun ham WebXR orqali ishlaydi.

### B variant — Sketchfab embed
Agar model Sketchfab'da joylashgan bo'lsa:
1. Sketchfab model sahifasi → **Embed** → **Copy** (iframe kodidan faqat `src` havolasini oling)
2. Havola shaklda bo'ladi: `https://sketchfab.com/models/XXXXXXXX/embed`
3. Uni **"Embed havola"** maydoniga qo'yasiz

Sketchfab'da VR rejimi va o'lchamlar cheklovi yo'q — katta modellar uchun qulay.

### C variant — Assemblr EDU / CoSpaces / MyWebAR
Bu platformalarda proyekt yaratib, **"Share → Embed"** havolasini olib, **"Embed havola"** maydoniga qo'yasiz.

**Muhim:** havola `https://` bilan boshlanishi va iframe'da ochilishga ruxsat berishi kerak. Ba'zi platformalar embed'ni faqat pullik rejada beradi.

---

## 3. Testni qanday yuklayman

Test — bitta mustaqil HTML fayl. Ichida savollar, tekshirish tugmasi va natija bor.

**Eng oson yo'l:** `namuna-test.html` faylini nusxa oling va faqat savollarni o'zgartiring:

```javascript
const QUESTIONS = [
  {
    q: "Savol matni?",
    options: ["Javob 1", "Javob 2", "Javob 3", "Javob 4"],
    answer: 1   // to'g'ri javob raqami (0 dan boshlanadi!)
  },
  // ... yana savollar
];
```

`answer: 0` = birinchi javob, `answer: 1` = ikkinchi javob, va h.k.

### Natija avtomatik qayd etilishi uchun
HTML fayl oxiridagi shu blok **albatta qolishi kerak**:

```javascript
window.parent.postMessage(
  { type: "greenedu:test-result", score: score, total: total },
  "*"
);
```

Bu qator natijani platformaga yuboradi. Shundan keyin:
- O'quvchining natijasi saqlanadi (foiz bilan)
- Dars avtomatik "tugatilgan" deb belgilanadi va XP beriladi
- Admin **Statistika** sahifasida natijalar solishtirmasi ko'rinadi

Agar bu qator bo'lmasa, o'quvchi testni yechadi, lekin natija hisobga olinmaydi.

### O'quvchi testni yuklab olishi
Test yonida **"Yuklab olish"** tugmasi bor — o'quvchi faylni kompyuteriga saqlab, internetsiz ham yechishi mumkin (lekin bu holda natija saytga tushmaydi).

---

## 4. Admin natijalarni qanday kuzatadi

**Admin → Faollik statistikasi** sahifasida:
- **Kunlik faollik grafigi** — davr tanlanadi (7 / 14 / 30 / 90 kun)
- **O'quvchilar reytingi** — o'rtacha test foizi bo'yicha saralanadi
- **Darslar kesimida o'zlashtirish** — eng qiyin dars birinchi turadi (o'rtacha foiz past bo'lgani)
- **CSV eksport** — Excel/SPSS'ga o'tkazish uchun (dissertatsiya tahlili uchun qulay)

---

## 5. Kunlik seriya (streak) qanday hisoblanadi

- O'quvchi saytga kirgan **har bir yangi kun** seriyani +1 qiladi (dars tugatish shart emas)
- Bir kun o'tkazib yuborilsa, seriya 1 dan boshlanadi
- 3 kun ketma-ket → **"Izchillik"** nishoni ochiladi

Bu tabiatni asrash odatini shakllantirish g'oyasiga mos: har kuni kichik qadam.
