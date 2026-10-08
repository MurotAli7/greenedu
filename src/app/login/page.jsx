"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import PasswordInput from "@/components/PasswordInput";
import { safePath } from "@/lib/api/validate";

function LeafIcon({ className = "" }) {
  return (
    <svg
      className={className}
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <path
        d="M26.8 4.8C17.1 5.2 9.1 8.1 6.1 14.2c-2.4 4.9-.2 9.4 4.2 10.5 4.6 1.2 9.2-1.5 11.7-5.9 2.4-4.2 3.3-9.1 4.8-14Z"
        fill="currentColor"
      />
      <path
        d="M5.5 27.2C9.3 20.9 14.7 15.7 23.7 10"
        stroke="white"
        strokeWidth="1.8"
        strokeLinecap="round"
        opacity=".85"
      />
    </svg>
  );
}

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
    <div className="green-auth-page">

      {/* ================= LEFT GREEN SIDE ================= */}
      <aside className="green-auth-hero">

        <div className="green-auth-top">
          <Link
            href="/"
            className="green-auth-logo"
            aria-label="GreenEdu bosh sahifasi"
          >
            <span className="green-auth-logo-icon">
              <LeafIcon />
            </span>

            <span>
              <strong>Green</strong>Edu
            </span>
          </Link>

          <Link href="/" className="green-auth-home">
            Bosh sahifa
          </Link>
        </div>

        <div className="green-auth-content">

          <div className="green-auth-badge">
            <span>🌱</span>
            Yashil o'quv dasturi
          </div>

          <h1>
            Tabiatni o'rganing.
            <br />
            <span>Dunyoni o'zgartiring.</span>
          </h1>

          <p>
            GreenEdu platformasiga kirib, ekologiya, biologiya va
            geografiyani AR va VR texnologiyalari orqali o'rganishni
            davom ettiring.
          </p>

          <div className="green-auth-features">
            <div className="green-auth-feature">
              <span>🌍</span>
              <div>
                <strong>Ekologik ta'lim</strong>
                <small>Tabiatni yaxshiroq anglang</small>
              </div>
            </div>

            <div className="green-auth-feature">
              <span>🥽</span>
              <div>
                <strong>AR / VR darslar</strong>
                <small>Interaktiv o'rganish tajribasi</small>
              </div>
            </div>

            <div className="green-auth-feature">
              <span>🏆</span>
              <div>
                <strong>XP va nishonlar</strong>
                <small>Bilimingizni rivojlantiring</small>
              </div>
            </div>
          </div>
        </div>

        {/* Decorative nature scene */}
        <div className="green-auth-nature" aria-hidden="true">
          <div className="auth-sun">☀️</div>

          <div className="auth-cloud auth-cloud-1">☁️</div>
          <div className="auth-cloud auth-cloud-2">☁️</div>

          <div className="auth-mountain auth-mountain-back" />
          <div className="auth-mountain auth-mountain-front" />

          <div className="auth-ground">
            <span className="auth-tree tree-1">🌳</span>
            <span className="auth-tree tree-2">🌲</span>
            <span className="auth-tree tree-3">🌳</span>

            <span className="auth-school">🏫</span>

            <div className="auth-river" />
          </div>
        </div>

        <div className="green-auth-corner corner-1" />
        <div className="green-auth-corner corner-2" />

      </aside>

      {/* ================= RIGHT FORM ================= */}
      <main
        id="main-content"
        className="green-auth-form-side"
      >
        <div className="green-auth-card">

          <div className="green-auth-mobile-logo">
            <span className="green-auth-logo-icon">
              <LeafIcon />
            </span>

            <span>
              <strong>Green</strong>Edu
            </span>
          </div>

          <div className="green-auth-heading">
            <div className="green-auth-small-badge">
              🌿 GreenEdu
            </div>

            <h2>Xush kelibsiz!</h2>

            <p>
              Hisobingizga kiring va o'rganishni davom ettiring.
            </p>
          </div>

          <form
            onSubmit={handleSubmit}
            className="green-auth-form"
            noValidate
          >
            <div className="green-auth-field">
              <label htmlFor="email">
                Email
              </label>

              <input
                id="email"
                name="email"
                type="email"
                placeholder="siz@misol.uz"
                value={form.email}
                onChange={handleChange}
                autoComplete="username"
                autoFocus
              />
            </div>

            <PasswordInput
              label="Parol"
              name="password"
              value={form.password}
              onChange={handleChange}
              autoComplete="current-password"
            />

            {error && (
              <div className="green-auth-error" role="alert">
                <span>!</span>
                {error}
              </div>
            )}

            <button
              type="submit"
              className="green-auth-submit"
              disabled={loading}
            >
              {loading ? (
                <>
                  <span className="green-auth-spinner" />
                  Tekshirilmoqda...
                </>
              ) : (
                <>
                  Kirish
                  <span>→</span>
                </>
              )}
            </button>
          </form>

          <div className="green-auth-divider">
            <span />
            <span>yoki</span>
            <span />
          </div>

          <div className="green-auth-bottom">
            <Link href="/forgot-password">
              Parolni unutdingizmi?
            </Link>

            <p>
              Hisobingiz yo'qmi?{" "}
              <Link href="/register">
                Ro'yxatdan o'ting
              </Link>
            </p>
          </div>

          <div className="green-auth-safe">
            <span>🔒</span>
            Ma'lumotlaringiz xavfsiz saqlanadi
          </div>
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