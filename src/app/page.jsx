import Link from "next/link";
import { LeafIcon, ArrowRightIcon } from "@/components/Icons";
import JsonLd from "@/components/JsonLd";
import { buildMetadata } from "@/lib/seo/config";
import { courseListSchema, jsonLdGraph } from "@/lib/seo/schema";

export const metadata = buildMetadata({
  path: "/",
  description:
    "GreenEdu — maktab o'quvchilari uchun AR va VR texnologiyalari orqali ekologiya, " +
    "biologiya va geografiyani interaktiv o'rgatadigan yashil ta'lim platformasi.",
});

const SUBJECTS = [
  {
    name: "Ekologiya",
    description:
      "Ekotizimlar, biologik xilma-xillik, chiqindilarni qayta ishlash va iqlim o'zgarishi mavzulari.",
    teaches: "Ekotizimlar va tabiatni muhofaza qilish",
    Icon: LeafIcon,
    iconClass: "subj-ic-green",
  },
  {
    name: "Biologiya",
    description:
      "O'simlik va hayvonot dunyosi, oziq zanjirlari — AR modellar bilan yaqindan kuzatiladi.",
    teaches: "Tirik organizmlar va oziq zanjirlari",
    Icon: MicroscopeIcon,
    iconClass: "subj-ic-sun",
  },
  {
    name: "Geografiya",
    description:
      "Suv resurslari, tabiiy zonalar va landshaftlar — VR sayohatlar orqali o'rganiladi.",
    teaches: "Tabiiy zonalar va suv resurslari",
    Icon: GlobeIcon,
    iconClass: "subj-ic-sky",
  },
];

const STEPS = [
  {
    label: "1-qadam",
    title: "Kursga yoziling",
    text: "Ekologiya, biologiya yoki geografiya yo'nalishidagi kursni tanlab, bir tugma bilan o'qishni boshlaysiz.",
  },
  {
    label: "2-qadam",
    title: "AR/VR darsni o'ting",
    text: "Ekotizimni AR orqali sinf xonasida jonlantirasiz yoki VR muhitida suv aylanishi bo'ylab sayohat qilasiz.",
  },
  {
    label: "3-qadam",
    title: "XP to'plang, nishon oling",
    text: "Har tugatilgan dars XP beradi: daraja oshadi, izchillik uchun nishonlar ochiladi.",
  },
];

export default function LandingPage() {
  const schema = jsonLdGraph(
    courseListSchema(
      SUBJECTS.map((subject) => ({
        name: `${subject.name} — AR/VR darslari`,
        description: subject.description,
        teaches: subject.teaches,
        path: "/register",
      }))
    )
  );

  return (
    <>
      <header className="land-header">
        <Link href="/" className="land-brand" aria-label="GreenEdu bosh sahifasi">
          <span className="brand-mark brand-mark-leaf">
            <LeafIcon aria-hidden="true" />
          </span>
          <span className="brand-name">GreenEdu</span>
        </Link>
        <nav aria-label="Asosiy menyu">
          <Link href="/login" className="btn btn-ghost btn-sm">
            Kirish
          </Link>
          <Link href="/register" className="btn btn-primary btn-sm">
            Ro'yxatdan o'tish
          </Link>
        </nav>
      </header>

      <main id="main-content">
        {/* ---------- HERO ---------- */}
        <section className="land-hero" aria-labelledby="hero-heading">
          <div>
            <p className="section-eyebrow">Yashil o'quv dasturi · AR/VR</p>
            <h1 id="hero-heading">
              Tabiatni <em>skanerlang</em>,<br />
              ekologiyani his qilib o'rganing
            </h1>
            <p className="lead">
              GreenEdu — maktab o'quvchilari uchun ekologiya, biologiya va geografiya
              mavzularini AR va VR texnologiyalari orqali interaktiv o'rgatadigan
              platforma. Har bir dars — kichik tadqiqot.
            </p>
            <div className="hero-actions">
              <Link href="/register" className="btn btn-primary btn-lg">
                Bepul boshlash <ArrowRightIcon aria-hidden="true" />
              </Link>
              <Link href="/login" className="btn btn-ghost btn-lg">
                Hisobim bor
              </Link>
            </div>
          </div>

          <div>
            <figure className="hero-figure">
              <div className="viewfinder hero-scene card">
                <span className="vf-b" aria-hidden="true" />
                <EcosystemScene />
              </div>
              <figcaption className="hero-caption">
                <span className="scan-dot" aria-hidden="true" />
                AR modul: o'rmon ekotizimi skanerlanmoqda
              </figcaption>
            </figure>
          </div>
        </section>

        {/* ---------- QANDAY ISHLAYDI ---------- */}
        <section className="land-section" aria-labelledby="how-heading">
          <p className="section-eyebrow">Qanday ishlaydi</p>
          <h2 id="how-heading">Uch qadamda interaktiv darsga</h2>
          <p className="sec-lead">
            O'quvchi uchun yo'l oddiy va aniq — ro'yxatdan o'tishdan bilimni
            mustahkamlashgacha.
          </p>
          <ol className="steps">
            {STEPS.map((step) => (
              <li key={step.label} className="step card">
                <p className="n">{step.label.toUpperCase()}</p>
                <h3>{step.title}</h3>
                <p>{step.text}</p>
              </li>
            ))}
          </ol>
        </section>

        {/* ---------- FANLAR ---------- */}
        <section className="land-section" aria-labelledby="subjects-heading">
          <p className="section-eyebrow">Fanlar</p>
          <h2 id="subjects-heading">Yashil ta'lim uch fan kesishmasida</h2>
          <p className="sec-lead">
            Kontentlar maktab darsliklari mavzulariga mos ravishda tuziladi va
            Barqaror rivojlanish maqsadlari (SDG) bilan bog'lanadi.
          </p>
          <ul className="subj-grid">
            {SUBJECTS.map(({ name, description, Icon, iconClass }) => (
              <li key={name} className="subj card">
                <span className={`subj-ic ${iconClass}`}>
                  <Icon aria-hidden="true" />
                </span>
                <h3>{name}</h3>
                <p>{description}</p>
              </li>
            ))}
          </ul>
        </section>

        {/* ---------- CTA ---------- */}
        <section className="land-section" aria-labelledby="cta-heading">
          <div className="land-cta">
            <div>
              <h2 id="cta-heading">Sinfingizni yashil laboratoriyaga aylantiring</h2>
              <p>
                O'qituvchilar uchun: kontentlarni boshqarish, o'quvchilar faolligini
                kuzatish va pedagogik tajriba uchun statistika — bitta panelda.
              </p>
            </div>
            <Link href="/register" className="btn btn-ondark btn-lg">
              Hoziroq boshlash <ArrowRightIcon aria-hidden="true" />
            </Link>
          </div>
        </section>
      </main>

      <footer className="land-footer">
        <p>© {new Date().getFullYear()} GreenEdu — yashil ta'lim platformasi</p>
        <nav aria-label="Qo'shimcha havolalar">
          <Link href="/terms">Foydalanish shartlari</Link>
        </nav>
      </footer>

      <JsonLd data={schema} />
    </>
  );
}

