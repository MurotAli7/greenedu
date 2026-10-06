
"use client";

import { useState } from "react";
import Link from "next/link";

export default function LoginPage() {
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

    if (!form.email.trim()) {
      setError("Email manzilini kiriting.");
      return;
    }

    if (!form.email.includes("@")) {
      setError("Email manzilini to‘g‘ri kiriting.");
      return;
    }

    if (!form.password) {
      setError("Parolni kiriting.");
      return;
    }

    setLoading(true);

    try {
      /*
       * BU YERGA SIZNING MAVJUD SUPABASE LOGIN
       * KODINGIZNI QO'YASIZ.
       *
       * Masalan:
       *
       * const { error } = await supabase.auth.signInWithPassword({
       *   email: form.email,
       *   password: form.password,
       * });
       *
       * if (error) {
       *   setError(error.message);
       *   return;
       * }
       *
       * router.push("/dashboard");
       */

      console.log("Login:", form.email);
    } catch (err) {
      console.error(err);
      setError("Kirish vaqtida xatolik yuz berdi.");
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
          O'NG TOMON — LOGIN FORM
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
            {/* EMAIL */}
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

            {/* PAROL */}
            <div className="field">
              <label htmlFor="password">
                Parol
              </label>

              <div className="pw-wrap">
                <input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  className="input pw-input"
                  placeholder="Parolingizni kiriting"
                  value={form.password}
                  onChange={handleChange}
                  autoComplete="current-password"
                />

                <button
                  type="button"
                  className="pw-toggle"
                  onClick={() =>
                    setShowPassword((prev) => !prev)
                  }
                  aria-label={
                    showPassword
                      ? "Parolni yashirish"
                      : "Parolni ko‘rsatish"
                  }
                >
                  {showPassword ? "🙈" : "👁"}
                </button>
              </div>
            </div>

            {/* PAROLNI UNUTDINGIZMI */}
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

            {/* XATOLIK */}
            {error && (
              <div
                className="form-error"
                role="alert"
              >
                {error}
              </div>
            )}

            {/* LOGIN BUTTON */}
            <button
              type="submit"
              className="btn btn-primary btn-lg"
              disabled={loading}
              style={{
                width: "100%",
              }}
            >
              {loading ? "Kirilmoqda..." : "Kirish"}
            </button>
          </form>

          {/* REGISTER */}
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
