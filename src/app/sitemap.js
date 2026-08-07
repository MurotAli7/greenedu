import { SITE_URL } from "@/lib/seo/config";

/**
 * Sitemap — faqat ochiq (indekslanadigan) sahifalar.
 * Shaxsiy bo'limlar (/user, /admin) kiritilmaydi.
 */
export default function sitemap() {
  const lastModified = new Date();

  const routes = [
    { path: "/", priority: 1.0, changeFrequency: "weekly" },
    { path: "/login", priority: 0.5, changeFrequency: "yearly" },
    { path: "/register", priority: 0.8, changeFrequency: "monthly" },
    { path: "/terms", priority: 0.3, changeFrequency: "yearly" },
  ];

  return routes.map((route) => ({
    url: `${SITE_URL}${route.path === "/" ? "" : route.path}`,
    lastModified,
    changeFrequency: route.changeFrequency,
    priority: route.priority,
  }));
}
