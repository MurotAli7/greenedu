import { createServerClient } from "@supabase/ssr";
import { NextResponse } from "next/server";

/**
 * Marshrut himoyasi.
 *
 * Next.js 16: "middleware" konventsiyasi "proxy"ga o'zgargan —
 * fayl nomi src/proxy.js, funksiya nomi `proxy` bo'lishi shart,
 * aks holda umuman ishga tushmaydi (jimgina).
 */
export async function proxy(request) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, {
              ...options,
              // Xavfsizlik: cookie faqat HTTPS orqali va boshqa saytdan
              // yuborilmasin (CSRF himoyasi)
              httpOnly: options?.httpOnly ?? true,
              sameSite: options?.sameSite ?? "lax",
              secure: process.env.NODE_ENV === "production",
            })
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;
  const isUserRoute = pathname.startsWith("/user");
  const isAdminRoute = pathname.startsWith("/admin") && !pathname.startsWith("/admin-login");

  // Kirmagan foydalanuvchi himoyalangan sahifaga kirmoqchi bo'lsa
  if (!user && (isUserRoute || isAdminRoute)) {
    const loginUrl = new URL(isAdminRoute ? "/admin-login" : "/login", request.url);
    loginUrl.searchParams.set("from", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // /admin/* faqat role === 'admin' uchun
  if (user && isAdminRoute) {
    const { data: profile, error } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    // Xato bo'lsa ham kiritmaymiz (fail-closed)
    if (error || profile?.role !== "admin") {
      return NextResponse.redirect(new URL("/user", request.url));
    }
  }

  // Shaxsiy sahifalar keshlanmasin va indekslanmasin
  if (isUserRoute || isAdminRoute) {
    response.headers.set("Cache-Control", "no-store, must-revalidate");
    response.headers.set("X-Robots-Tag", "noindex, nofollow");
  }

  return response;
}

export const config = {
  matcher: ["/user/:path*", "/admin/:path*"],
};
