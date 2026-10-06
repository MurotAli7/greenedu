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

  // Faqat ichki yo'llarga redirect qilish
  const from = safePath(
    searchParams.get("from"),
    ""
  );

  const [form, setForm] = useState({
    email: "",
    password: "",
  });

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

    if (!email || !password) {
      setError("Email va parolni kiriting.");
      return;
    }

    if (!email.includes("@")) {
      setError("Email manzilini to‘g‘ri kiriting.");
      return;
    }

    setLoading(true);

    try {
      const supabase = createClient();

      // =========================
      // SUPABASE LOGIN
      // =========================

      const {
        data,
        error: signInError,
      } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (signInError) {
        console.error(
          "Supabase login error:",
          signInError
        );

        const msg =
          signInError.message?.toLowerCase() || "";

        if (
          msg.includes(
            "invalid login credentials"
          )
        ) {
          setError(
            "Email yoki parol noto‘g‘ri."
          );
        } else if (
          msg.includes(
            "email not confirmed"
          )
        ) {
          setError(
            "Avval emailingizga yuborilgan havola orqali hisobni tasdiqlang."
          );
        } else {
          setError(signInError.message);
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
      // PROFILE / ROLE
      // =========================

      const {
        data: profile,
        error: profileError,
      } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", data.user.id)
        .single();

      if (profileError) {
        console.error(
          "Profile error:",
          profileError
        );
      }

      // =========================
      // REDIRECT
      // =========================

      if (from) {
        router.push(from);
      } else if (
        profile?.role === "admin"
      ) {
        router.push("/admin");
      } else {
        router.push("/user");
      }

      router.refresh();
    } catch (err) {
      console.error(
        "Login exception:",
        err
      );

      setError(
        "Kirishda xatolik yuz berdi. Qaytadan urinib ko‘ring."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">

      {/* =========================
          GREENEDU HERO
      ========================== */}

      <AuthHero />

      {/* =========================
          LOGIN FORM
      ========================== */}

      <main
        id="main-content"
        className="auth-form-side"
      >
        <div className="auth-card">

          <h1>Xush kelibsiz</h1>

          <p className="lead">
            Hisobingizga kirib, o‘qishni davom
            ettiring.
          </p>

          <form
            onSubmit={handleSubmit}
            className="auth-form"
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

            {/* PASSWORD */}

            <PasswordInput
              label="Parol"
              name="password"
              value={form.password}
              onChange={handleChange}
              autoComplete="current-password"
            />

            {/* ERROR */}

            {error && (
              <p
                className="form-error"
                role="alert"
              >
                {error}
              </p>
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
              {loading
                ? "Tekshirilmoqda..."
                : "Kirish"}
            </button>
          </form>

          {/* LINKS */}

          <p className="auth-links">
            <Link href="/forgot-password">
              Parolni unutdingizmi?
            </Link>

            <br />

            Hisobingiz yo‘qmi?{" "}
            <Link href="/register">
              Ro‘yxatdan o‘ting
            </Link>
          </p>

        </div>
      </main>
    </div>
  );
}