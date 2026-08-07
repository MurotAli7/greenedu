"use client";

import { useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import AuthHero from "../auth-hero";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (!email) {
      setError("Emailingizni kiriting.");
      return;
    }

    setLoading(true);
    try {
      const supabase = createClient();
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo:
          typeof window !== "undefined" ? `${window.location.origin}/login` : undefined,
      });
      if (resetError) {
        setError(resetError.message);
        return;
      }
      setSent(true);
    } catch {
      setError("Xatolik yuz berdi. Qaytadan urinib ko'ring.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <AuthHero />
      <main id="main-content" className="auth-form-side">
        <div className="auth-card">
          <h1>Parolni tiklash</h1>
          <p className="lead">
            Emailingizni kiriting — parolni tiklash havolasini yuboramiz.
          </p>

          {sent ? (
            <p className="form-ok">
              Havola yuborildi! Emailingizni tekshiring (spam papkani ham),
              so'ng havola orqali yangi parol o'rnating.
            </p>
          ) : (
            <form onSubmit={handleSubmit} className="auth-form" noValidate>
              <div className="field">
                <label htmlFor="email">Email</label>
                <input
                  id="email" type="email" className="input"
                  placeholder="siz@misol.uz" value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="username" autoFocus
                />
              </div>

              {error && <p className="form-error">{error}</p>}

              <button type="submit" className="btn btn-primary btn-lg" disabled={loading}>
                {loading ? "Yuborilmoqda..." : "Havolani yuborish"}
              </button>
            </form>
          )}

          <p className="auth-links">
            <Link href="/login">← Kirish sahifasiga qaytish</Link>
          </p>
        </div>
      </main>
    </div>
  );
}
