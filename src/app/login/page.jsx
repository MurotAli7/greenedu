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
    <div className="greenedu-login">
      {/* =========================
          REALISTIC VISUAL SIDE
      ========================== */}
      <section className="greenedu-login-visual">
        <div className="greenedu-login-photo" />

        <div className="greenedu-login-overlay" />

        <div className="greenedu-login-brand">
          <Link href="/" className="greenedu-brand-link">
            <span className="greenedu-brand-mark">
              <svg
                viewBox="0 0 40 40"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                aria-hidden="true"
              >
                <path
                  d="M20 34C20 34 7 27.8 7 17.8C7 11.9 11.4 7 17 7C19.8 7 22.3 8.2 24 10.2C25.7 8.2 28.2 7 31 7C36.6 7 41 11.9 41 17.8C41 27.8 28 34 20 34Z"
                  fill="currentColor"
                  transform="translate(-4 0)"
                />
                <path
                  d="M20 12C17.5 16.5 17 22.5 20 30"
                  stroke="white"
                  strokeWidth="2.3"
                  strokeLinecap="round"
                />
              </svg>
            </span>

            <span>GreenEdu</span>
          </Link>
        </div>

        <div className="greenedu-login-content">
          <span className="greenedu-eyebrow">
            Yashil ta'lim • Yangi avlod
          </span>

          <h2>
            Tabiatni o'rganing.
            <br />
            Kelajakni yarating.
          </h2>

          <p>
            GreenEdu orqali ekologiya, tabiat va atrof-muhit
            haqidagi bilimlarni zamonaviy va interaktiv usulda
            o'rganing.
          </p>

          <div className="greenedu-login-features">
            <div className="greenedu-feature">
              <span className="feature-icon">✓</span>
              <span>Interaktiv darslar</span>
            </div>

            <div className="greenedu-feature">
              <span className="feature-icon">✓</span>
              <span>AR / VR tajribalar</span>
            </div>

            <div className="greenedu-feature">
              <span className="feature-icon">✓</span>
              <span>Amaliy ekologik bilimlar</span>
            </div>
          </div>
        </div>

        <div className="greenedu-login-bottom">
          <span>© {new Date().getFullYear()} GreenEdu</span>
          <span className="greenedu-bottom-dot" />
          <span>Ekologik ta'lim platformasi</span>
        </div>
      </section>

      {/* =========================
          LOGIN SIDE
      ========================== */}
      <main
        id="main-content"
        className="greenedu-login-form-side"
      >
        <div className="greenedu-mobile-brand">
          <Link href="/" className="greenedu-mobile-logo">
            <span className="greenedu-mobile-mark">
              <svg
                viewBox="0 0 40 40"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                aria-hidden="true"
              >
                <path
                  d="M20 34C20 34 7 27.8 7 17.8C7 11.9 11.4 7 17 7C19.8 7 22.3 8.2 24 10.2C25.7 8.2 28.2 7 31 7C36.6 7 41 11.9 41 17.8C41 27.8 28 34 20 34Z"
                  fill="currentColor"
                  transform="translate(-4 0)"
                />
                <path
                  d="M20 12C17.5 16.5 17 22.5 20 30"
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
          <div className="greenedu-login-heading">
            <span className="greenedu-form-label">
              GreenEdu platformasi
            </span>

            <h1>Xush kelibsiz</h1>

            <p>
              Hisobingizga kiring va o'qishni davom ettiring.
            </p>
          </div>

          <form
            onSubmit={handleSubmit}
            className="greenedu-auth-form"
            noValidate
          >
            {/* EMAIL */}
            <div className="greenedu-field">
              <label htmlFor="email">Email</label>

              <div className="greenedu-input-wrapper">
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  aria-hidden="true"
                >
                  <path
                    d="M4 5.5h16v13H4v-13Z"
                    stroke="currentColor"
                    strokeWidth="1.7"
                    strokeLinejoin="round"
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

            {error && (
              <div
                className="greenedu-form-error"
                role="alert"
              >
                <span>!</span>
                <p>{error}</p>
              </div>
            )}

            <div className="greenedu-forgot-row">
              <Link href="/forgot-password">
                Parolni unutdingizmi?
              </Link>
            </div>

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

          <div className="greenedu-register">
            <span>Hali hisobingiz yo'qmi?</span>

            <Link href="/register">
              Ro'yxatdan o'tish
            </Link>
          </div>

          <div className="greenedu-secure">
            <span className="greenedu-secure-icon">
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
              </svg>
            </span>

            <span>
              Hisob ma'lumotlaringiz xavfsiz saqlanadi
            </span>
          </div>
        </div>

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