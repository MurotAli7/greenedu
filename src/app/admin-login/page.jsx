"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { LeafIcon, BookIcon, CheckIcon } from "@/components/Icons";
import PasswordInput from "@/components/PasswordInput";
import { safePath } from "@/lib/api/validate";
import { apiFetch } from "@/lib/api/client";

export default function AdminLoginPage() {
  return (
    <Suspense fallback={<div className="admin-login-loading" />}>
      <AdminLoginForm />
    </Suspense>
  );
}

function AdminLoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const from = safePath(searchParams.get("from"), "/admin/courses");

  const [form, setForm] = useState({ email: "", password: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleChange = (event) => {
    setForm((current) => ({ ...current, [event.target.name]: event.target.value }));
    if (error) setError("");
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");

    if (!form.email.trim() || !form.password) {
      setError("Admin email va parolni kiriting.");
      return;
    }

    setLoading(true);
    try {
      await apiFetch("/api/admin-auth", {
        method: "POST",
        body: { email: form.email.trim(), password: form.password },
      });
      router.replace(from);
      router.refresh();
    } catch (err) {
      setError(err?.message || "Kirishda xatolik yuz berdi.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="admin-login-shell">
      <section className="admin-login-panel" aria-label="GreenEdu administratoriga kirish">
        <div className="admin-login-brand-side">
          <LinkBrand />
          <div className="admin-login-brand-copy">
            <span className="admin-login-eyebrow">GREENEDU · ADMIN</span>
            <h1>Bilimni boshqarish uchun bitta joy.</h1>
            <p>
              Kurslar yarating, darslar va interaktiv ta’lim materiallarini tartibli boshqaring.
            </p>
          </div>
          <div className="admin-login-feature-list">
            <div><span><CheckIcon /></span><span>Kurs mazmunini boshqarish</span></div>
            <div><span><CheckIcon /></span><span>3D va AR/VR materiallar</span></div>
            <div><span><CheckIcon /></span><span>Yengil va qulay boshqaruv</span></div>
          </div>
          <div className="admin-login-book-art" aria-hidden="true"><BookIcon /></div>
        </div>

        <div className="admin-login-form-side">
          <div className="admin-login-form-heading">
            <span className="admin-login-mobile-mark"><LeafIcon /></span>
            <span className="admin-login-eyebrow">XUSH KELIBSIZ</span>
            <h2>Admin panelga kirish</h2>
            <p>Davom etish uchun administrator hisobingizni kiriting.</p>
          </div>

          <form onSubmit={handleSubmit} className="auth-form admin-login-form" noValidate>
            <div className="field">
              <label htmlFor="admin-email">Admin email</label>
              <input
                id="admin-email"
                name="email"
                type="email"
                className="input"
                value={form.email}
                onChange={handleChange}
                autoComplete="username"
                autoFocus
                maxLength={254}
                required
              />
            </div>

            <PasswordInput
              label="Parol"
              name="password"
              value={form.password}
              onChange={handleChange}
              autoComplete="current-password"
            />

            {error && <p className="form-error" role="alert">{error}</p>}

            <button type="submit" className="btn btn-primary btn-lg admin-login-submit" disabled={loading}>
              {loading ? "Tekshirilmoqda..." : "Xavfsiz kirish"}
              {!loading && <span aria-hidden="true">→</span>}
            </button>
            <p className="admin-login-security"><span /> Faqat administrator hisoblari uchun</p>
          </form>
        </div>
      </section>
      <p className="admin-login-footer">GreenEdu · Ekologik ta’lim platformasi</p>
    </main>
  );
}

function LinkBrand() {
  return (
    <div className="admin-login-brand">
      <span className="admin-login-brand-icon"><LeafIcon /></span>
      <span><strong>GreenEdu</strong><small>Kontent platformasi</small></span>
    </div>
  );
}
