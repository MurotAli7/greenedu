
import Link from "next/link";

import { LeafIcon, ArrowRightIcon } from "@/components/Icons";
import JsonLd from "@/components/JsonLd";

import { buildMetadata } from "@/lib/seo/config";
import { courseListSchema, jsonLdGraph } from "@/lib/seo/schema";

export const metadata = buildMetadata({
  path: "/",
  description:
    "GreenEdu — maktab o'quvchilari uchun AR va VR texnologiyalari orqali ekologiya, biologiya va geografiyani interaktiv o'rgatadigan yashil ta'lim platformasi.",
});

const SUBJECTS = [
  {
    name: "Ekologiya",
    emoji: "🌱",
    color: "green",
    description:
      "Ekotizimlar, biologik xilma-xillik, chiqindilarni qayta ishlash va iqlim o'zgarishini o'rganing.",
    teaches: "Ekotizimlar va tabiatni muhofaza qilish",
  },
  {
    name: "Biologiya",
    emoji: "🦋",
    color: "yellow",
    description:
      "O'simliklar, hayvonlar va oziq zanjirlarini AR modellar orqali yaqindan kuzating.",
    teaches: "Tirik organizmlar va oziq zanjirlari",
  },
  {
    name: "Geografiya",
    emoji: "🌍",
    color: "blue",
    description:
      "Suv resurslari, tabiiy zonalar va dunyo landshaftlarini VR sayohatlar orqali kashf qiling.",
    teaches: "Tabiiy zonalar va suv resurslari",
  },
];

