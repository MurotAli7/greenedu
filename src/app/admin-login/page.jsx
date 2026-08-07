"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { LeafIcon } from "@/components/Icons";
import PasswordInput from "@/components/PasswordInput";
import { safePath } from "@/lib/api/validate";
import { apiFetch } from "@/lib/api/client";

export default function AdminLoginPage() {
  return (
    <Suspense fallback={null}>
      <AdminLoginForm />
    </Suspense>
  );
}

function AdminLoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  // Faqat ichki yo'llarga qaytariladi (open redirect himoyasi)
  const from = safePath(searchParams.get("from"), "/admin");

  const [form, setForm] = useState({ email: "", password: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleChange = (e) =>
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (!form.email || !form.password) {
      setError("Email va parolni kiriting.");
      return;
    }

    setLoading(true);
    try {
      await apiFetch("/api/admin-auth", { method: "POST", body: form });
      router.push(from);
      router.refresh();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: "100dvh", display: "flex", alignItems: "center", justifyContent: "center", padding: 20, background: "var(--leaf-deep)" }}>
      <div className="card card-pad auth-card" style={{ maxWidth: 380 }}>
        <span className="brand-mark" style={{ background: "var(--leaf)", color: "#fff", marginBottom: 14 }}>
          <LeafIcon />
        </span>
        <h1>Admin panel</h1>
        <p className="lead">Davom etish uchun administrator hisobi bilan kiring.</p>

        <form onSubmit={handleSubmit} className="auth-form" noValidate>
          <div className="field">
            <label htmlFor="email">Admin email</label>
            <input
              id="email" name="email" type="email" className="input"
              value={form.email} onChange={handleChange}
              autoComplete="username" autoFocus
            />
          </div>
          <PasswordInput
            label="Parol"
            name="password"
            value={form.password}
            onChange={handleChange}
            autoComplete="current-password"
          />

          {error && <p className="form-error">{error}</p>}

          <button type="submit" className="btn btn-primary btn-lg" disabled={loading}>
            {loading ? "Tekshirilmoqda..." : "Kirish"}
          </button>
        </form>
      </div>
    </div>
  );
}
