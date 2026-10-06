"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const router = useRouter();
  const supabase = createClient();

  const [form, setForm] = useState({
    email: "",
    password: "",
  });

  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleChange = (e) => {
    const { name, value } = e.target;

    setForm((prev) => ({
      ...prev,
      [name]: value,
    }));

    if (error) {
      setError("");
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    setError("");

    const email = form.email.trim();
    const password = form.password;

    // =========================
    // VALIDATSIYA
    // =========================

    if (!email) {
      setError("Email manzilini kiriting.");
      return;
    }

    if (!email.includes("@")) {
      setError("Email manzilini to‘g‘ri kiriting.");
      return;
    }

    if (!password) {
      setError("Parolni kiriting.");
      return;
    }

    setLoading(true);

    try {
      // =========================
      // SUPABASE LOGIN
      // =========================

      const { data, error: loginError } =
        await supabase.auth.signInWithPassword({
          email,
          password,
        });

      if (loginError) {
        console.error("Supabase login error:", loginError);

        const message =
          loginError.message?.toLowerCase() || "";

        if (
          message.includes("invalid login credentials")
        ) {
          setError("Email yoki parol noto‘g‘ri.");
        } else if (
          message.includes("email not confirmed")
        ) {
          setError(
            "Email manzilingiz hali tasdiqlanmagan. Emailingizni tekshiring."
          );
        } else {
          setError(loginError.message);
        }

        return;
      }

      // =========================
      // USER TEKSHIRISH
      // =========================

      if (!data?.user) {
        setError(
          "Foydalanuvchi ma’lumotlari olinmadi."
        );
        return;
      }

      // =========================
      // MUVAFFAQIYATLI LOGIN
      // =========================

      router.push("/dashboard");
      router.refresh();
    } catch (err) {
      console.error("Login exception:", err);

      setError(
        "Kirish vaqtida xatolik yuz berdi. Qaytadan urinib ko‘ring."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="auth-page">
      {/* =====================================================
          CHAP TOMON — GREENEDU
      ====================================================== */}

      <section className="auth-hero">
        <div className="viewfinder">
          <div className="vf-b" />

          <span className="section-eyebrow">
            GreenEdu
          </span>

          <h2>
            Tabiatni o‘rganing,
            <br />
            kelajakni yarating.
          </h2>

          <p>
            AR/VR texnologiyalari yordamida ekologik
            bilimlarni interaktiv va qiziqarli tarzda
            o‘rganing.
          </p>
        </div>
      </section>

      {/* =====================================================
          O‘NG TOMON — LOGIN
      ====================================================== */}

      <section className="auth-form-side">
        <div className="auth-card">

          <h1>Tizimga kirish</h1>

          <p className="lead">
            GreenEdu hisobingizga kirish uchun
            ma’lumotlaringizni kiriting.
          </p>

          <form
            className="auth-form"
            onSubmit={handleSubmit}
            noValidate
          >

            {/* =========================
                EMAIL
            ========================== */}

            <div className="field">
              <label htmlFor="email">
                Email
              </label>

              <input
                id="email"
                name="email"
                type="email"
                className="input"
                placeholder="siz@misol.uz"
                value={form.email}
                onChange={handleChange}
                autoComplete="username"
                autoFocus
                inputMode="email"
                spellCheck={false}
              />
            </div>

            {/* =========================
                PAROL
            ========================== */}

            <div className="field">
              <label htmlFor="password">
                Parol
              </label>

              <div className="pw-wrap">

                <input
                  id="password"
                  name="password"
                  type={
                    showPassword
                      ? "text"
                      : "password"
                  }
                  className="input pw-input"
                  placeholder="Parolingizni kiriting"
                  value={form.password}
                  onChange={handleChange}
                  autoComplete="current-password"
                />

                {/* EYE BUTTON */}

                <button
                  type="button"
                  className="pw-toggle"
                  onClick={() =>
                    setShowPassword(
                      (prev) => !prev
                    )
                  }
                  aria-label={
                    showPassword
                      ? "Parolni yashirish"
                      : "Parolni ko‘rsatish"
                  }
                  title={
                    showPassword
                      ? "Parolni yashirish"
                      : "Parolni ko‘rsatish"
                  }
                >
                  {showPassword ? (

                    /* =====================
                       EYE OFF
                    ====================== */

                    <svg
                      width="20"
                      height="20"
                      viewBox="0 0 24 24"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                      aria-hidden="true"
                    >
                      <path
                        d="M3 3L21 21"
                        stroke="currentColor"
                        strokeWidth="1.8"
                        strokeLinecap="round"
                      />

                      <path
                        d="M10.58 10.59A2 2 0 0013.41 13.42"
                        stroke="currentColor"
                        strokeWidth="1.8"
                        strokeLinecap="round"
                      />

                      <path
                        d="M9.88 5.08A10.94 10.94 0 0112 4.9C17 4.9 20.73 9.18 21.8 10.5a2.25 2.25 0 010 2.99 18.4 18.4 0 01-4.05 3.49"
                        stroke="currentColor"
                        strokeWidth="1.8"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />

                      <path
                        d="M6.61 6.61A18.48 18.48 0 002.2 10.5a2.25 2.25 0 000 2.99C3.27 14.82 7 19.1 12 19.1c1.42 0 2.75-.3 3.96-.78"
                        stroke="currentColor"
                        strokeWidth="1.8"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>

                  ) : (

                    /* =====================
                       EYE
                    ====================== */

                    <svg
                      width="20"
                      height="20"
                      viewBox="0 0 24 24"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                      aria-hidden="true"
                    >
                      <path
                        d="M2.2 12.5C3.27 10.18 7 5.9 12 5.9C17 5.9 20.73 10.18 21.8 12.5C20.73 14.82 17 19.1 12 19.1C7 19.1 3.27 14.82 2.2 12.5Z"
                        stroke="currentColor"
                        strokeWidth="1.8"
                        strokeLinejoin="round"
                      />

                      <circle
                        cx="12"
                        cy="12.5"
                        r="2.8"
                        stroke="currentColor"
                        strokeWidth="1.8"
                      />
                    </svg>

                  )}
                </button>
              </div>
            </div>

            {/* =========================
                FORGOT PASSWORD
            ========================== */}

            <div
              style={{
                display: "flex",
                justifyContent: "flex-end",
                marginTop: "-4px",
              }}
            >
              <Link
                href="/forgot-password"
                style={{
                  color: "var(--leaf-deep)",
                  fontSize: "13px",
                  fontWeight: 600,
                  textDecoration: "none",
                }}
              >
                Parolni unutdingizmi?
              </Link>
            </div>

            {/* =========================
                ERROR
            ========================== */}

            {error && (
              <div
                className="form-error"
                role="alert"
              >
                {error}
              </div>
            )}

            {/* =========================
                LOGIN BUTTON
            ========================== */}

            <button
              type="submit"
              className="btn btn-primary btn-lg"
              disabled={loading}
              style={{
                width: "100%",
              }}
            >
              {loading
                ? "Kirilmoqda..."
                : "Kirish"}
            </button>

          </form>

          {/* =========================
              REGISTER
          ========================== */}

          <div className="auth-links">
            Hisobingiz yo‘qmi?{" "}
            <Link href="/register">
              Ro‘yxatdan o‘tish
            </Link>
          </div>

        </div>
      </section>
    </main>
  );
}
