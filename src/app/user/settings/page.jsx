"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { SkeletonPageHead } from "@/components/Skeleton";
import PasswordInput from "@/components/PasswordInput";

export default function SettingsPage() {
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState("");
  const [userId, setUserId] = useState(null);
  const [fullName, setFullName] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [avatarMsg, setAvatarMsg] = useState(null);
  const [avatarBusy, setAvatarBusy] = useState(false);
  const [nameMsg, setNameMsg] = useState(null); // { ok, text }
  const [pw, setPw] = useState({ next: "", confirm: "" });
  const [pwMsg, setPwMsg] = useState(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      setUserId(user.id);
      setEmail(user.email || "");
      const { data: profile } = await supabase
        .from("profiles").select("full_name, avatar_url").eq("id", user.id).single();
      setFullName(profile?.full_name || "");
      setAvatarUrl(profile?.avatar_url || "");
      setLoading(false);
    })();
  }, []);

  const uploadAvatar = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setAvatarMsg(null);
    if (!file.type.startsWith("image/")) {
      setAvatarMsg({ ok: false, text: "Faqat rasm fayli yuklang (JPG, PNG, WEBP)." });
      return;
    }
    if (file.size > 3 * 1024 * 1024) {
      setAvatarMsg({ ok: false, text: "Rasm 3 MB dan katta bo'lmasin." });
      return;
    }
    setAvatarBusy(true);
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      const ext = (file.name.split(".").pop() || "jpg").toLowerCase();
      const path = `${user.id}/avatar.${ext}`;

      const { error: upError } = await supabase.storage
        .from("avatars")
        .upload(path, file, { upsert: true, contentType: file.type });
      if (upError) throw upError;

      const { data: pub } = supabase.storage.from("avatars").getPublicUrl(path);
      // Keshni chetlab o'tish uchun versiya parametri
      const url = `${pub.publicUrl}?v=${Date.now()}`;

      const { error: profError } = await supabase
        .from("profiles").update({ avatar_url: url }).eq("id", userId);
      if (profError) throw profError;

      setAvatarUrl(url);
      setAvatarMsg({ ok: true, text: "Profil rasmi yangilandi." });
      window.dispatchEvent(
        new CustomEvent("greenedu:profile-updated", { detail: { avatarUrl: url } })
      );
    } catch (err) {
      setAvatarMsg({
        ok: false,
        text: err?.message?.includes("Bucket not found")
          ? "Storage sozlanmagan: Supabase'da update-v2.1.sql ni ishga tushiring."
          : "Rasm yuklashda xatolik yuz berdi.",
      });
    } finally {
      setAvatarBusy(false);
    }
  };

  const saveName = async (e) => {
    e.preventDefault();
    setNameMsg(null);
    if (!fullName.trim()) {
      setNameMsg({ ok: false, text: "Ism-familiya bo'sh bo'lishi mumkin emas." });
      return;
    }
    setBusy(true);
    try {
      const supabase = createClient();
      const { error } = await supabase
        .from("profiles").update({ full_name: fullName.trim() }).eq("id", userId);
      if (error) throw error;
      setNameMsg({ ok: true, text: "Ism-familiya saqlandi." });
      window.dispatchEvent(
        new CustomEvent("greenedu:profile-updated", { detail: { fullName: fullName.trim() } })
      );
    } catch {
      setNameMsg({ ok: false, text: "Saqlashda xatolik yuz berdi." });
    } finally {
      setBusy(false);
    }
  };

  const savePassword = async (e) => {
    e.preventDefault();
    setPwMsg(null);
    if (pw.next.length < 6) {
      setPwMsg({ ok: false, text: "Yangi parol kamida 6 ta belgidan iborat bo'lsin." });
      return;
    }
    if (pw.next !== pw.confirm) {
      setPwMsg({ ok: false, text: "Parollar bir-biriga mos kelmadi." });
      return;
    }
    setBusy(true);
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.updateUser({ password: pw.next });
      if (error) throw error;
      setPw({ next: "", confirm: "" });
      setPwMsg({ ok: true, text: "Parol yangilandi." });
    } catch (err) {
      setPwMsg({
        ok: false,
        text: err?.message?.includes("different from the old")
          ? "Yangi parol eskisidan farq qilishi kerak."
          : "Parolni yangilashda xatolik yuz berdi.",
      });
    } finally {
      setBusy(false);
    }
  };

  if (loading) {
    return (
      <>
        <SkeletonPageHead />
        <div className="card" style={{ padding: 22, maxWidth: 560 }}>
          <div className="sk" style={{ width: 74, height: 74, borderRadius: 999, marginBottom: 16 }} />
          <div className="sk sk-line" style={{ width: "60%" }} />
          <div className="sk sk-line" style={{ width: "80%" }} />
        </div>
      </>
    );
  }

  return (
    <>
      <div className="page-head">
        <div>
          <h1 className="page-title">Sozlamalar</h1>
          <p className="page-sub">Profil ma'lumotlari va parolni boshqaring.</p>
        </div>
      </div>

      <div style={{ display: "grid", gap: 16, maxWidth: 560 }}>
        <form className="card card-pad" onSubmit={saveName} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <h2 className="panel-title">Profil</h2>

          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            {avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={avatarUrl} alt="Profil rasmi"
                style={{ width: 64, height: 64, borderRadius: 999, objectFit: "cover", border: "2px solid var(--moss-line)" }}
              />
            ) : (
              <span className="avatar" style={{ width: 64, height: 64, fontSize: 24 }}>
                {(fullName || "?").charAt(0).toUpperCase()}
              </span>
            )}
            <div>
              <label className="btn btn-ghost btn-sm" style={{ cursor: "pointer" }}>
                {avatarBusy ? "Yuklanmoqda..." : "Rasmni tanlash"}
                <input
                  type="file" accept="image/*" hidden
                  onChange={uploadAvatar} disabled={avatarBusy}
                />
              </label>
              <p style={{ fontSize: 12, color: "var(--ink-faint)", margin: "6px 0 0" }}>
                JPG, PNG yoki WEBP · 3 MB gacha
              </p>
            </div>
          </div>
          {avatarMsg && (
            <p className={avatarMsg.ok ? "form-ok" : "form-error"}>{avatarMsg.text}</p>
          )}

          <div className="field">
            <label htmlFor="email">Email</label>
            <input id="email" className="input" value={email} disabled />
          </div>
          <div className="field">
            <label htmlFor="fullName">Ism-familiya</label>
            <input
              id="fullName" className="input" value={fullName}
              onChange={(e) => setFullName(e.target.value)}
            />
          </div>
          {nameMsg && (
            <p className={nameMsg.ok ? "form-ok" : "form-error"}>{nameMsg.text}</p>
          )}
          <div>
            <button type="submit" className="btn btn-primary" disabled={busy}>
              O'zgarishlarni saqlash
            </button>
          </div>
        </form>

        <form className="card card-pad" onSubmit={savePassword} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <h2 className="panel-title">Parolni almashtirish</h2>
          <PasswordInput
            label="Yangi parol"
            id="pw1"
            value={pw.next}
            onChange={(e) => setPw((prev) => ({ ...prev, next: e.target.value }))}
            autoComplete="new-password"
            placeholder="Kamida 6 belgi"
          />
          <PasswordInput
            label="Yangi parolni tasdiqlang"
            id="pw2"
            value={pw.confirm}
            onChange={(e) => setPw((prev) => ({ ...prev, confirm: e.target.value }))}
            autoComplete="new-password"
          />
          {pwMsg && <p className={pwMsg.ok ? "form-ok" : "form-error"}>{pwMsg.text}</p>}
          <div>
            <button type="submit" className="btn btn-primary" disabled={busy}>
              Parolni yangilash
            </button>
          </div>
        </form>
      </div>
    </>
  );
}
