"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import AuthHero from "../auth-hero";
import PasswordInput from "@/components/PasswordInput";

export default function RegisterPage() {
  const router = useRouter();
  const [form, setForm] = useState({ fullName: "", email: "", password: "", confirm: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [checkEmail, setCheckEmail] = useState(false);

  const handleChange = (e) =>
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!form.fullName || !form.email || !form.password) {
      setError("Barcha maydonlarni to'ldiring.");
      return;
    }
    if (form.password.length < 6) {
      setError("Parol kamida 6 ta belgidan iborat bo'lishi kerak.");
      return;
    }
    if (form.password !== form.confirm) {
      setError("Parollar bir-biriga mos kelmadi.");
      return;
    }

    setLoading(true);
    try {
      const supabase = createClient();
      const { data, error: signUpError } = await supabase.auth.signUp({
        email: form.email,
        password: form.password,
        options: {
          data: { full_name: form.fullName },
          emailRedirectTo:
            typeof window !== "undefined" ? `${window.location.origin}/login` : undefined,
        },
      });

      if (signUpError) {
        if (signUpError.message.toLowerCase().includes("already registered")) {
          setError("Bu email bilan hisob allaqachon mavjud. Kirish sahifasidan foydalaning.");
        } else {
          setError(signUpError.message);
        }
        return;
      }

      // "Confirm email" o'chirilgan bo'lsa sessiya darhol keladi
      if (data.session) {
        router.push("/user");
        router.refresh();
      } else {
        setCheckEmail(true);
      }
    } catch {
      setError("Ro'yxatdan o'tishda xatolik. Qaytadan urinib ko'ring.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <AuthHero />
      <main id="main-content" className="auth-form-side">
        <div className="auth-card">
          <h1>Hisob yarating</h1>
          <p className="lead">Bir daqiqada ro'yxatdan o'ting va o'qishni boshlang.</p>

          {checkEmail ? (
            <p className="form-ok">
              Deyarli tayyor! Emailingizga tasdiqlash havolasi yuborildi — uni bosib,
              keyin <Link href="/login">kirish sahifasidan</Link> hisobingizga kiring.
            </p>
          ) : (
            <form onSubmit={handleSubmit} className="auth-form" noValidate>
              <div className="field">
                <label htmlFor="fullName">Ism-familiya</label>
                <input
                  id="fullName" name="fullName" type="text" className="input"
                  placeholder="Aliyev Vali" value={form.fullName}
                  onChange={handleChange} autoComplete="name" autoFocus
                />
              </div>
              <div className="field">
                <label htmlFor="email">Email</label>
                <input
                  id="email" name="email" type="email" className="input"
                  placeholder="siz@misol.uz" value={form.email}
                  onChange={handleChange} autoComplete="username"
                />
              </div>
              <PasswordInput
                label="Parol"
                name="password"
                value={form.password}
                onChange={handleChange}
                placeholder="Kamida 6 belgi"
                autoComplete="new-password"
              />
              <PasswordInput
                label="Parolni tasdiqlang"
                name="confirm"
                value={form.confirm}
                onChange={handleChange}
                autoComplete="new-password"
              />

              {error && <p className="form-error">{error}</p>}

              <button type="submit" className="btn btn-primary btn-lg" disabled={loading}>
                {loading ? "Yaratilmoqda..." : "Ro'yxatdan o'tish"}
              </button>
            </form>
          )}

          <p className="auth-links">
            Hisobingiz bormi? <Link href="/login">Kirish</Link>
          </p>
        </div>
      </main>
    </div>
  );
}
