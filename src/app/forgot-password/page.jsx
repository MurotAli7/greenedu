
"use client";

import { useState } from "react";
import Link from "next/link";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();

    setError("");
    setSuccess("");

    const trimmedEmail = email.trim();

    if (!trimmedEmail) {
      setError("Email manzilini kiriting.");
      return;
    }

    if (!trimmedEmail.includes("@")) {
      setError("Email manzilini to‘g‘ri kiriting.");
      return;
    }

    setLoading(true);

    try {
      /*
       * BU YERGA SIZNING MAVJUD SUPABASE
       * PASSWORD RESET KODINGIZ QO'YILADI.
       *
       * Masalan:
       *
       * const { error } = await supabase.auth.resetPasswordForEmail(
       *   trimmedEmail,
       *   {
       *     redirectTo:
       *       `${window.location.origin}/reset-password`,
       *   }
       * );
       *
       * if (error) {
       *   setError(error.message);
       *   return;
       * }
       */

      console.log("Password reset:", trimmedEmail);

      setSuccess(
        "Parolni tiklash uchun havola emailingizga yuborildi."
      );
    } catch (err) {
      console.error(err);

      setError(
        "Parolni tiklashda xatolik yuz berdi. Qaytadan urinib ko‘ring."
      );
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
            Hisobingizga
            <br />
            qayta kiring.
          </h2>

          <p>
            Parolingizni unutgan bo‘lsangiz, xavotir olmang.
            Email manzilingiz orqali hisobingizga qayta
            kirish imkoniyatini tiklang.
          </p>
        </div>
      </section>

      {/* =====================================================
          O'NG TOMON
      ====================================================== */}
      <section className="auth-form-side">
        <div className="auth-card">
          <h1>Parolni tiklash</h1>

          <p className="lead">
            Hisobingizga bog‘langan email manzilini
            kiriting. Sizga parolni tiklash uchun havola
            yuboramiz.
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
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);

                  if (error) {
                    setError("");
                  }

                  if (success) {
                    setSuccess("");
                  }
                }}
                autoComplete="email"
                autoFocus
                inputMode="email"
                spellCheck={false}
              />
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

            {/* MUVAFFAQIYAT */}
            {success && (
              <div
                className="form-ok"
                role="status"
              >
                {success}
              </div>
            )}

            {/* RESET BUTTON */}
            <button
              type="submit"
              className="btn btn-primary btn-lg"
              disabled={loading}
              style={{
                width: "100%",
              }}
            >
              {loading
                ? "Yuborilmoqda..."
                : "Tiklash havolasini yuborish"}
            </button>
          </form>

          {/* LOGIN */}
          <div className="auth-links">
            <Link href="/login">
              ← Tizimga qaytish
            </Link>
          </div>

          {/* REGISTER */}
          <div
            className="auth-links"
            style={{ marginTop: "10px" }}
          >
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