/* ---------------- Illyustratsiya va ikonlar ---------------- */

/** O'rmon ekotizimi sahnasi — hero uchun */
function EcosystemScene() {
  return (
    <svg
      viewBox="0 0 520 340"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-labelledby="scene-title scene-desc"
    >
      <title id="scene-title">O'rmon ekotizimi illyustratsiyasi</title>
      <desc id="scene-desc">
        Tepaliklar, daraxtlar va daryodan iborat o'rmon manzarasi. Qayrag'och daraxti
        AR yorlig'i bilan belgilangan: produtsent, kislorod ishlab chiqaradi.
      </desc>

      <rect width="520" height="340" fill="#eaf3ec" />
      <rect width="520" height="200" fill="#dcebf2" />
      <circle cx="430" cy="60" r="30" fill="#f2c66b" />

      <path d="M0 200 Q130 130 260 190 T520 180 V340 H0 Z" fill="#bcd8bd" />
      <path d="M0 230 Q160 170 320 225 T520 215 V340 H0 Z" fill="#8fbf93" />
      <path
        d="M210 340 C230 290 190 260 240 220 C270 195 260 180 250 170"
        stroke="#7fb2d0" strokeWidth="26" fill="none" strokeLinecap="round" opacity="0.85"
      />
      <path d="M0 265 Q140 225 300 262 T520 255 V340 H0 Z" fill="#5f9c66" />

      <g>
        <rect x="86" y="212" width="10" height="30" rx="3" fill="#6b4f35" />
        <circle cx="91" cy="196" r="30" fill="#2e7d4f" />
        <circle cx="74" cy="208" r="20" fill="#3fa16a" />
      </g>
      <g>
        <rect x="356" y="196" width="9" height="28" rx="3" fill="#6b4f35" />
        <circle cx="360" cy="182" r="26" fill="#1e5637" />
        <circle cx="378" cy="192" r="17" fill="#2e7d4f" />
      </g>
      <g>
        <rect x="448" y="228" width="8" height="24" rx="3" fill="#6b4f35" />
        <circle cx="452" cy="216" r="21" fill="#3fa16a" />
      </g>

      <path d="M150 92 q9 -9 18 0 q9 -9 18 0" stroke="#41604f" strokeWidth="3" fill="none" strokeLinecap="round" />
      <path d="M205 118 q7 -7 14 0 q7 -7 14 0" stroke="#41604f" strokeWidth="2.5" fill="none" strokeLinecap="round" />

      <g transform="translate(300 84)">
        <rect x="0" y="0" width="158" height="52" rx="10" fill="#ffffff" opacity="0.95" />
        <circle cx="20" cy="26" r="8" fill="#2e7d4f" />
        <text x="38" y="22" fontFamily="sans-serif" fontSize="11.5" fontWeight="700" fill="#1c2a21">
          Qayrag&apos;och
        </text>
        <text x="38" y="38" fontFamily="sans-serif" fontSize="10" fill="#46594e">
          Produtsent · O2 ishlab chiqaradi
        </text>
      </g>
      <line x1="300" y1="122" x2="252" y2="168" stroke="#2e7d4f" strokeWidth="1.6" strokeDasharray="4 4" />

      <rect x="0" y="0" width="520" height="3" fill="#3fa16a" opacity="0.7">
        <animate attributeName="y" values="0;337;0" dur="7s" repeatCount="indefinite" />
      </rect>
    </svg>
  );
}

function MicroscopeIcon(props) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" {...props}>
      <path d="M9 3h4l-1 2h-2zM10 5v6M8 11h6M12 11c4 1 6 3.5 6 6H4c0-1 .6-2 2-2" />
      <path d="M4 21h16" />
    </svg>
  );
}

function GlobeIcon(props) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" {...props}>
      <circle cx="12" cy="12" r="9" />
      <path d="M3 12h18M12 3c3 3.5 3 14.5 0 18M12 3c-3 3.5-3 14.5 0 18" />
    </svg>
  );
}
