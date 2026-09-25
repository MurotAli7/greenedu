"use client";

import { useCallback, useEffect, useState, use } from "react";
import Link from "next/link";
import Modal from "@/components/Modal";
import { PlusIcon, EditIcon, TrashIcon } from "@/components/Icons";
import { SkeletonPageHead, SkeletonTable } from "@/components/Skeleton";
import { createClient } from "@/lib/supabase/client";
import { apiFetch } from "@/lib/api/client";
import { useCachedApi, invalidateCache } from "@/lib/api/useCached";
import { LESSON_TYPE_LABELS } from "@/lib/constants";

const EMPTY_FORM = {
  title: "",
  summary: "",
  content: "",
  lessonType: "text",
  embedUrl: "",
  modelUrl: "",
  testUrl: "",
  xpReward: 10,
  sortOrder: "",
};

export default function AdminCourseLessonsPage({ params }) {
  const { id } = use(params);

  const [course, setCourse] = useState(null);
  const [lessons, setLessons] = useState([]);

  const [modal, setModal] = useState(null); // { type: 'create'|'edit'|'delete', lesson? }
  const [form, setForm] = useState(EMPTY_FORM);
  const [busy, setBusy] = useState(false);
  const [modalError, setModalError] = useState("");
  const [uploading, setUploading] = useState(null); // 'model' | 'test' | null
  const [uploadPct, setUploadPct] = useState(0);
  const [orderError, setOrderError] = useState("");

  // Kesh: kurslar ro'yxatidan darslarga kirib-chiqishda darhol ochiladi
  const { data: pageData, loading, error } = useCachedApi(
    `/api/admin/courses/${id}/lessons`
  );

  useEffect(() => {
    if (!pageData) return;
    setCourse(pageData.course);
    setLessons(pageData.lessons || []);
  }, [pageData]);

  const setF = (name, value) => setForm((prev) => ({ ...prev, [name]: value }));

  const openCreate = () => {
    setForm(EMPTY_FORM);
    setModal({ type: "create" });
    setModalError("");
  };

  const openEdit = (lesson) => {
    setForm({
      title: lesson.title || "",
      summary: lesson.summary || "",
      content: lesson.content || "",
      lessonType: lesson.lesson_type,
      embedUrl: lesson.embed_url || "",
      modelUrl: lesson.model_url || "",
      testUrl: lesson.test_url || "",
      xpReward: lesson.xp_reward,
      sortOrder: lesson.sort_order,
    });
    setModal({ type: "edit", lesson });
    setModalError("");
  };

  /**
   * Fayl brauzerdan to'g'ridan-to'g'ri Supabase Storage'ga yuklanadi.
   * Server faqat imzolangan havola beradi — katta .glb fayllar ham o'tadi.
   */
  const uploadFile = async (e, kind) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    setUploading(kind);
    setUploadPct(0);
    setModalError("");

    try {
      // 1) Imzolangan yuklash havolasini olamiz
      const json = await apiFetch("/api/admin/upload", {
        method: "POST",
        body: { kind, fileName: file.name, fileSize: file.size },
      });

      // 2) Faylni to'g'ridan-to'g'ri Storage'ga yuklaymiz
      const supabase = createClient();
      const { error: upError } = await supabase.storage
        .from(json.bucket)
        .uploadToSignedUrl(json.path, json.token, file, {
          contentType: json.contentType,
        });
      if (upError) throw new Error(upError.message || "Faylni yuklab bo'lmadi.");

      setF(kind === "model" ? "modelUrl" : "testUrl", json.publicUrl);
      setUploadPct(100);
    } catch (err) {
      setModalError(
        err.message?.includes("Failed to fetch")
          ? "Internet aloqasi uzildi yoki fayl juda katta. Qaytadan urinib ko'ring."
          : err.message
      );
    } finally {
      setUploading(null);
    }
  };


  // Darsni yuqoriga/pastga surish — sort_order almashtiriladi
  const moveLesson = async (index, dir) => {
    const target = index + dir;
    if (target < 0 || target >= lessons.length) return;
    const a = lessons[index];
    const b = lessons[target];

    // Optimistik yangilash: darhol o'rin almashadi
    const next = [...lessons];
    next[index] = { ...b, sort_order: a.sort_order };
    next[target] = { ...a, sort_order: b.sort_order };
    setLessons(next);

    try {
      await Promise.all([
        apiFetch(`/api/admin/lessons/${a.id}`, {
          method: "PATCH",
          body: { sortOrder: b.sort_order },
        }),
        apiFetch(`/api/admin/lessons/${b.id}`, {
          method: "PATCH",
          body: { sortOrder: a.sort_order },
        }),
      ]);
    } catch {
      setLessons(lessons); // xato bo'lsa qaytaramiz
      setOrderError("Tartibni saqlashda xatolik. Qaytadan urinib ko'ring.");
      setTimeout(() => setOrderError(""), 4000);
    }
  };

  const save = async () => {
    if (!form.title.trim()) {
      setModalError("Dars nomi kiritilishi shart.");
      return;
    }
    setBusy(true);
    setModalError("");
    try {
      const isEdit = modal.type === "edit";
      const json = await apiFetch(
        isEdit ? `/api/admin/lessons/${modal.lesson.id}` : `/api/admin/courses/${id}/lessons`,
        {
          method: isEdit ? "PATCH" : "POST",
          body: {
            title: form.title.trim(),
            summary: form.summary.trim(),
            content: form.content.trim(),
            lessonType: form.lessonType,
            embedUrl: form.embedUrl.trim(),
            modelUrl: form.modelUrl.trim(),
            testUrl: form.testUrl.trim(),
            xpReward: form.xpReward,
            sortOrder: form.sortOrder,
          },
        }
      );
      if (isEdit) {
        setLessons((prev) =>
          prev
            .map((l) => (l.id === modal.lesson.id ? json.lesson : l))
            .sort((a, b) => a.sort_order - b.sort_order)
        );
      } else {
        setLessons((prev) =>
          [...prev, json.lesson].sort((a, b) => a.sort_order - b.sort_order)
        );
      }
      setModal(null);
    } catch (err) {
      setModalError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const confirmDelete = async () => {
    setBusy(true);
    setModalError("");
    try {
      await apiFetch(`/api/admin/lessons/${modal.lesson.id}`, { method: "DELETE" });
      setLessons((prev) => prev.filter((l) => l.id !== modal.lesson.id));
      invalidateCache("/api/admin/courses");
      setModal(null);
    } catch (err) {
      setModalError(err.message);
    } finally {
      setBusy(false);
    }
  };

  if (loading) {
    return (
      <>
        <SkeletonPageHead />
        <SkeletonTable rows={5} cols={4} />
      </>
    );
  }
  if (error) return <p className="form-error" role="alert">{error}</p>;
  if (!course) return <p className="state-note card">Kurs topilmadi.</p>;

  return (
    <>
      <p style={{ marginBottom: 14 }}>
        <Link href="/admin/courses" style={{ color: "var(--ink-soft)", fontSize: 13.5, textDecoration: "none" }}>
          ← Kurslar ro'yxati
        </Link>
      </p>

      <header className="page-head">
        <div>
          <h1 className="page-title">{course.title}</h1>
          <p className="page-sub">Darslar tartibi, XP miqdori va AR/VR havolalarini boshqaring.</p>
        </div>
        <button type="button" className="btn btn-primary" onClick={openCreate}>
          <PlusIcon /> Yangi dars
        </button>
      </header>

      <div className="card tablewrap">
        <table className="table">
          <thead>
            <tr>
              <th scope="col" style={{ width: 70 }}>Tartib</th>
              <th scope="col">Dars</th>
              <th scope="col">Turi</th>
              <th scope="col">Kontent</th>
              <th scope="col">XP</th>
              <th scope="col" style={{ textAlign: "right" }}>Amallar</th>
            </tr>
          </thead>
          <tbody>
            {lessons.length === 0 && (
              <tr>
                <td colSpan={6} className="empty">
                  <p style={{ marginTop: 0, marginBottom: 14 }}>
                    Bu kursda hali dars yo'q. O'quvchi kursni ochsa, bo'sh sahifa ko'radi.
                  </p>
                  <button type="button" className="btn btn-primary" onClick={openCreate}>
                    <PlusIcon /> Birinchi darsni qo'shish
                  </button>
                </td>
              </tr>
            )}
            {lessons.map((l, idx) => (
              <tr key={l.id}>
                <td>
                  <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                    <span className="rank-num" style={{ width: 20 }}>{idx + 1}</span>
                    <span style={{ display: "inline-flex", flexDirection: "column", gap: 2 }}>
                      <button
                        type="button" className="order-btn"
                        onClick={() => moveLesson(idx, -1)}
                        disabled={idx === 0}
                        aria-label="Yuqoriga surish"
                      >
                        ▲
                      </button>
                      <button
                        type="button" className="order-btn"
                        onClick={() => moveLesson(idx, 1)}
                        disabled={idx === lessons.length - 1}
                        aria-label="Pastga surish"
                      >
                        ▼
                      </button>
                    </span>
                  </div>
                </td>
                <td>
                  <div className="cell-name">{l.title}</div>
                  {l.summary && <div className="cell-sub">{l.summary}</div>}
                </td>
                <td>
                  <span className={`chip ${l.lesson_type === "vr" ? "chip-sky" : l.lesson_type === "ar" ? "chip-amber" : "chip-gray"}`}>
                    {LESSON_TYPE_LABELS[l.lesson_type] || l.lesson_type}
                  </span>
                </td>
                <td>
                  <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
                    {l.content && <span className="chip chip-gray">Matn</span>}
                    {l.model_url && <span className="chip chip-amber">3D</span>}
                    {l.embed_url && <span className="chip chip-sky">Embed</span>}
                    {l.test_url && <span className="chip chip-violet">Test</span>}
                    {!l.content && !l.model_url && !l.embed_url && !l.test_url && (
                      <span className="chip chip-red">Bo'sh</span>
                    )}
                  </div>
                </td>
                <td><span className="xp-pill">+{l.xp_reward}</span></td>
                <td style={{ textAlign: "right" }}>
                  <div style={{ display: "inline-flex", gap: 7 }}>
                    <button
                      type="button" className="iconbtn"
                      onClick={() => openEdit(l)}
                      aria-label={`${l.title}ni tahrirlash`}
                    >
                      <EditIcon />
                    </button>
                    <button
                      type="button" className="iconbtn is-danger"
                      onClick={() => { setModal({ type: "delete", lesson: l }); setModalError(""); }}
                      aria-label={`${l.title}ni o'chirish`}
                    >
                      <TrashIcon />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {(modal?.type === "create" || modal?.type === "edit") && (
        <Modal
          title={modal.type === "create" ? "Yangi dars" : "Darsni tahrirlash"}
          onClose={() => setModal(null)}
          footer={
            <>
              <button type="button" className="btn btn-ghost" onClick={() => setModal(null)}>
                Bekor qilish
              </button>
              <button type="button" className="btn btn-primary" onClick={save} disabled={busy}>
                {busy ? "Saqlanmoqda..." : modal.type === "create" ? "Qo'shish" : "Saqlash"}
              </button>
            </>
          }
        >
          <div className="field">
            <label htmlFor="ls-title">Dars nomi *</label>
            <input
              id="ls-title" className="input" value={form.title}
              onChange={(e) => setF("title", e.target.value)}
              placeholder="Masalan: Oziq zanjirlari"
            />
          </div>
          <div className="field">
            <label htmlFor="ls-sum">Qisqacha mazmuni</label>
            <textarea
              id="ls-sum" className="textarea" value={form.summary}
              onChange={(e) => setF("summary", e.target.value)}
              placeholder="Bir-ikki jumlada dars mazmuni"
            />
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div className="field">
              <label htmlFor="ls-type">Dars turi</label>
              <select
                id="ls-type" className="select" value={form.lessonType}
                onChange={(e) => setF("lessonType", e.target.value)}
              >
                <option value="text">Matnli dars</option>
                <option value="ar">AR modul</option>
                <option value="vr">VR modul</option>
              </select>
            </div>
            <div className="field">
              <label htmlFor="ls-xp">XP mukofoti</label>
              <input
                id="ls-xp" type="number" min="1" className="input" value={form.xpReward}
                onChange={(e) => setF("xpReward", e.target.value)}
              />
            </div>
          </div>
          <div className="field">
            <label htmlFor="ls-content">Maruza matni (o'quvchi darsda o'qiydi)</label>
            <textarea
              id="ls-content" className="textarea" value={form.content}
              onChange={(e) => setF("content", e.target.value)}
              placeholder="Dars bo'yicha maruzaviy matn. Xatboshilar saqlanadi."
              style={{ minHeight: 130 }}
            />
          </div>

          <div className="field">
            <label htmlFor="ls-embed">Tashqi embed havola (Sketchfab / CoSpaces / Assemblr / YouTube 360)</label>
            <input
              id="ls-embed" className="input" value={form.embedUrl}
              onChange={(e) => setF("embedUrl", e.target.value)}
              placeholder="https://sketchfab.com/models/.../embed"
            />
          </div>

          <div className="field">
            <label>3D model fayli (.glb) — o'zingiz yaratgan VR/AR kontent</label>
            <p className="file-hint">120 MB gacha. Blender'dan "glTF Binary (.glb)" formatida eksport qiling.</p>
            {form.modelUrl ? (
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span className="chip chip-amber">Model yuklandi</span>
                <a href={form.modelUrl} target="_blank" rel="noopener noreferrer" className="btn btn-ghost btn-sm">
                  Tekshirish
                </a>
                <button type="button" className="btn btn-ghost btn-sm" onClick={() => setF("modelUrl", "")}>
                  Olib tashlash
                </button>
              </div>
            ) : (
              <label className="btn btn-ghost btn-sm" style={{ cursor: "pointer", alignSelf: "flex-start" }}>
                {uploading === "model" ? "Yuklanmoqda, kuting..." : "GLB fayl tanlash"}
                <input
                  type="file" accept=".glb,.gltf" hidden
                  onChange={(e) => uploadFile(e, "model")}
                  disabled={uploading !== null}
                />
              </label>
            )}
          </div>

          

          <div className="field" style={{ maxWidth: 160 }}>
            <label htmlFor="ls-order">Tartib raqami</label>
            <input
              id="ls-order" type="number" min="1" className="input" value={form.sortOrder}
              onChange={(e) => setF("sortOrder", e.target.value)}
              placeholder="Avto"
            />
          </div>
          {modalError && <p className="form-error" role="alert">{modalError}</p>}
        </Modal>
      )}

      {modal?.type === "delete" && (
        <Modal
          title="Darsni o'chirish"
          onClose={() => setModal(null)}
          footer={
            <>
              <button type="button" className="btn btn-ghost" onClick={() => setModal(null)}>
                Bekor qilish
              </button>
              <button type="button" className="btn btn-danger" onClick={confirmDelete} disabled={busy}>
                {busy ? "O'chirilmoqda..." : "Ha, o'chirish"}
              </button>
            </>
          }
        >
          <p style={{ margin: 0, fontSize: 14.5 }}>
            <strong>{modal.lesson.title}</strong> darsi o'chirilsinmi?
          </p>
          <p style={{ margin: 0, fontSize: 13.5, color: "var(--ink-soft)" }}>
            O'quvchilarning bu dars bo'yicha progress yozuvlari ham o'chadi.
          </p>
          {modalError && <p className="form-error" role="alert">{modalError}</p>}
        </Modal>
      )}
    </>
  );
}
