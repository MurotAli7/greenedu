"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import AuthHero from "../auth-hero";
import PasswordInput from "@/components/PasswordInput";
import { safePath } from "@/lib/api/validate";

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
  // Ochiq qayta yo'naltirish (open redirect) himoyasi: faqat ichki yo'llar
  const from = safePath(searchParams.get("from"), "");

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
      const supabase = createClient();
      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email: form.email,
        password: form.password,
      });

      if (signInError) {
        const msg = signInError.message.toLowerCase();
        if (msg.includes("invalid login credentials")) {
          setError("Email yoki parol noto'g'ri.");
        } else if (msg.includes("email not confirmed")) {
          setError("Avval emailingizga yuborilgan havola orqali hisobni tasdiqlang.");
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

      router.push(from || (profile?.role === "admin" ? "/admin" : "/user"));
      router.refresh();
    } catch {
      setError("Kirishda xatolik yuz berdi. Qaytadan urinib ko'ring.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <AuthHero />
      <main id="main-content" className="auth-form-side">
        <div className="auth-card">
          <h1>Xush kelibsiz</h1>
          <p className="lead">Hisobingizga kirib, o'qishni davom ettiring.</p>

          <form onSubmit={handleSubmit} className="auth-form" noValidate>
            <div className="field">
              <label htmlFor="email">Email</label>
              <input
                id="email" name="email" type="email" className="input"
                placeholder="siz@misol.uz" value={form.email}
                onChange={handleChange} autoComplete="username" autoFocus
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

          <p className="auth-links">
            <Link href="/forgot-password">Parolni unutdingizmi?</Link>
            <br />
            Hisobingiz yo'qmi? <Link href="/register">Ro'yxatdan o'ting</Link>
          </p>
        </div>
      </main>
    </div>
  );
}
