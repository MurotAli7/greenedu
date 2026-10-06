
"use client";

import { useState } from "react";
import Link from "next/link";

export default function RegisterPage() {
  const [form, setForm] = useState({
    fullName: "",
    email: "",
    password: "",
    confirm: "",
  });

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
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

    /* =========================
       VALIDATSIYA
    ========================= */

    if (!form.fullName.trim()) {
      setError("Ism va familiyangizni kiriting.");
      return;
    }

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

    if (form.password.length < 6) {
      setError("Parol kamida 6 ta belgidan iborat bo‘lishi kerak.");
      return;
    }

    if (!form.confirm) {
      setError("Parolni qayta kiriting.");
      return;
    }

    if (form.password !== form.confirm) {
      setError("Parollar bir xil emas.");
      return;
    }

    setLoading(true);

    try {
      /*
       * BU YERGA SIZNING MAVJUD SUPABASE
       * REGISTER KODINGIZ QO'YILADI.
       *
       * Masalan:
       *
       * const { data, error } = await supabase.auth.signUp({
       *   email: form.email,
       *   password: form.password,
       *   options: {
       *     data: {
       *       full_name: form.fullName,
       *     },
       *   },
       * });
       *
       * if (error) {
       *   setError(error.message);
       *   return;
       * }
       *
       * router.push("/login");
       */

      console.log("Register:", form);
    } catch (err) {
      console.error(err);
      setError("Ro‘yxatdan o‘tish vaqtida xatolik yuz berdi.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="auth-page">
      {/* =====================================================
          CHAP TOMON
      ====================================================== */}
      <section className="auth-hero">
        <div className="viewfinder">
          <div className="vf-b" />

          <span className="section-eyebrow">
            GreenEdu
          </span>

          <h2>
            GreenEdu bilan
            <br />
            bilim oling.
          </h2>

          <p>
            Ekologiya, tabiat va atrof-muhit haqidagi
            bilimlarni AR/VR texnologiyalari orqali
            zamonaviy usulda o‘rganing.
          </p>
        </div>
      </section>

      {/* =====================================================
          O'NG TOMON — REGISTER
      ====================================================== */}
      <section className="auth-form-side">
        <div className="auth-card">
          <h1>Ro‘yxatdan o‘tish</h1>

          <p className="lead">
            GreenEdu platformasidan foydalanish uchun
            yangi hisob yarating.
          </p>

          <form
            className="auth-form"
            onSubmit={handleSubmit}
            noValidate
          >
            {/* ISM */}
            <div className="field">
              <label htmlFor="fullName">
                Ism va familiya
              </label>

              <input
                id="fullName"
                name="fullName"
                type="text"
                className="input"
                placeholder="Ali Valiyev"
                value={form.fullName}
                onChange={handleChange}
                autoComplete="name"
              />
            </div>

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
                autoComplete="email"
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
                  placeholder="Kamida 6 ta belgi"
                  value={form.password}
                  onChange={handleChange}
                  autoComplete="new-password"
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

            {/* PAROLNI TASDIQLASH */}
            <div className="field">
              <label htmlFor="confirm">
                Parolni tasdiqlang
              </label>

              <div className="pw-wrap">
                <input
                  id="confirm"
                  name="confirm"
                  type={showConfirm ? "text" : "password"}
                  className="input pw-input"
                  placeholder="Parolni qayta kiriting"
                  value={form.confirm}
                  onChange={handleChange}
                  autoComplete="new-password"
                />

                <button
                  type="button"
                  className="pw-toggle"
                  onClick={() =>
                    setShowConfirm((prev) => !prev)
                  }
                  aria-label={
                    showConfirm
                      ? "Tasdiqlash parolini yashirish"
                      : "Tasdiqlash parolini ko‘rsatish"
                  }
                >
                  {showConfirm ? "🙈" : "👁"}
                </button>
              </div>
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

            {/* REGISTER BUTTON */}
            <button
              type="submit"
              className="btn btn-primary btn-lg"
              disabled={loading}
              style={{
                width: "100%",
              }}
            >
              {loading
                ? "Ro‘yxatdan o‘tilmoqda..."
                : "Ro‘yxatdan o‘tish"}
            </button>
          </form>

          {/* LOGIN */}
          <div className="auth-links">
            Hisobingiz bormi?{" "}
            <Link href="/login">
              Tizimga kirish
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
