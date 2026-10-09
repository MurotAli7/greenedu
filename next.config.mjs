/** @type {import('next').NextConfig} */

const securityHeaders = [
  {
    key: "X-Content-Type-Options",
    value: "nosniff",
  },

  {
    key: "X-Frame-Options",
    value: "DENY",
  },

  {
    key: "Referrer-Policy",
    value: "strict-origin-when-cross-origin",
  },

  {
    key: "Permissions-Policy",
    value:
      "camera=(self), microphone=(self), fullscreen=*, xr-spatial-tracking=*",
  },

  {
    key: "Strict-Transport-Security",
    value:
      "max-age=63072000; includeSubDomains; preload",
  },

  {
    key: "X-DNS-Prefetch-Control",
    value: "on",
  },

  {
    key: "Content-Security-Policy",
    value: [
      "default-src 'self'",

      "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://unpkg.com",

      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",

      "font-src 'self' https://fonts.gstatic.com data:",

      "img-src 'self' data: blob: https:",

      "media-src 'self' blob: https:",

      "connect-src 'self' https://*.supabase.co https://unpkg.com",

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
  reactStrictMode: false,

  poweredByHeader: false,

  compress: true,

  async headers() {
    return [
      {
        source: "/:path*",

        headers: securityHeaders,
      },

      {
        source: "/api/:path*",

        headers: [
          {
            key: "Cache-Control",
            value: "no-store, max-age=0",
          },
        ],
      },
    ];
  },
};

export default nextConfig;