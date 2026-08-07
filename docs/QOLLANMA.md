# GreenEdu — kontent yuklash qo'llanmasi (admin uchun)

## Dars tarkibi
Har bir darsga 4 xil kontent biriktirish mumkin (hammasi ixtiyoriy, aralashtirish mumkin):

| Kontent | Qayerdan | Format |
|---|---|---|
| Maruza matni | Dars formasidagi "Maruza matni" maydoni | Oddiy matn |
| O'zingiz yaratgan 3D/VR model | "GLB fayl tanlash" tugmasi | .glb yoki .gltf (100 MB gacha) |
| Tayyor onlayn modul | "Tashqi embed havola" maydoni | Sketchfab / CoSpaces / Assemblr / YouTube 360 embed URL |
| Test | "HTML fayl tanlash" tugmasi | .html (10 MB gacha) |

## O'z VR kontentingizni qanday yuklaysiz?
Blender, Tinkercad yoki boshqa dasturda yaratgan modelingizni **GLB** formatida eksport qiling
(Blender: File → Export → glTF 2.0 → Format: GLB). So'ng dars formasida "GLB fayl tanlash"
orqali yuklang. O'quvchi uni brauzerda aylantirib ko'radi, telefonda esa "AR" tugmasi bilan
o'z xonasida joylashtiradi. VR ko'zoynakda tashqi embed (Sketchfab VR rejimi) qulayroq ishlaydi.

## Sketchfab modelini qanday olasiz?
1. sketchfab.com da modelni oching
2. **Share** (yoki `</>` Embed) tugmasini bosing
3. Ko'rsatilgan iframe kodidan faqat `src="..."` ichidagi havolani nusxalang
   (masalan: `https://sketchfab.com/models/XXXX/embed`)
4. Dars formasida "Tashqi embed havola" maydoniga joylashtiring
Sketchfab pleyerida VR ko'zoynak rejimi o'rnatilgan (pastdagi VR belgisi).

## HTML test: natijalar avtomatik qayd etilishi uchun
Testingiz yakunida quyidagi kodni chaqiring — natija bazaga yoziladi, dars avtomatik
tugatiladi, admin statistikada ko'radi:

```javascript
// score — to'plangan ball, total — jami savollar soni
window.parent.postMessage(
  { type: "greenedu:test-result", score: 8, total: 10 },
  "*"
);
```

Misol — "Natijani yuborish" tugmasi:
```html
<button onclick="window.parent.postMessage({type:'greenedu:test-result', score: togriJavoblar, total: jamiSavollar}, '*')">
  Natijani yuborish
</button>
```

Bu qatorsiz ham test ishlayveradi — faqat natija bazaga yozilmaydi
(o'quvchi "Darsni tugatdim" tugmasini o'zi bosadi).

## Test natijalarini qayerda ko'raman?
Admin → **Faollik statistikasi** sahifasining pastida:
- O'quvchilar reytingi (o'rtacha foiz bo'yicha)
- Darslar kesimida o'zlashtirish
CSV eksport tugmasi faollik jurnalini yuklab beradi.
