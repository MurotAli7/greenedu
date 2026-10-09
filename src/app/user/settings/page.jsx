"use client";

import {
  useEffect,
  useMemo,
  useState,
} from "react";

import { createClient } from "@/lib/supabase/client";

import { useUserData } from "../UserDataProvider";

import { SkeletonPageHead } from "@/components/Skeleton";

import PasswordInput from "@/components/PasswordInput";

export default function SettingsPage() {
  const supabase = useMemo(
    () => createClient(),
    []
  );

  /*
   * User va profile UserDataProvider'dan olinadi.
   *
   * Shuning uchun Settings sahifasiga har kirganda:
   *
   * auth.getUser()
   * profiles select
   *
   * qaytadan ishlamaydi.
   */
  const {
    user,
    profile,
    profileLoading,
    updateProfile,
  } = useUserData();

  const userId = user?.id || null;

  const email = user?.email || "";

  const [fullName, setFullName] = useState("");

  const [avatarUrl, setAvatarUrl] = useState("");

  const [avatarMsg, setAvatarMsg] =
    useState(null);

  const [nameMsg, setNameMsg] =
    useState(null);

  const [pwMsg, setPwMsg] =
    useState(null);

  const [avatarBusy, setAvatarBusy] =
    useState(false);

  const [nameBusy, setNameBusy] =
    useState(false);

  const [passwordBusy, setPasswordBusy] =
    useState(false);

  const [pw, setPw] = useState({
    next: "",
    confirm: "",
  });

  /*
   * Provider'dagi profile kelganda
   * form ma'lumotlarini yangilaymiz.
   */
  useEffect(() => {
    if (!profile) return;

    setFullName(
      profile.full_name || ""
    );

    setAvatarUrl(
      profile.avatar_url || ""
    );
  }, [profile]);

  /*
   * Profil bosh harfi
   */
  const initials = (
    fullName ||
    email ||
    "?"
  )
    .trim()
    .charAt(0)
    .toUpperCase();

  /*
   * =====================================================
   * AVATAR UPLOAD
   * =====================================================
   */

  const uploadAvatar = async (e) => {
    const file =
      e.target.files?.[0];

    /*
     * Bir xil faylni yana tanlash mumkin
     */
    e.target.value = "";

    if (!file || !userId) {
      return;
    }

    setAvatarMsg(null);

    /*
     * Fayl turi
     */
    if (!file.type.startsWith("image/")) {
      setAvatarMsg({
        ok: false,
        text: "Faqat JPG, PNG yoki WEBP rasm yuklang.",
      });

      return;
    }

    /*
     * 3 MB limit
     */
    if (
      file.size >
      3 * 1024 * 1024
    ) {
      setAvatarMsg({
        ok: false,
        text: "Rasm hajmi 3 MB dan katta bo'lmasin.",
      });

      return;
    }

    setAvatarBusy(true);

    try {
      const ext =
        file.name
          .split(".")
          .pop()
          ?.toLowerCase() ||
        "jpg";

      const path =
        `${userId}/avatar.${ext}`;

      /*
       * Supabase Storage
       */
      const {
        error: uploadError,
      } = await supabase.storage
        .from("avatars")
        .upload(
          path,
          file,
          {
            upsert: true,
            contentType:
              file.type,
            cacheControl:
              "31536000",
          }
        );

      if (uploadError) {
        throw uploadError;
      }

      /*
       * Public URL
       */
      const {
        data: publicData,
      } = supabase.storage
        .from("avatars")
        .getPublicUrl(path);

      const url =
        `${publicData.publicUrl}?v=${Date.now()}`;

      /*
       * Profile jadvalini yangilash
       */
      const {
        error: profileError,
      } = await supabase
        .from("profiles")
        .update({
          avatar_url: url,
        })
        .eq("id", userId);

      if (profileError) {
        throw profileError;
      }

      /*
       * Local state
       */
      setAvatarUrl(url);

      /*
       * Provider state
       */
      updateProfile({
        avatar_url: url,
      });

      setAvatarMsg({
        ok: true,
        text: "Profil rasmi yangilandi.",
      });
    } catch (error) {
      setAvatarMsg({
        ok: false,
        text:
          error?.message?.includes(
            "Bucket not found"
          )
            ? "Storage sozlanmagan. Supabase Storage'dagi avatars bucketini tekshiring."
            : "Rasm yuklashda xatolik yuz berdi.",
      });
    } finally {
      setAvatarBusy(false);
    }
  };

  /*
   * =====================================================
   * NAME SAVE
   * =====================================================
   */

  const saveName = async (e) => {
    e.preventDefault();

    setNameMsg(null);

    const cleanName =
      fullName.trim();

    if (!cleanName) {
      setNameMsg({
        ok: false,
        text: "Ism-familiya bo'sh bo'lishi mumkin emas.",
      });

      return;
    }

    if (!userId) return;

    setNameBusy(true);

    try {
      const { error } =
        await supabase
          .from("profiles")
          .update({
            full_name: cleanName,
          })
          .eq("id", userId);

      if (error) {
        throw error;
      }

      /*
       * Local state
       */
      setFullName(cleanName);

      /*
       * Provider state
       */
      updateProfile({
        full_name: cleanName,
      });

      setNameMsg({
        ok: true,
        text: "Ism-familiya saqlandi.",
      });
    } catch {
      setNameMsg({
        ok: false,
        text: "Saqlashda xatolik yuz berdi.",
      });
    } finally {
      setNameBusy(false);
    }
  };

  /*
   * =====================================================
   * PASSWORD
   * =====================================================
   */

  const savePassword = async (e) => {
    e.preventDefault();

    setPwMsg(null);

    if (pw.next.length < 6) {
      setPwMsg({
        ok: false,
        text: "Yangi parol kamida 6 ta belgidan iborat bo'lsin.",
      });

      return;
    }

    if (pw.next !== pw.confirm) {
      setPwMsg({
        ok: false,
        text: "Parollar bir-biriga mos kelmadi.",
      });

      return;
    }

    setPasswordBusy(true);

    try {
      const { error } =
        await supabase.auth.updateUser({
          password: pw.next,
        });

      if (error) {
        throw error;
      }

      setPw({
        next: "",
        confirm: "",
      });

      setPwMsg({
        ok: true,
        text: "Parol muvaffaqiyatli yangilandi.",
      });
    } catch (error) {
      setPwMsg({
        ok: false,
        text:
          error?.message?.includes(
            "different from the old"
          )
            ? "Yangi parol eskisidan farq qilishi kerak."
            : "Parolni yangilashda xatolik yuz berdi.",
      });
    } finally {
      setPasswordBusy(false);
    }
  };

  /*
   * =====================================================
   * LOADING
   * =====================================================
   */

  if (
    profileLoading &&
    !profile
  ) {
    return (
      <div className="settings-loading">

        <SkeletonPageHead />

        <div className="settings-skeleton-grid">

          <div className="card settings-skeleton-card">

            <div className="sk settings-skeleton-avatar" />

            <div className="sk sk-line settings-skeleton-line" />

            <div className="sk sk-line settings-skeleton-line short" />

            <div className="sk settings-skeleton-input" />

            <div className="sk settings-skeleton-input" />

          </div>

          <div className="card settings-skeleton-card">

            <div className="sk sk-line settings-skeleton-line" />

            <div className="sk settings-skeleton-input" />

            <div className="sk settings-skeleton-input" />

            <div className="sk settings-skeleton-button" />

          </div>

        </div>

      </div>
    );
  }

  return (
    <main className="settings-page">

      {/* =====================================================
          HEADER
      ===================================================== */}

      <header className="settings-header">

        <div
          className="settings-header-icon"
          aria-hidden="true"
        >
          ⚙
        </div>

        <div>

          <h1 className="page-title">
            Sozlamalar
          </h1>

          <p className="page-sub">
            Profil ma'lumotlari va hisob xavfsizligini boshqaring.
          </p>

        </div>

      </header>

      <div className="settings-layout">

        {/* =====================================================
            PROFILE
        ===================================================== */}

        <section className="card settings-card">

          <div className="settings-card-head">

            <div>

              <h2 className="panel-title">
                Profil
              </h2>

              <p className="settings-card-description">
                Ism-familiyangiz va profil rasmingizni yangilang.
              </p>

            </div>

          </div>

          <form onSubmit={saveName}>

            {/* Avatar */}

            <div className="settings-profile">

              <div className="settings-avatar-wrap">

                {avatarUrl ? (

                  <img
                    src={avatarUrl}
                    alt="GreenEdu profil rasmi"
                    className="settings-avatar"
                    width="80"
                    height="80"
                    loading="lazy"
                    decoding="async"
                  />

                ) : (

                  <div
                    className="settings-avatar settings-avatar-placeholder"
                    aria-label="Profil rasmi mavjud emas"
                  >
                    {initials}
                  </div>

                )}

              </div>

              <div className="settings-profile-info">

                <strong>
                  {fullName ||
                    "GreenEdu foydalanuvchisi"}
                </strong>

                <span>
                  Profil rasmini o'zgartirish mumkin
                </span>

                <label
                  className="settings-upload"
                  htmlFor="avatar-upload"
                >
                  {avatarBusy
                    ? "Yuklanmoqda..."
                    : "Rasmni tanlash"}

                  <input
                    id="avatar-upload"
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    hidden
                    onChange={uploadAvatar}
                    disabled={avatarBusy}
                  />
                </label>

                <small>
                  JPG, PNG yoki WEBP · 3 MB gacha
                </small>

              </div>

            </div>

            {avatarMsg && (
              <div
                className={`settings-message ${
                  avatarMsg.ok
                    ? "settings-message-success"
                    : "settings-message-error"
                }`}
                role="status"
              >
                {avatarMsg.text}
              </div>
            )}

            {/* Email */}

            <div className="settings-field">

              <label htmlFor="settings-email">
                Email
              </label>

              <input
                id="settings-email"
                className="input settings-input"
                type="email"
                value={email}
                disabled
                autoComplete="email"
              />

              <small>
                Email manzili hisobingizga bog'langan.
              </small>

            </div>

            {/* Full name */}

            <div className="settings-field">

              <label htmlFor="settings-full-name">
                Ism-familiya
              </label>

              <input
                id="settings-full-name"
                className="input settings-input"
                type="text"
                value={fullName}
                onChange={(e) =>
                  setFullName(
                    e.target.value
                  )
                }
                placeholder="Masalan: Murotali Aliyev"
                autoComplete="name"
                maxLength={100}
              />

            </div>

            {nameMsg && (
              <div
                className={`settings-message ${
                  nameMsg.ok
                    ? "settings-message-success"
                    : "settings-message-error"
                }`}
                role="status"
              >
                {nameMsg.text}
              </div>
            )}

            <div className="settings-actions">

              <button
                type="submit"
                className="btn btn-primary settings-submit"
                disabled={nameBusy}
              >
                {nameBusy
                  ? "Saqlanmoqda..."
                  : "O'zgarishlarni saqlash"}
              </button>

            </div>

          </form>

        </section>

        {/* =====================================================
            PASSWORD
        ===================================================== */}

        <section className="card settings-card settings-security-card">

          <div className="settings-card-head">

            <div>

              <div
                className="settings-section-icon"
                aria-hidden="true"
              >
                🔒
              </div>

              <h2 className="panel-title">
                Parol va xavfsizlik
              </h2>

              <p className="settings-card-description">
                Hisobingizni himoyalash uchun kuchli paroldan foydalaning.
              </p>

            </div>

          </div>

          <form onSubmit={savePassword}>

            <div className="settings-password-note">

              <strong>
                Yaxshi parol qanday bo'ladi?
              </strong>

              <ul>
                <li>
                  Kamida 6 ta belgidan iborat
                </li>

                <li>
                  Taxmin qilish qiyin bo'lgan
                </li>

                <li>
                  Boshqa saytlardagi paroldan farqli
                </li>
              </ul>

            </div>

            <div className="settings-password-fields">

              <PasswordInput
                label="Yangi parol"
                id="settings-password"
                value={pw.next}
                onChange={(e) =>
                  setPw((prev) => ({
                    ...prev,
                    next: e.target.value,
                  }))
                }
                autoComplete="new-password"
                placeholder="Kamida 6 belgi"
              />

              <PasswordInput
                label="Yangi parolni tasdiqlang"
                id="settings-password-confirm"
                value={pw.confirm}
                onChange={(e) =>
                  setPw((prev) => ({
                    ...prev,
                    confirm:
                      e.target.value,
                  }))
                }
                autoComplete="new-password"
                placeholder="Parolni qayta kiriting"
              />

            </div>

            {pwMsg && (
              <div
                className={`settings-message ${
                  pwMsg.ok
                    ? "settings-message-success"
                    : "settings-message-error"
                }`}
                role="status"
              >
                {pwMsg.text}
              </div>
            )}

            <div className="settings-actions">

              <button
                type="submit"
                className="btn btn-primary settings-submit"
                disabled={passwordBusy}
              >
                {passwordBusy
                  ? "Yangilanmoqda..."
                  : "Parolni yangilash"}
              </button>

            </div>

          </form>

        </section>

      </div>

    </main>
  );
}