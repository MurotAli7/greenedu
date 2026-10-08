
"use client";

import { useState } from "react";
import Link from "next/link";

function EyeIcon({ visible = false }) {
  if (visible) {
    return (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
      >
        <path
          d="M2.5 12s3.5-6 9.5-6 9.5 6 9.5 6-3.5 6-9.5 6-9.5-6-9.5-6Z"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <circle
          cx="12"
          cy="12"
          r="2.7"
          stroke="currentColor"
          strokeWidth="1.8"
        />
      </svg>
    );
  }

  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <path
        d="M3 3l18 18"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />

      <path
        d="M10.6 6.2A10.8 10.8 0 0 1 12 6c6 0 9.5 6 9.5 6a17.5 17.5 0 0 1-3.2 3.8"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      <path
        d="M6.3 8.1C3.9 9.7 2.5 12 2.5 12s3.5 6 9.5 6c1 0 1.9-.2 2.7-.5"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function LeafIcon() {
  return (
    <svg
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <path
        d="M27 5C17.2 5.3 9.3 8.2 6.2 14.3c-2.4 4.8-.3 9.2 4.1 10.4 4.6 1.2 9.1-1.5 11.6-5.8C24.4 14.7 25.5 9.5 27 5Z"
        fill="currentColor"
      />

      <path
        d="M5.5 27c3.7-6.3 9.2-11.5 18.1-17.2"
        stroke="white"
        strokeWidth="1.8"
        strokeLinecap="round"
        opacity=".85"
      />
    </svg>
  );
}

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
       * MAVJUD SUPABASE REGISTER KODINGIZNI
       * SHU YERGA QO'YASIZ.
       */

      console.log("Register:", form);
    } catch (err) {
      console.error(err);

      setError(
        "Ro‘yxatdan o‘tish vaqtida xatolik yuz berdi."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="green-auth-page">

      {/* =====================================================
          LEFT — GREENEDU BRAND
      ====================================================== */}

      <section className="green-auth-hero">

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

          <Link
            href="/"
            className="green-auth-home"
          >
            Bosh sahifa
          </Link>

        </div>


        <div className="green-auth-content">

          <div className="green-auth-badge">
            <span>🌱</span>
            Yashil o‘quv dasturi
          </div>

          <h1>
            Tabiatni o‘rganing.
            <br />
            <span>Dunyoni o‘zgartiring.</span>
          </h1>

          <p>
            GreenEdu platformasida ekologiya, biologiya va
            geografiyani zamonaviy AR/VR texnologiyalari
            orqali interaktiv tarzda o‘rganing.
          </p>


          <div className="green-auth-features">

            <div className="green-auth-feature">
              <span>🌍</span>

              <div>
                <strong>Ekologik ta’lim</strong>
                <small>
                  Tabiatni yaxshiroq anglang
                </small>
              </div>
            </div>


            <div className="green-auth-feature">
              <span>🥽</span>

              <div>
                <strong>AR / VR darslar</strong>
                <small>
                  Interaktiv o‘rganish tajribasi
                </small>
              </div>
            </div>


            <div className="green-auth-feature">
              <span>🏆</span>

              <div>
                <strong>XP va nishonlar</strong>
                <small>
                  Bilimingizni rivojlantiring
                </small>
              </div>
            </div>

          </div>

        </div>


        {/* Nature decoration */}

        <div
          className="green-auth-nature"
          aria-hidden="true"
        >
          <div className="auth-sun">
            ☀️
          </div>

          <div className="auth-cloud auth-cloud-1">
            ☁️
          </div>

          <div className="auth-cloud auth-cloud-2">
            ☁️
          </div>

          <div className="auth-mountain auth-mountain-back" />
          <div className="auth-mountain auth-mountain-front" />

          <div className="auth-ground">

            <span className="auth-tree tree-1">
              🌳
            </span>

            <span className="auth-tree tree-2">
              🌲
            </span>

            <span className="auth-tree tree-3">
              🌳
            </span>

            <span className="auth-school">
              🏫
            </span>

            <div className="auth-river" />

          </div>
        </div>

      </section>


      {/* =====================================================
          RIGHT — REGISTER
      ====================================================== */}

      <section className="green-auth-form-side">

        <div className="green-auth-card">

          {/* Mobile logo */}

          <div className="green-auth-mobile-logo">

            <span className="green-auth-logo-icon">
              <LeafIcon />
            </span>

            <span>
              <strong>Green</strong>Edu
            </span>

          </div>


          {/* Heading */}

          <div className="green-auth-heading">

            <div className="green-auth-small-badge">
              🌿 GreenEdu
            </div>

            <h2>
              Yangi hisob yarating
            </h2>

            <p>
              GreenEdu bilan tabiatni o‘rganishni boshlang.
            </p>

          </div>


          {/* Form */}

          <form
            className="green-auth-form"
            onSubmit={handleSubmit}
            noValidate
          >

            {/* FULL NAME */}

            <div className="green-auth-field">

              <label htmlFor="fullName">
                Ism va familiya
              </label>

              <input
                id="fullName"
                name="fullName"
                type="text"
                placeholder="Ali Valiyev"
                value={form.fullName}
                onChange={handleChange}
                autoComplete="name"
              />

            </div>


            {/* EMAIL */}

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
                autoComplete="email"
                inputMode="email"
                spellCheck={false}
              />

            </div>


            {/* PASSWORD */}

            <div className="green-auth-field">

              <label htmlFor="password">
                Parol
              </label>

              <div className="green-auth-password">

                <input
                  id="password"
                  name="password"
                  type={
                    showPassword
                      ? "text"
                      : "password"
                  }
                  placeholder="Kamida 6 ta belgi"
                  value={form.password}
                  onChange={handleChange}
                  autoComplete="new-password"
                />

                <button
                  type="button"
                  className="green-auth-password-toggle"
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
                  aria-pressed={showPassword}
                >
                  <EyeIcon
                    visible={showPassword}
                  />
                </button>

              </div>

            </div>


            {/* CONFIRM PASSWORD */}

            <div className="green-auth-field">

              <label htmlFor="confirm">
                Parolni tasdiqlang
              </label>

              <div className="green-auth-password">

                <input
                  id="confirm"
                  name="confirm"
                  type={
                    showConfirm
                      ? "text"
                      : "password"
                  }
                  placeholder="Parolni qayta kiriting"
                  value={form.confirm}
                  onChange={handleChange}
                  autoComplete="new-password"
                />

                <button
                  type="button"
                  className="green-auth-password-toggle"
                  onClick={() =>
                    setShowConfirm(
                      (prev) => !prev
                    )
                  }
                  aria-label={
                    showConfirm
                      ? "Tasdiqlash parolini yashirish"
                      : "Tasdiqlash parolini ko‘rsatish"
                  }
                  aria-pressed={showConfirm}
                >
                  <EyeIcon
                    visible={showConfirm}
                  />
                </button>

              </div>

            </div>


            {/* ERROR */}

            {error && (
              <div
                className="green-auth-error"
                role="alert"
              >
                <span>!</span>
                {error}
              </div>
            )}


            {/* BUTTON */}

            <button
              type="submit"
              className="green-auth-submit"
              disabled={loading}
            >
              {loading ? (
                <>
                  <span className="green-auth-spinner" />
                  Ro‘yxatdan o‘tilmoqda...
                </>
              ) : (
                <>
                  Hisob yaratish
                  <span>→</span>
                </>
              )}
            </button>

          </form>


          {/* Divider */}

          <div className="green-auth-divider">

            <span />

            <span>
              yoki
            </span>

            <span />

          </div>


          {/* Login */}

          <div className="green-auth-bottom">

            <p>
              Hisobingiz bormi?{" "}

              <Link href="/login">
                Tizimga kiring
              </Link>
            </p>

          </div>


          {/* Security */}

          <div className="green-auth-safe">

            <span>🔒</span>

            Ma’lumotlaringiz xavfsiz saqlanadi

          </div>

        </div>

      </section>

    </main>
  );
}
