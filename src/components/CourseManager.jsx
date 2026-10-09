"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import Modal from "@/components/Modal";
import {
  PlusIcon,
  EditIcon,
  TrashIcon,
  BookIcon,
  SearchIcon,
  ArrowRightIcon,
} from "@/components/Icons";
import { SkeletonPageHead, SkeletonTable } from "@/components/Skeleton";
import { STATUS_LABELS, STATUS_CHIPS } from "@/lib/constants";
import { apiFetch } from "@/lib/api/client";
import { useCachedApi } from "@/lib/api/useCached";

const COURSES_URL = "/api/admin/courses?type=course";

const EMPTY_FORM = {
  title: "",
  description: "",
  category: "",
  status: "active",
  embedUrl: "",
  recommended: false,
};

function normalizeTitle(value = "") {
  return value.replace(/\s+/g, " ").trim().toLocaleLowerCase();
}

function formatDate(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  return new Intl.DateTimeFormat("uz-UZ", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
}

export default function CourseManager() {
  const { data, loading, error, mutate, refresh } = useCachedApi(COURSES_URL);
  const courses = Array.isArray(data?.courses) ? data.courses : [];

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [busy, setBusy] = useState(false);
  const [modalError, setModalError] = useState("");
  const [notice, setNotice] = useState("");
  const [noticeCourse, setNoticeCourse] = useState(null);

  const filteredCourses = useMemo(() => {
    const query = normalizeTitle(search);

    return courses.filter((course) => {
      const matchesSearch =
        !query ||
        normalizeTitle(course.title).includes(query) ||
        normalizeTitle(course.category || "").includes(query) ||
        normalizeTitle(course.description || "").includes(query);
      const matchesStatus = statusFilter === "all" || course.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [courses, search, statusFilter]);

  const openCreate = () => {
    setForm({ ...EMPTY_FORM });
    setModal({ type: "create" });
    setModalError("");
    setNotice("");
    setNoticeCourse(null);
  };

  const openEdit = (course) => {
    setForm({
      title: course.title || "",
      description: course.description || "",
      category: course.category || "",
      status: course.status || "active",
      embedUrl: course.embed_url || "",
      recommended: Boolean(course.recommended_for_new_users),
    });
    setModal({ type: "edit", course });
    setModalError("");
    setNotice("");
    setNoticeCourse(null);
  };

  const closeModal = () => {
    if (busy) return;
    setModal(null);
    setModalError("");
    setForm({ ...EMPTY_FORM });
  };

  const setField = (field, value) => {
    setForm((current) => ({ ...current, [field]: value }));
    if (modalError) setModalError("");
  };

  const saveCourse = async (event) => {
    event?.preventDefault();
    const title = form.title.replace(/\s+/g, " ").trim();
    const description = form.description.trim();
    const category = form.category.replace(/\s+/g, " ").trim();
    const isEdit = modal?.type === "edit";

    if (title.length < 2) {
      setModalError("Kurs nomi kamida 2 ta belgidan iborat bo'lishi kerak.");
      return;
    }

    const duplicate = courses.find((course) => {
      if (isEdit && course.id === modal.course.id) return false;
      return normalizeTitle(course.title) === normalizeTitle(title);
    });

    if (duplicate) {
      setModalError(`“${duplicate.title}” nomli kurs allaqachon mavjud.`);
      return;
    }

    setBusy(true);
    setModalError("");

    const payload = {
      title,
      description,
      category,
      contentType: "course",
      status: form.status,
      embedUrl: form.embedUrl.trim(),
      recommended: Boolean(form.recommended),
    };

    try {
      if (isEdit) {
        const result = await apiFetch(`/api/admin/courses/${modal.course.id}`, {
          method: "PATCH",
          body: payload,
        });
        const updated = result?.course;

        if (!updated) throw new Error("Server yangilangan kursni qaytarmadi.");

        mutate((previous) => ({
          ...(previous || {}),
          courses: (previous?.courses || []).map((course) =>
            course.id === updated.id ? { ...course, ...updated } : course
          ),
        }));
        setNotice("Kurs ma'lumotlari saqlandi.");
        setNoticeCourse(null);
      } else {
        const result = await apiFetch("/api/admin/courses", {
          method: "POST",
          body: payload,
        });
        const created = result?.course;

        if (!created?.id) throw new Error("Server yangi kurs ma'lumotini qaytarmadi.");

        mutate((previous) => ({
          ...(previous || {}),
          courses: [created, ...(previous?.courses || []).filter((item) => item.id !== created.id)],
        }));
        setNotice(`“${created.title}” kursi yaratildi. Endi unga dars va material qo‘shishingiz mumkin.`);
        setNoticeCourse(created);
      }

      setModal(null);
      setForm({ ...EMPTY_FORM });
    } catch (err) {
      setModalError(err?.message || "Kursni saqlashda xatolik yuz berdi.");
    } finally {
      setBusy(false);
    }
  };

  const deleteCourse = async () => {
    if (!modal?.course || busy) return;

    setBusy(true);
    setModalError("");

    try {
      await apiFetch(`/api/admin/courses/${modal.course.id}`, { method: "DELETE" });

      mutate((previous) => ({
        ...(previous || {}),
        courses: (previous?.courses || []).filter((course) => course.id !== modal.course.id),
      }));

      setModal(null);
      setNotice(`“${modal.course.title}” kursi o‘chirildi.`);
      setNoticeCourse(null);
    } catch (err) {
      setModalError(err?.message || "Kursni o'chirishda xatolik yuz berdi.");
    } finally {
      setBusy(false);
    }
  };

  if (loading && !data) {
    return (
      <div className="admin-courses-page">
        <SkeletonPageHead />
        <SkeletonTable rows={4} cols={3} />
      </div>
    );
  }

  return (
    <section className="admin-courses-page">
      <header className="admin-courses-hero">
        <div className="admin-courses-title-wrap">
          <span className="admin-courses-eyebrow">KONTENT MARKAZI</span>
          <h1 className="admin-courses-title">Kurslar</h1>
          <p className="admin-courses-subtitle">
            Kurs yarating, ma'lumotlarini tahrirlang va dars materiallarini bitta joydan boshqaring.
          </p>
          <div className="admin-courses-summary" aria-live="polite">
            <span className="admin-courses-summary-dot" />
            <strong>{courses.length}</strong> ta kurs ro‘yxatda
          </div>
        </div>

        <button type="button" className="btn btn-primary admin-create-button" onClick={openCreate}>
          <PlusIcon />
          Yangi kurs
        </button>
      </header>

      {error && (
        <div className="admin-alert admin-alert-error" role="alert">
          <span>{error}</span>
          <button type="button" className="btn btn-ghost btn-sm" onClick={() => refresh()}>
            Qayta urinish
          </button>
        </div>
      )}

      {notice && (
        <div className="admin-alert admin-alert-success" role="status">
          <span>{notice}</span>
          <span className="admin-alert-actions">
            {noticeCourse && (
              <Link href={`/admin/courses/${noticeCourse.id}`} className="btn btn-primary btn-sm">
                Dars qo‘shish <ArrowRightIcon />
              </Link>
            )}
            <button type="button" aria-label="Xabarni yopish" onClick={() => { setNotice(""); setNoticeCourse(null); }}>×</button>
          </span>
        </div>
      )}

      <div className="admin-course-toolbar">
        <label className="admin-course-search">
          <SearchIcon />
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Kurs nomi, kategoriya yoki tavsif bo‘yicha qidirish..."
            aria-label="Kurslarni qidirish"
          />
          {search && (
            <button type="button" onClick={() => setSearch("")} aria-label="Qidiruvni tozalash">×</button>
          )}
        </label>

        <label className="admin-course-status-filter">
          <span>Holati</span>
          <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
            <option value="all">Barchasi</option>
            <option value="active">Faol</option>
            <option value="draft">Qoralama</option>
            <option value="archived">Arxiv</option>
          </select>
        </label>
      </div>

      {filteredCourses.length === 0 ? (
        <div className="admin-courses-empty card">
          <span className="admin-courses-empty-icon"><BookIcon /></span>
          <h2>{courses.length === 0 ? "Birinchi kursingizni yarating" : "Kurs topilmadi"}</h2>
          <p>
            {courses.length === 0
              ? "Kurs nomi va tavsifini kiriting. Keyin shu kurs ichida darslar, 3D modellar va interaktiv materiallarni qo‘shishingiz mumkin."
              : "Qidiruv so‘zini yoki holat filtrini o‘zgartirib ko‘ring."}
          </p>
          {courses.length === 0 ? (
            <button type="button" className="btn btn-primary" onClick={openCreate}>
              <PlusIcon /> Kurs yaratish
            </button>
          ) : (
            <button type="button" className="btn btn-ghost" onClick={() => { setSearch(""); setStatusFilter("all"); }}>
              Filtrlarni tozalash
            </button>
          )}
        </div>
      ) : (
        <div className="admin-course-grid">
          {filteredCourses.map((course) => {
            const statusClass = STATUS_CHIPS[course.status] || "chip-gray";
            const statusLabel = STATUS_LABELS[course.status] || course.status || "Noma'lum";
            const createdDate = formatDate(course.created_at);

            return (
              <article className="admin-course-card" key={course.id}>
                <div className="admin-course-card-top">
                  <span className="admin-course-card-icon"><BookIcon /></span>
                  <span className={`chip ${statusClass}`}>{statusLabel}</span>
                </div>

                <div className="admin-course-card-content">
                  <h2>{course.title}</h2>
                  <p className="admin-course-category">{course.category || "Kategoriya belgilanmagan"}</p>
                  <p className="admin-course-description">
                    {course.description || "Bu kurs uchun hali tavsif kiritilmagan."}
                  </p>
                </div>

                <div className="admin-course-card-meta">
                  <span>{createdDate ? `Yaratilgan: ${createdDate}` : "Yangi kurs"}</span>
                  {course.recommended_for_new_users && <span className="admin-recommended-tag">Tavsiya etilgan</span>}
                </div>

                <div className="admin-course-card-actions">
                  <Link href={`/admin/courses/${course.id}`} className="btn btn-primary admin-lessons-link">
                    <BookIcon /> Darslar va materiallar <ArrowRightIcon />
                  </Link>
                  <button
                    type="button"
                    className="iconbtn"
                    onClick={() => openEdit(course)}
                    aria-label={`${course.title} kursini tahrirlash`}
                    title="Tahrirlash"
                  >
                    <EditIcon />
                  </button>
                  <button
                    type="button"
                    className="iconbtn is-danger"
                    onClick={() => { setModal({ type: "delete", course }); setModalError(""); }}
                    aria-label={`${course.title} kursini o‘chirish`}
                    title="O‘chirish"
                  >
                    <TrashIcon />
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      )}

      {(modal?.type === "create" || modal?.type === "edit") && (
        <Modal
          title={modal.type === "create" ? "Yangi kurs yaratish" : "Kursni tahrirlash"}
          onClose={closeModal}
          footer={
            <>
              <button type="button" className="btn btn-ghost" onClick={closeModal} disabled={busy}>
                Bekor qilish
              </button>
              <button type="submit" form="admin-course-form" className="btn btn-primary" disabled={busy}>
                {busy ? "Saqlanmoqda..." : modal.type === "create" ? "Kurs yaratish" : "O‘zgarishlarni saqlash"}
              </button>
            </>
          }
        >
          <form id="admin-course-form" className="admin-course-form" onSubmit={saveCourse}>
            <div className="admin-course-form-intro">
              <span className="admin-course-card-icon"><BookIcon /></span>
              <div>
                <strong>{modal.type === "create" ? "Kurs ma’lumotlari" : "Kurs ma’lumotlarini yangilash"}</strong>
                <p>Majburiy maydon — kurs nomi. Qolganlarini keyin ham o‘zgartirish mumkin.</p>
              </div>
            </div>

            <div className="field">
              <label htmlFor="admin-course-title">Kurs nomi *</label>
              <input
                id="admin-course-title"
                className="input"
                value={form.title}
                onChange={(event) => setField("title", event.target.value)}
                placeholder="Masalan: Ekologiya asoslari"
                autoFocus
                maxLength={200}
                required
              />
            </div>

            <div className="admin-course-form-grid">
              <div className="field">
                <label htmlFor="admin-course-category">Kategoriya</label>
                <input
                  id="admin-course-category"
                  className="input"
                  value={form.category}
                  onChange={(event) => setField("category", event.target.value)}
                  placeholder="Masalan: Ekologiya"
                  maxLength={100}
                />
              </div>
              <div className="field">
                <label htmlFor="admin-course-status">Holati</label>
                <select
                  id="admin-course-status"
                  className="select"
                  value={form.status}
                  onChange={(event) => setField("status", event.target.value)}
                >
                  <option value="active">Faol — o‘quvchilarga ko‘rinadi</option>
                  <option value="draft">Qoralama — tayyorlanmoqda</option>
                  <option value="archived">Arxiv</option>
                </select>
              </div>
            </div>

            <div className="field">
              <label htmlFor="admin-course-description">Kurs tavsifi</label>
              <textarea
                id="admin-course-description"
                className="textarea admin-course-description-input"
                value={form.description}
                onChange={(event) => setField("description", event.target.value)}
                placeholder="Ushbu kursda o‘quvchi nimalarni o‘rganadi?"
                maxLength={2000}
                rows={4}
              />
              <span className="admin-course-char-count">{form.description.length}/2000</span>
            </div>

            <div className="field">
              <label htmlFor="admin-course-embed">Kurs uchun embed havola (ixtiyoriy)</label>
              <input
                id="admin-course-embed"
                className="input"
                type="url"
                value={form.embedUrl}
                onChange={(event) => setField("embedUrl", event.target.value)}
                placeholder="https://..."
              />
              <span className="admin-course-field-help">Darsga tegishli 3D model, HTML test va AR/VR havolalari darslar bo‘limida kiritiladi.</span>
            </div>

            <label className="admin-course-checkbox">
              <input
                type="checkbox"
                checked={form.recommended}
                onChange={(event) => setField("recommended", event.target.checked)}
              />
              <span>
                <strong>Yangi o‘quvchilarga tavsiya qilish</strong>
                <small>Kurs platformadagi tavsiya etilganlar ro‘yxatiga qo‘shiladi.</small>
              </span>
            </label>

            {modalError && <p className="form-error" role="alert">{modalError}</p>}
          </form>
        </Modal>
      )}

      {modal?.type === "delete" && (
        <Modal
          title="Kursni o‘chirishni tasdiqlang"
          onClose={closeModal}
          footer={
            <>
              <button type="button" className="btn btn-ghost" onClick={closeModal} disabled={busy}>
                Bekor qilish
              </button>
              <button type="button" className="btn btn-danger" onClick={deleteCourse} disabled={busy}>
                {busy ? "O‘chirilmoqda..." : "Kursni o‘chirish"}
              </button>
            </>
          }
        >
          <p className="admin-course-delete-copy">
            <strong>“{modal.course.title}”</strong> kursini o‘chirmoqchimisiz?
          </p>
          <p className="admin-course-delete-warning">
            Kursga biriktirilgan barcha darslar va ularga tegishli progress ma’lumotlari ham o‘chishi mumkin. Bu amalni qaytarib bo‘lmaydi.
          </p>
          {modalError && <p className="form-error" role="alert">{modalError}</p>}
        </Modal>
      )}
    </section>
  );
}
