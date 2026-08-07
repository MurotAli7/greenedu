import { SITE } from "@/lib/seo/config";

/** PWA manifesti — telefonga o'rnatish va SEO uchun */
export default function manifest() {
  return {
    name: SITE.title,
    short_name: SITE.shortName,
    description: SITE.description,
    start_url: "/",
    display: "standalone",
    background_color: "#f6f8f3",
    theme_color: "#1e5637",
    lang: SITE.language,
    icons: [
      { src: "/icon.png", sizes: "192x192", type: "image/png" },
      { src: "/icon.png", sizes: "512x512", type: "image/png" },
    ],
  };
}
