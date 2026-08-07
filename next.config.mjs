/** @type {import('next').NextConfig} */

/**
 * Xavfsizlik sarlavhalari.
 *
 * CSP eslatmasi: platforma AR/VR kontentni <iframe> orqali ko'rsatadi
 * (Sketchfab, Assemblr, CoSpaces) va model-viewer skriptini unpkg'dan
 * yuklaydi — shuning uchun frame-src va script-src ochiq qoldirilgan,
 * lekin frame-ancestors 'none' saytni boshqa saytga joylashtirishni
 * (clickjacking) taqiqlaydi.
 */
const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "X-DNS-Prefetch-Control", value: "on" },
  {
    key: "Permissions-Policy",
    // xr-spatial-tracking VR uchun kerak, camera AR uchun kerak
    value: "geolocation=(), microphone=(), payment=(), camera=(self), xr-spatial-tracking=(self)",
  },
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
  {
    key: "Content-Security-Policy",
    value: [
      "default-src 'self'",
      // Next.js inline skriptlari va model-viewer (unpkg) uchun
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://unpkg.com",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "font-src 'self' https://fonts.gstatic.com data:",
      "img-src 'self' data: blob: https:",
      "media-src 'self' blob: https:",
      // Supabase (API + Storage) va model fayllari
      "connect-src 'self' https://*.supabase.co https://unpkg.com",
      // AR/VR embedlar va yuklangan HTML testlar
      "frame-src 'self' https:",
      "worker-src 'self' blob:",
      "object-src 'none'",
      "base-uri 'self'",
      "form-action 'self'",
      "frame-ancestors 'none'",
      "upgrade-insecure-requests",
    ].join("; "),
  },
];

const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  compress: true,

  async headers() {
    return [
      {
        source: "/:path*",
        headers: securityHeaders,
      },
      {
        // API javoblari keshlanmasin
        source: "/api/:path*",
        headers: [{ key: "Cache-Control", value: "no-store, max-age=0" }],
      },
    ];
  },
};

export default nextConfig;
