
"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import PasswordInput from "@/components/PasswordInput";
import { safePath } from "@/lib/api/validate";

function GreenLoginIllustration() {
  return (
    <div className="login-world" aria-hidden="true">
      <div className="login-sun" />

      <div className="login-cloud login-cloud-1" />
      <div className="login-cloud login-cloud-2" />

      <div className="login-mountain login-mountain-back" />
      <div className="login-mountain login-mountain-front" />

      <div className="login-tree login-tree-1">
        <span />
        <i />
      </div>

      <div className="login-tree login-tree-2">
        <span />
        <i />
      </div>

      <div className="login-tree login-tree-3">
        <span />
        <i />
      </div>

      <div className="login-school">
        <div className="login-school-roof" />
        <div className="login-school-body">
          <div className="login-school-window" />
          <div className="login-school-window" />
          <div className="login-school-door" />
        </div>
        <div className="login-school-sign">GREEN EDU</div>
      </div>

      <div className="login-river" />

      <div className="login-flower login-flower-1">
        <span />
      </div>

      <div className="login-flower login-flower-2">
        <span />
      </div>

      <div className="login-bird login-bird-1">⌁</div>
      <div className="login-bird login-bird-2">⌁</div>

      <div className="login-character login-character-1">
        <div className="character-head" />
        <div className="character-body" />
      </div>

      <div className="login-character login-character-2">
        <div className="character-head" />
        <div className="character-body" />
      </div>

      <div className="login-badge">
        <span>🌱</span>
        <div>
          <strong>Yashil bilim</strong>
          <small>Kelajak shu yerdan boshlanadi</small>
        </div>
      </div>
    </div>
  );
}

function GreenLeafMark() {
  return (
    <div className="login-logo-mark" aria-hidden="true">
      <svg viewBox="0 0 48 48" fill="none">
        <path
          d="M37.5 7.5C23 8.3 12.1 14.1 9.2 24.7c-2.2 8.1 2.5 14.8 9.7 15.8 9.2 1.2 17.3-7.3 18.6-18.7.5-4.4.2-9.1 0-14.3Z"
          fill="currentColor"
        />
        <path
          d="M9.7 39.4c7.1-9.8 13.5-16.1 25.7-23.2"
          stroke="white"
          strokeWidth="3"
          strokeLinecap="round"
        />
      </svg>
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

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Faqat ichki yo'llarga qayta yo'naltirish
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

    if (error) {
      setError("");
    }
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
    <div className="green-login-page">
      {/* Chap ekologik qism */}
      <section className="green-login-visual">
        <div className="login-visual-content">
          <Link href="/" className="login-brand">
            <GreenLeafMark />
            <span>GreenEdu</span>
          </Link>

          <div className="login-intro">
            <span className="login-kicker">
              🌍 Ekologik ta'lim olamiga qayting
            </span>

            <h2>
              Bilim bilan
              <br />
              <strong>tabiatni asrang.</strong>
            </h2>

            <p>
              AR/VR darslar, interaktiv tajribalar va qiziqarli
              ekologik sarguzashtlar sizni kutmoqda.
            </p>
          </div>

          <GreenLoginIllustration />
        </div>
      </section>

      {/* Login qismi */}
      <main className="green-login-form-side" id="main-content">
        <div className="green-login-mobile-brand">
          <Link href="/" className="login-brand">
            <GreenLeafMark />
            <span>GreenEdu</span>
          </Link>
        </div>

        <div className="green-login-card">
          <div className="login-card-top">
            <span className="login-welcome-icon">👋</span>

            <div>
              <span className="login-small-label">
                GreenEdu olamiga
              </span>

              <h1>Xush kelibsiz!</h1>
            </div>
          </div>

          <p className="green-login-lead">
            Hisobingizga kiring va o'qishni davom ettiring.
          </p>

          <form
            onSubmit={handleSubmit}
            className="green-login-form"
            noValidate
          >
            <div className="green-login-field">
              <label htmlFor="login-email">Email</label>

              <div className="green-input-wrap">
                <span className="green-input-icon" aria-hidden="true">
                  ✉
                </span>

                <input
                  id="login-email"
                  name="email"
                  type="email"
                  inputMode="email"
                  autoCapitalize="none"
                  autoCorrect="off"
                  spellCheck="false"
                  className="green-login-input"
                  placeholder="siz@misol.uz"
                  value={form.email}
                  onChange={handleChange}
                  autoComplete="username"
                  autoFocus
                />
              </div>
            </div>

            <div className="green-login-field">
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
                className="green-login-error"
                role="alert"
                aria-live="polite"
              >
                <span>!</span>
                <p>{error}</p>
              </div>
            )}

            <button
              type="submit"
              className="green-login-button"
              disabled={loading}
            >
              {loading ? (
                <>
                  <span className="login-spinner" />
                  Tekshirilmoqda...
                </>
              ) : (
                <>
                  Kirish
                  <span aria-hidden="true">→</span>
                </>
              )}
            </button>
          </form>

          <div className="green-login-divider">
            <span />
            <small>yoki</small>
            <span />
          </div>

          <div className="green-login-links">
            <Link href="/forgot-password" className="forgot-link">
              Parolni unutdingizmi?
            </Link>

            <p>
              Hisobingiz yo'qmi?{" "}
              <Link href="/register">Ro'yxatdan o'ting</Link>
            </p>
          </div>

          <div className="green-login-trust">
            <span>🌱</span>
            <p>
              GreenEdu bilan bilim oling,
              <br />
              tabiatga foyda keltiring.
            </p>
          </div>
        </div>

        <Link href="/" className="green-login-back">
          ← Bosh sahifaga qaytish
        </Link>
      </main>
    </div>
  );
}
