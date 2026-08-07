import Link from "next/link";

import { buildMetadata } from "@/lib/seo/config";

export const metadata = buildMetadata({
  title: "Foydalanish shartlari",
  path: "/terms",
  description:
    "GreenEdu ta'lim platformasidan foydalanish shartlari: hisob, kontent, ma'lumotlar va hurmat qoidalari.",
});

export default function TermsPage() {
  return (
    <main id="main-content" style={{ maxWidth: 720, margin: "0 auto", padding: "48px 20px 64px" }}>
      <h1 style={{ fontSize: 28, marginBottom: 18 }}>Foydalanish shartlari</h1>
      <div style={{ display: "flex", flexDirection: "column", gap: 14, color: "var(--ink-soft)" }}>
        <p>
          GreenEdu platformasi maktab o'quvchilari va o'qituvchilari uchun ta'lim
          maqsadlarida yaratilgan. Platformadan foydalanish orqali siz quyidagi
          shartlarga rozilik bildirasiz.
        </p>
        <p>
          <strong style={{ color: "var(--ink)" }}>1. Hisob.</strong> Har bir foydalanuvchi
          o'z hisobi xavfsizligi uchun javobgar. Parolni boshqalarga bermang.
        </p>
        <p>
          <strong style={{ color: "var(--ink)" }}>2. Kontent.</strong> Platformadagi o'quv
          materiallari faqat ta'lim maqsadida ishlatiladi va mualliflik huquqi bilan
          himoyalangan.
        </p>
        <p>
          <strong style={{ color: "var(--ink)" }}>3. Ma'lumotlar.</strong> O'quv faolligingiz
          (tugatilgan darslar, XP) ta'lim sifatini oshirish va ilmiy-pedagogik tahlil
          uchun anonim tarzda qayta ishlanishi mumkin.
        </p>
        <p>
          <strong style={{ color: "var(--ink)" }}>4. Hurmat.</strong> Platformada boshqa
          foydalanuvchilarga hurmat bilan munosabatda bo'ling.
        </p>
      </div>
      <p style={{ marginTop: 28 }}>
        <Link href="/" className="btn btn-ghost">← Bosh sahifaga qaytish</Link>
      </p>
    </main>
  );
}
