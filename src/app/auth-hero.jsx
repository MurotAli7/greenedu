import Link from "next/link";
import { LeafIcon } from "@/components/Icons";

/** Auth sahifalarining chap panel — umumiy komponent */
export default function AuthHero() {
  return (
    <section className="auth-hero">
      <Link
        href="/"
        style={{ display: "flex", alignItems: "center", gap: 10, textDecoration: "none", color: "#fff", position: "absolute", top: 28, left: 56 }}
      >
        <span className="brand-mark"><LeafIcon /></span>
        <span className="brand-name">GreenEdu</span>
      </Link>
      <h2>Tabiat — eng yaxshi sinf xonasi</h2>
      <p>
        Ekologiya, biologiya va geografiyani AR/VR texnologiyalari orqali
        interaktiv o'rganing. Har dars uchun XP to'plang, nishonlar oching.
      </p>
    </section>
  );
}
