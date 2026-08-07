import { Bricolage_Grotesque, Public_Sans } from "next/font/google";
import { SITE, SITE_URL, buildMetadata } from "@/lib/seo/config";
import { jsonLdGraph, organizationSchema, websiteSchema } from "@/lib/seo/schema";
import JsonLd from "@/components/JsonLd";
import "./globals.css";

const bricolage = Bricolage_Grotesque({
  variable: "--font-bricolage",
  subsets: ["latin"],
  display: "swap",
  preload: true,
});

const publicSans = Public_Sans({
  variable: "--font-public",
  subsets: ["latin"],
  display: "swap",
  preload: true,
});

export const metadata = {
  metadataBase: new URL(SITE_URL),
  ...buildMetadata({ path: "/" }),
  title: {
    default: SITE.title,
    template: `%s | ${SITE.name}`,
  },
  applicationName: SITE.name,
  authors: [{ name: SITE.authorName }],
  creator: SITE.authorName,
  publisher: SITE.authorName,
  category: "education",
  formatDetection: { telephone: false, address: false, email: false },
  icons: {
    icon: "/icon.png",
    apple: "/icon.png",
  },
};

export const viewport = {
  themeColor: "#1e5637",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }) {
  return (
    <html
      lang={SITE.language}
      className={`${bricolage.variable} ${publicSans.variable}`}
      // Brauzer kengaytmalari <html>/<body> atributlarini o'zgartirgani uchun
      // (masalan data-qb-installed) hydration ogohlantirishi chiqmasin
      suppressHydrationWarning
    >
      <body suppressHydrationWarning>
        {/* Klaviatura bilan yuruvchilar uchun: menyuni o'tkazib yuborish */}
        <a href="#main-content" className="skip-link">
          Asosiy mazmunga o'tish
        </a>
        {children}
        <JsonLd data={jsonLdGraph(organizationSchema(), websiteSchema())} />
      </body>
    </html>
  );
}
