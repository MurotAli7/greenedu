import { SITE_URL } from "@/lib/seo/config";

/**
 * robots.txt — shaxsiy bo'limlar va API indekslanmaydi.
 */
export default function robots() {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/admin/", "/admin-login", "/user/", "/api/", "/forgot-password"],
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
