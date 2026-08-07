/**
 * Sayt haqidagi markaziy ma'lumot — metadata, sitemap va Schema.org
 * shu yagona manbadan foydalanadi.
 *
 * NEXT_PUBLIC_SITE_URL ni Vercel'da o'rnating (masalan https://greenedu.uz).
 * O'rnatilmasa, Vercel bergan domen ishlatiladi.
 */

function resolveSiteUrl() {
  const explicit = process.env.NEXT_PUBLIC_SITE_URL;
  if (explicit) return explicit.replace(/\/$/, "");

  const vercel = process.env.NEXT_PUBLIC_VERCEL_URL || process.env.VERCEL_URL;
  if (vercel) return `https://${vercel.replace(/\/$/, "")}`;

  return "http://localhost:3000";
}

export const SITE_URL = resolveSiteUrl();

export const SITE = {
  name: "GreenEdu",
  shortName: "GreenEdu",
  locale: "uz_UZ",
  language: "uz",
  title: "GreenEdu — AR/VR orqali yashil ta'lim platformasi",
  description:
    "Maktab o'quvchilari uchun ekologiya, biologiya va geografiya mavzularini AR va VR " +
    "texnologiyalari orqali interaktiv o'rgatadigan yashil ta'lim platformasi.",
  keywords: [
    "GreenEdu",
    "yashil ta'lim",
    "AR ta'lim",
    "VR ta'lim",
    "ekologik ta'lim",
    "biologiya darslari",
    "interaktiv ta'lim",
    "maktab ta'limi",
    "O'zbekiston",
    "barqaror rivojlanish",
  ],
  authorName: "GreenEdu",
  ogImage: "/og-image.png",
  ogImageWidth: 1200,
  ogImageHeight: 630,
};

/** Kanonik havola yasaydi */
export function canonical(path = "/") {
  const clean = path.startsWith("/") ? path : `/${path}`;
  return `${SITE_URL}${clean === "/" ? "" : clean}`;
}

/**
 * Sahifa uchun to'liq metadata yasaydi:
 * canonical, Open Graph va Twitter kartalari bilan.
 */
export function buildMetadata({
  title,
  description = SITE.description,
  path = "/",
  keywords,
  noIndex = false,
  type = "website",
} = {}) {
  const url = canonical(path);
  const fullTitle = title ? `${title} | ${SITE.name}` : SITE.title;

  return {
    title: title || SITE.title,
    description,
    keywords: keywords || SITE.keywords,
    alternates: {
      canonical: url,
      languages: { "uz-UZ": url },
    },
    robots: noIndex
      ? { index: false, follow: false, nocache: true }
      : {
          index: true,
          follow: true,
          googleBot: {
            index: true,
            follow: true,
            "max-image-preview": "large",
            "max-snippet": -1,
            "max-video-preview": -1,
          },
        },
    openGraph: {
      type,
      url,
      siteName: SITE.name,
      locale: SITE.locale,
      title: fullTitle,
      description,
      images: [
        {
          url: SITE.ogImage,
          width: SITE.ogImageWidth,
          height: SITE.ogImageHeight,
          alt: SITE.title,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: fullTitle,
      description,
      images: [SITE.ogImage],
    },
  };
}
