"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import PasswordInput from "@/components/PasswordInput";
import { safePath } from "@/lib/api/validate";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const from = safePath(searchParams.get("from"), "");

  const [form, setForm] = useState({
    email: "",
    password: "",
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleChange = (e) => {
    setForm((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!form.email || !form.password) {
      setError("Email va parolni kiriting.");
      return;
    }

    setLoading(true);

    try {
      const supabase = createClient();

      const { data, error: signInError } =
        await supabase.auth.signInWithPassword({
          email: form.email,
          password: form.password,
        });

      if (signInError) {
        const msg = signInError.message.toLowerCase();

        if (msg.includes("invalid login credentials")) {
          setError("Email yoki parol noto'g'ri.");
        } else if (msg.includes("email not confirmed")) {
          setError(
            "Avval emailingizga yuborilgan havola orqali hisobni tasdiqlang."
          );
        } else {
          setError(signInError.message);
        }

        return;
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", data.user.id)
        .single();

      router.push(
        from || (profile?.role === "admin" ? "/admin" : "/user")
      );

      router.refresh();
    } catch {
      setError(
        "Kirishda xatolik yuz berdi. Qaytadan urinib ko'ring."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="greenedu-login-page">
      {/* ==================================================
          LEFT / IMAGE SIDE
      ================================================== */}
      <section className="greenedu-login-visual">
        <div className="greenedu-login-photo" />

        <div className="greenedu-login-overlay" />

        {/* LOGO */}
        <div className="greenedu-login-brand">
          <Link href="/" className="greenedu-brand">
            <span className="greenedu-brand-icon">
              <svg
                viewBox="0 0 42 42"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                aria-hidden="true"
              >
                <path
                  d="M21 36C21 36 7 29.5 7 18.8C7 12.2 11.8 7 17.7 7C21.1 7 24 8.9 25.5 11.7C27.1 8.9 29.9 7 33.3 7C39.2 7 44 12.2 44 18.8C44 29.5 30 36 21 36Z"
                  fill="currentColor"
                  transform="translate(-4 0)"
                />

                <path
                  d="M20 12C17.7 16.8 17.8 23.5 20.5 30"
                  stroke="white"
                  strokeWidth="2.3"
                  strokeLinecap="round"
                />
              </svg>
            </span>

            <span className="greenedu-brand-text">
              GreenEdu
            </span>
          </Link>
        </div>

        {/* MAIN TEXT */}
        <div className="greenedu-visual-content">
          <div className="greenedu-visual-badge">
            <span className="greenedu-badge-dot" />
            Yashil ta'lim • Yangi avlod
          </div>

          <h2>
            Tabiatni
            <br />
            <span>o'rganing.</span>
            <br />
            Kelajakni yarating.
          </h2>

          <p>
            GreenEdu — ekologiya va tabiatni zamonaviy,
            interaktiv hamda qiziqarli usulda o'rganish
            uchun yaratilgan ta'lim platformasi.
          </p>

          <div className="greenedu-visual-features">
            <div className="greenedu-visual-feature">
              <span className="feature-check">✓</span>
              <span>Interaktiv darslar</span>
            </div>

            <div className="greenedu-visual-feature">
              <span className="feature-check">✓</span>
              <span>AR / VR tajribalar</span>
            </div>

            <div className="greenedu-visual-feature">
              <span className="feature-check">✓</span>
              <span>Ekologik bilimlar</span>
            </div>
          </div>
        </div>

        {/* BOTTOM */}
        <div className="greenedu-visual-bottom">
          <span>
            © {new Date().getFullYear()} GreenEdu
          </span>

          <span className="visual-divider" />

          <span>
            Ekologik ta'lim platformasi
          </span>
        </div>
      </section>

      {/* ==================================================
          RIGHT / FORM SIDE
      ================================================== */}
      <main
        id="main-content"
        className="greenedu-login-form-side"
      >
        {/* MOBILE LOGO */}
        <div className="greenedu-mobile-brand">
          <Link href="/" className="greenedu-mobile-logo">
            <span className="greenedu-mobile-icon">
              <svg
                viewBox="0 0 42 42"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                aria-hidden="true"
              >
                <path
                  d="M21 36C21 36 7 29.5 7 18.8C7 12.2 11.8 7 17.7 7C21.1 7 24 8.9 25.5 11.7C27.1 8.9 29.9 7 33.3 7C39.2 7 44 12.2 44 18.8C44 29.5 30 36 21 36Z"
                  fill="currentColor"
                  transform="translate(-4 0)"
                />

                <path
                  d="M20 12C17.7 16.8 17.8 23.5 20.5 30"
                  stroke="white"
                  strokeWidth="2.3"
                  strokeLinecap="round"
                />
              </svg>
            </span>

            <span>GreenEdu</span>
          </Link>
        </div>

        <div className="greenedu-login-card">
          {/* HEADING */}
          <div className="greenedu-login-heading">
            <span className="greenedu-form-eyebrow">
              GreenEdu platformasi
            </span>

            <h1>Xush kelibsiz</h1>

            <p>
              Hisobingizga kiring va o'qishni davom ettiring.
            </p>
          </div>

          {/* FORM */}
          <form
            onSubmit={handleSubmit}
            className="greenedu-auth-form"
            noValidate
          >
            {/* EMAIL */}
            <div className="greenedu-field">
              <label htmlFor="email">
                Email
              </label>

              <div className="greenedu-input-box">
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  aria-hidden="true"
                >
                  <rect
                    x="3.5"
                    y="5"
                    width="17"
                    height="14"
                    rx="2"
                    stroke="currentColor"
                    strokeWidth="1.7"
                  />

                  <path
                    d="m5 7 7 5 7-5"
                    stroke="currentColor"
                    strokeWidth="1.7"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>

                <input
                  id="email"
                  name="email"
                  type="email"
                  placeholder="siz@misol.uz"
                  value={form.email}
                  onChange={handleChange}
                  autoComplete="username"
                  autoFocus
                  inputMode="email"
                  spellCheck="false"
                />
              </div>
            </div>

            {/* PASSWORD */}
            <div className="greenedu-password-field">
              <PasswordInput
                label="Parol"
                name="password"
                value={form.password}
                onChange={handleChange}
                autoComplete="current-password"
              />
            </div>

            {/* ERROR */}
            {error && (
              <div
                className="greenedu-form-error"
                role="alert"
              >
                <span className="error-icon">
                  !
                </span>

                <p>{error}</p>
              </div>
            )}

            {/* FORGOT */}
            <div className="greenedu-forgot">
              <Link href="/forgot-password">
                Parolni unutdingizmi?
              </Link>
            </div>

            {/* BUTTON */}
            <button
              type="submit"
              className="greenedu-login-button"
              disabled={loading}
            >
              {loading ? (
                <>
                  <span className="greenedu-spinner" />
                  Tekshirilmoqda...
                </>
              ) : (
                <>
                  <span>Kirish</span>

                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    aria-hidden="true"
                  >
                    <path
                      d="M5 12h13"
                      stroke="currentColor"
                      strokeWidth="1.8"
                      strokeLinecap="round"
                    />

                    <path
                      d="m13 6 6 6-6 6"
                      stroke="currentColor"
                      strokeWidth="1.8"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </>
              )}
            </button>
          </form>

          {/* REGISTER */}
          <div className="greenedu-register">
            <span>
              Hali hisobingiz yo'qmi?
            </span>

            <Link href="/register">
              Ro'yxatdan o'tish
            </Link>
          </div>

          {/* SECURITY */}
          <div className="greenedu-security">
            <span className="security-icon">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                aria-hidden="true"
              >
                <rect
                  x="5"
                  y="10"
                  width="14"
                  height="10"
                  rx="2"
                  stroke="currentColor"
                  strokeWidth="1.6"
                />

                <path
                  d="M8 10V7.5a4 4 0 0 1 8 0V10"
                  stroke="currentColor"
                  strokeWidth="1.6"
                  strokeLinecap="round"
                />

                <circle
                  cx="12"
                  cy="15"
                  r="1"
                  fill="currentColor"
                />
              </svg>
            </span>

            <span>
              Ma'lumotlaringiz xavfsiz saqlanadi
            </span>
          </div>
        </div>

        {/* MOBILE FOOTER */}
        <div className="greenedu-mobile-footer">
          GreenEdu · Ekologik ta'lim platformasi
        </div>
      </main>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}