const STEPS = [
  {
    number: "01",
    emoji: "🎒",
    title: "Kursni tanlang",
    text: "O'zingizga qiziq bo'lgan ekologiya, biologiya yoki geografiya kursini tanlang.",
  },
  {
    number: "02",
    emoji: "🔎",
    title: "Kashf qiling",
    text: "AR va VR darslar orqali tabiatni oddiy darslikdan tashqarida o'rganing.",
  },
  {
    number: "03",
    emoji: "🏆",
    title: "Bilimingizni oshiring",
    text: "Darslarni yakunlang, XP to'plang va yangi ekologik bilimlarni oching.",
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
      {/* HEADER */}
      <header className="green-header">
        <div className="green-header-inner">
          <Link
            href="/"
            className="green-logo"
            aria-label="GreenEdu bosh sahifasi"
          >
            <span className="green-logo-icon">
              <LeafIcon aria-hidden="true" />
            </span>

            <span>
              <strong>Green</strong>Edu
            </span>
          </Link>

          <nav className="green-nav" aria-label="Asosiy menyu">
            <a href="#about">GreenEdu nima?</a>
            <a href="#subjects">Fanlar</a>
            <a href="#how">Qanday ishlaydi?</a>

            <Link href="/login" className="green-login">
              Kirish
            </Link>

            <Link href="/register" className="green-register">
              Ro'yxatdan o'tish
            </Link>
          </nav>
        </div>
      </header>

      <main className="green-page">
        {/* HERO */}
        <section className="green-hero" aria-labelledby="hero-heading">
          <div className="hero-sun" aria-hidden="true">
            ☀️
          </div>

          <div className="hero-cloud hero-cloud-one" aria-hidden="true">
            ☁️
          </div>

          <div className="hero-cloud hero-cloud-two" aria-hidden="true">
            ☁️
          </div>

          <div className="green-hero-inner">
            <div className="hero-content">
              <div className="hero-badge">
                <span>🌱</span>
                Yashil o'quv dasturi
              </div>

              <h1 id="hero-heading">
                Tabiatni o'rganing.
                <br />
                <span>Dunyoni o'zgartiring.</span>
              </h1>

              <p className="hero-description">
                <strong>GreenEdu</strong> — maktab o'quvchilari uchun ekologiya,
                biologiya va geografiyani AR va VR texnologiyalari orqali
                qiziqarli va interaktiv o'rgatadigan ta'lim platformasi.
              </p>

              <div className="hero-buttons">
                <Link href="/register" className="hero-primary-btn">
                  Sarguzashtni boshlash
                  <ArrowRightIcon aria-hidden="true" />
                </Link>

                <Link href="/login" className="hero-secondary-btn">
                  Kirish
                </Link>
              </div>

              <div className="hero-trust">
                <div className="hero-trust-item">
                  <span>🌍</span>
                  <span>Ekologik ta'lim</span>
                </div>

                <div className="hero-trust-item">
                  <span>🥽</span>
                  <span>AR / VR darslar</span>
                </div>

                <div className="hero-trust-item">
                  <span>🏆</span>
                  <span>XP va nishonlar</span>
                </div>
              </div>
            </div>

            <div className="hero-world-wrap">
              <div className="hero-world">
                <WorldIllustration />

                <div className="world-label world-label-tree">
                  <span>🌳</span>
                  O'rmon
                </div>

                <div className="world-label world-label-school">
                  <span>🏫</span>
                  Maktab
                </div>

                <div className="world-label world-label-water">
                  <span>💧</span>
                  Toza suv
                </div>

                <div className="world-character character-one">
                  🧒
                </div>

                <div className="world-character character-two">
                  👧
                </div>
              </div>
            </div>
          </div>

          <div className="hero-ground" aria-hidden="true">
            <div className="mountain mountain-back" />
            <div className="mountain mountain-front" />
            <div className="ground-grass" />
          </div>
        </section>

        {/* ABOUT */}
        <section
          id="about"
          className="green-section about-section"
          aria-labelledby="about-heading"
        >
          <div className="section-container">
            <div className="section-heading centered">
              <div className="section-kicker">
                <span>🌿</span>
                GreenEdu haqida
              </div>

              <h2 id="about-heading">
                Darslikni oching emas,
                <br />
                <span>dunyoni oching.</span>
              </h2>

              <p>
                GreenEdu o'quvchini shunchaki ma'lumot o'qiydigan emas,
                tabiatni kuzatadigan, tajriba qiladigan va kashf etadigan
                tadqiqotchiga aylantiradi.
              </p>
            </div>

            <div className="about-cards">
              <article className="about-card about-card-green">
                <div className="about-icon">🌱</div>

                <h3>Tabiatni his qiling</h3>

                <p>
                  Ekotizimlar, o'simliklar va hayvonot dunyosini interaktiv
                  muhitda o'rganing.
                </p>

                <span className="about-decoration">🍃</span>
              </article>

              <article className="about-card about-card-blue">
                <div className="about-icon">🥽</div>

                <h3>AR va VR bilan kashf qiling</h3>

                <p>
                  Oddiy mavzularni 3D modellar, AR obyektlar va virtual
                  sayohatlar orqali ko'ring.
                </p>

                <span className="about-decoration">☁️</span>
              </article>

              <article className="about-card about-card-yellow">
                <div className="about-icon">🏆</div>

                <h3>O'yin kabi o'rganing</h3>

                <p>
                  Darslarni bajaring, XP yig'ing, yangi bosqichlarni oching va
                  ekologik bilimlaringizni oshiring.
                </p>

                <span className="about-decoration">⭐</span>
              </article>
            </div>
          </div>
        </section>

        {/* SUBJECTS */}
        <section
          id="subjects"
          className="green-section subjects-section"
          aria-labelledby="subjects-heading"
        >
          <div className="section-container">
            <div className="section-heading">
              <div className="section-kicker">
                <span>🗺️</span>
                O'quv olamlari
              </div>

              <h2 id="subjects-heading">
                Qaysi dunyoni
                <br />
                <span>kashf qilamiz?</span>
              </h2>

              <p>
                GreenEdu ekologiya, biologiya va geografiya fanlarini yagona
                interaktiv ta'lim muhitida birlashtiradi.
              </p>
            </div>

            <div className="subject-world-grid">
              {SUBJECTS.map((subject) => (
                <article
                  key={subject.name}
                  className={`subject-world-card subject-${subject.color}`}
                >
                  <div className="subject-card-top">
                    <span className="subject-emoji">{subject.emoji}</span>

                    <span className="subject-arrow">↗</span>
                  </div>

                  <div>
                    <span className="subject-small">
                      {subject.teaches}
                    </span>

                    <h3>{subject.name}</h3>

                    <p>{subject.description}</p>
                  </div>

                  <div className="subject-card-bottom">
                    <span>AR / VR</span>
                    <span>→</span>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>

        {/* HOW IT WORKS */}
        <section
          id="how"
          className="green-section how-section"
          aria-labelledby="how-heading"
        >
          <div className="section-container">
            <div className="section-heading centered">
              <div className="section-kicker">
                <span>🚀</span>
                Boshlash juda oson
              </div>

              <h2 id="how-heading">
                Uch qadam.
                <br />
                <span>Katta sarguzasht.</span>
              </h2>
            </div>

            <ol className="adventure-steps">
              {STEPS.map((step, index) => (
                <li key={step.number} className="adventure-step">
                  <div className="step-number">{step.number}</div>

                  <div className="step-icon">{step.emoji}</div>

                  <div className="step-content">
                    <h3>{step.title}</h3>
                    <p>{step.text}</p>
                  </div>

                  {index !== STEPS.length - 1 && (
                    <div className="step-arrow" aria-hidden="true">
                      →
                    </div>
                  )}
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* ECO MESSAGE */}
        <section className="eco-message-section">
          <div className="eco-message">
            <div className="eco-message-cloud cloud-a">☁️</div>
            <div className="eco-message-cloud cloud-b">☁️</div>

            <div className="eco-message-content">
              <span className="eco-message-leaf">🌳</span>

              <div>
                <span className="eco-message-kicker">
                  Kelajak bugundan boshlanadi
                </span>

                <h2>
                  Tabiatni bilgan bola
                  <br />
                  <span>uni asraydi.</span>
                </h2>

                <p>
                  GreenEdu bilan ekologik bilimni qiziqarli tajribaga
                  aylantiring.
                </p>

                <Link href="/register" className="eco-message-button">
                  GreenEdu'ni boshlash
                  <ArrowRightIcon aria-hidden="true" />
                </Link>
              </div>
            </div>

            <div className="eco-message-animals" aria-hidden="true">
              🐝 🦋 🐿️ 🐦
            </div>
          </div>
        </section>

        {/* TEACHERS */}
        <section
          className="teacher-section"
          aria-labelledby="teacher-heading"
        >
          <div className="teacher-container">
            <div className="teacher-illustration" aria-hidden="true">
              <div className="teacher-sun">☀️</div>
              <div className="teacher-tree tree-left">🌳</div>
              <div className="teacher-tree tree-right">🌲</div>
              <div className="teacher-school">🏫</div>
              <div className="teacher-student">🧑‍🎓</div>
              <div className="teacher-bird">🐦</div>
            </div>

            <div className="teacher-content">
              <span className="section-kicker">
                <span>👩‍🏫</span>
                O'qituvchilar uchun
              </span>

              <h2 id="teacher-heading">
                Sinfingizni
                <br />
                <span>yashil laboratoriyaga</span>
                <br />
                aylantiring.
              </h2>

              <p>
                O'quvchilarni zamonaviy interaktiv darslar bilan jalb qiling.
                GreenEdu orqali ekologiya, biologiya va geografiya mavzularini
                yanada qiziqarli tushuntiring.
              </p>

              <Link href="/register" className="teacher-button">
                Hoziroq boshlash
                <ArrowRightIcon aria-hidden="true" />
              </Link>
            </div>
          </div>
        </section>
      </main>

      {/* FOOTER */}
      <footer className="green-footer">
        <div className="green-footer-inner">
          <Link href="/" className="green-logo footer-logo">
            <span className="green-logo-icon">
              <LeafIcon aria-hidden="true" />
            </span>

            <span>
              <strong>Green</strong>Edu
            </span>
          </Link>

          <p>
            © {new Date().getFullYear()} GreenEdu — yashil ta'lim platformasi
          </p>

          <nav aria-label="Qo'shimcha havolalar">
            <Link href="/terms">Foydalanish shartlari</Link>
          </nav>
        </div>
      </footer>

      <JsonLd data={schema} />
    </>
  );
}

/* =========================================================
   HERO WORLD ILLUSTRATION
   ========================================================= */

function WorldIllustration() {
  return (
    <svg
      className="world-svg"
      viewBox="0 0 620 500"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-labelledby="world-title world-desc"
    >
      <title id="world-title">
        GreenEdu ekologik ta'lim olami
      </title>

      <desc id="world-desc">
        O'rmonlar, daryo, maktab, quyosh energiyasi va tabiat bilan
        o'ralgan ekologik ta'lim muhiti.
      </desc>

      {/* Sky */}
      <rect width="620" height="500" fill="#dff2f3" />

      {/* Sun */}
      <circle
        cx="500"
        cy="85"
        r="48"
        fill="#ffd96a"
      />

      <g
        stroke="#ffd96a"
        strokeWidth="7"
        strokeLinecap="round"
      >
        <line x1="500" y1="18" x2="500" y2="0" />
        <line x1="500" y1="152" x2="500" y2="170" />
        <line x1="433" y1="85" x2="415" y2="85" />
        <line x1="567" y1="85" x2="585" y2="85" />
      </g>

      {/* Clouds */}
      <g fill="#fff">
        <circle cx="110" cy="82" r="28" />
        <circle cx="142" cy="75" r="38" />
        <circle cx="180" cy="86" r="25" />
        <rect
          x="90"
          y="83"
          width="115"
          height="35"
          rx="18"
        />
      </g>

      <g fill="#fff" opacity=".8">
        <circle cx="350" cy="55" r="20" />
        <circle cx="375" cy="50" r="29" />
        <circle cx="405" cy="60" r="18" />
        <rect
          x="335"
          y="60"
          width="90"
          height="28"
          rx="14"
        />
      </g>

      {/* Back mountains */}
      <path
        d="M0 270 L110 165 L190 245 L285 135 L390 255 L490 170 L620 285 V500 H0 Z"
        fill="#a9d2b0"
      />

      {/* Front mountains */}
      <path
        d="M0 320 L130 220 L225 305 L340 195 L455 305 L535 225 L620 315 V500 H0 Z"
        fill="#78b886"
      />

      {/* Ground */}
      <path
        d="M0 335 Q150 300 310 335 T620 325 V500 H0 Z"
        fill="#4e9b61"
      />

      {/* River */}
      <path
        d="M290 500
           C320 450 270 420 300 380
           C330 340 295 320 330 280
           C355 250 345 230 335 215"
        fill="none"
        stroke="#72c9df"
        strokeWidth="45"
        strokeLinecap="round"
      />

      <path
        d="M290 500
           C320 450 270 420 300 380
           C330 340 295 320 330 280"
        fill="none"
        stroke="#b9ecf5"
        strokeWidth="7"
        strokeLinecap="round"
        opacity=".7"
      />

      {/* Big tree left */}
      <g>
        <rect
          x="75"
          y="250"
          width="24"
          height="95"
          rx="8"
          fill="#765035"
        />

        <circle cx="85" cy="220" r="65" fill="#27794c" />
        <circle cx="42" cy="235" r="42" fill="#3f9b60" />
        <circle cx="132" cy="235" r="42" fill="#328a53" />
        <circle cx="86" cy="175" r="45" fill="#48a867" />
      </g>

      {/* Tree right */}
      <g>
        <rect
          x="525"
          y="275"
          width="19"
          height="75"
          rx="7"
          fill="#765035"
        />

        <circle cx="535" cy="245" r="55" fill="#27794c" />
        <circle cx="500" cy="260" r="34" fill="#48a867" />
        <circle cx="568" cy="260" r="35" fill="#328a53" />
      </g>

      {/* School */}
      <g>
        <rect
          x="190"
          y="270"
          width="135"
          height="100"
          rx="5"
          fill="#fff8e9"
        />

        <path
          d="M175 275 L257 210 L340 275 Z"
          fill="#df765b"
        />

        <rect
          x="237"
          y="315"
          width="40"
          height="55"
          rx="3"
          fill="#75a95d"
        />

        <rect
          x="205"
          y="292"
          width="25"
          height="25"
          rx="3"
          fill="#8fd1df"
        />

        <rect
          x="285"
          y="292"
          width="25"
          height="25"
          rx="3"
          fill="#8fd1df"
        />

        <circle
          cx="257"
          cy="247"
          r="12"
          fill="#ffd45f"
        />

        <text
          x="257"
          y="352"
          textAnchor="middle"
          fontSize="12"
          fontWeight="700"
          fill="#fff"
        >
          G
        </text>
      </g>

      {/* Solar panel */}
      <g transform="translate(420 315)">
        <rect
          x="0"
          y="0"
          width="80"
          height="48"
          rx="5"
          fill="#3b6687"
          transform="rotate(-12 40 24)"
        />

        <path
          d="M12 6 L68 42 M30 2 L76 32 M2 25 L70 12"
          stroke="#bde2f0"
          strokeWidth="2"
          opacity=".8"
        />

        <rect
          x="36"
          y="43"
          width="8"
          height="50"
          fill="#6d5943"
        />
      </g>

      {/* Flowers */}
      <g>
        <circle cx="145" cy="390" r="7" fill="#ffcf58" />
        <circle cx="140" cy="385" r="5" fill="#f27c8a" />
        <circle cx="150" cy="385" r="5" fill="#f27c8a" />

        <circle cx="470" cy="410" r="7" fill="#ffcf58" />
        <circle cx="465" cy="405" r="5" fill="#f28c9a" />
        <circle cx="475" cy="405" r="5" fill="#f28c9a" />
      </g>

      {/* Birds */}
      <path
        d="M245 100 q12 -12 24 0 q12 -12 24 0"
        stroke="#3e6857"
        strokeWidth="4"
        fill="none"
        strokeLinecap="round"
      />

      <path
        d="M410 135 q10 -10 20 0 q10 -10 20 0"
        stroke="#3e6857"
        strokeWidth="3"
        fill="none"
        strokeLinecap="round"
      />

      {/* Butterfly */}
      <g transform="translate(390 230)">
        <ellipse
          cx="-8"
          cy="0"
          rx="10"
          ry="15"
          fill="#f4a6bd"
        />
        <ellipse
          cx="8"
          cy="0"
          rx="10"
          ry="15"
          fill="#f4a6bd"
        />
        <rect
          x="-2"
          y="-8"
          width="4"
          height="18"
          rx="2"
          fill="#594b45"
        />
      </g>
    </svg>
  );
}
