
"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import Modal from "@/components/Modal";

import {
  PlusIcon,
  EditIcon,
  TrashIcon,
  BookIcon,
} from "@/components/Icons";

import {
  SkeletonPageHead,
  SkeletonTable,
} from "@/components/Skeleton";

import {
  STATUS_LABELS,
  STATUS_CHIPS,
  CONTENT_TYPE_LABELS,
} from "@/lib/constants";

import { apiFetch } from "@/lib/api/client";
import { useCachedApi } from "@/lib/api/useCached";

const EMPTY_FORM = {
  title: "",
  description: "",
  category: "",
  contentType: "course",
  status: "active",
  embedUrl: "",
  recommended: false,
};

/**
 * Kurslar/AR-VR kontent boshqaruvi — umumiy komponent.
 *
 * mode: "course" — oddiy kurslar
 * mode: "ar-vr" — AR/VR kontentlar
 */
export default function CourseManager({ mode }) {
  const isArvr = mode === "ar-vr";

  // Kesh: kurs/AR-VR bo'limlari orasida yurganda
  // ro'yxat darhol ko'rinadi.
  const {
    data,
    loading,
    error,
    mutate,
  } = useCachedApi(`/api/admin/courses?type=${mode}`);

  const items = data?.courses || [];

  const [modal, setModal] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [busy, setBusy] = useState(false);
  const [modalError, setModalError] = useState("");
  const [justCreated, setJustCreated] = useState(null);

  const openCreate = () => {
    setForm({
      ...EMPTY_FORM,
      contentType: isArvr ? "ar" : "course",
      status: "active",
      category: "",
      embedUrl: "",
      recommended: false,
    });

    setModal({ type: "create" });
    setModalError("");
  };

  const openEdit = (item) => {
    setForm({
      title: item.title || "",
      description: item.description || "",
      category: item.category || "",
      contentType: item.content_type || "course",
      status: item.status || "active",
      embedUrl: item.embed_url || "",
      recommended: Boolean(item.recommended_for_new_users),
    });

    setModal({
      type: "edit",
      item,
    });

    setModalError("");
  };

  const setF = (name, value) => {
    setForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const save = async () => {
    if (!form.title.trim()) {
      setModalError("Kurs nomi kiritilishi shart.");
      return;
    }

    setBusy(true);
    setModalError("");

    try {
      const isEdit = modal.type === "edit";

      const json = await apiFetch(
        isEdit
          ? `/api/admin/courses/${modal.item.id}`
          : "/api/admin/courses",
        {
          method: isEdit ? "PATCH" : "POST",
          body: {
            title: form.title.trim(),
            description: form.description.trim(),

            // Backend bilan moslik uchun saqlanadi.
            // Oddiy kurs oynasida foydalanuvchiga ko'rsatilmaydi.
            category: form.category.trim(),
            contentType: form.contentType,
            status: form.status,
            embedUrl: form.embedUrl.trim(),
            recommended: form.recommended,
          },
        }
      );

      if (isEdit) {
        // Sahifani qayta yuklamasdan lokal ro'yxatni yangilaymiz.
        mutate((prev) => ({
          ...prev,
          courses: (prev?.courses || []).map((it) =>
            it.id === modal.item.id
              ? {
                  ...it,
                  ...json.course,
                  students: it.students,
                  lessons_count: it.lessons_count,
                }
              : it
          ),
        }));
      } else {
        mutate((prev) => ({
          ...prev,
          courses: [
            {
              ...json.course,
              students: 0,
              lessons_count: 0,
            },
            ...(prev?.courses || []),
          ],
        }));

        // Kurs yaratildi — endi darslar qo'shish kerak.
        setJustCreated(json.course);
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
      await apiFetch(
        `/api/admin/courses/${modal.item.id}`,
        {
          method: "DELETE",
        }
      );

      mutate((prev) => ({
        ...prev,
        courses: (prev?.courses || []).filter(
          (it) => it.id !== modal.item.id
        ),
      }));

      setModal(null);
    } catch (err) {
      setModalError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const title = isArvr ? "AR/VR kontent" : "Kurslar";

  const createLabel = isArvr
    ? "Yangi AR/VR kontent"
    : "Yangi kurs";

  if (loading) {
    return (
      <>
        <SkeletonPageHead />
        <SkeletonTable rows={5} cols={5} />
      </>
    );
  }

  return (
    <>
      <header className="page-head">
        <div>
          <h1 className="page-title">{title}</h1>

          <p className="page-sub">
            {isArvr
              ? "Interaktiv AR/VR modullarni boshqaring — har biriga embed havola biriktiriladi."
              : "O'quv kurslarini yarating va darslarini boshqaring."}
          </p>
        </div>

        <button
          type="button"
          className="btn btn-primary"
          onClick={openCreate}
        >
          <PlusIcon /> {createLabel}
        </button>
      </header>

      {error && (
        <p
          className="form-error"
          role="alert"
          style={{ marginBottom: 14 }}
        >
          {error}
        </p>
      )}

      {justCreated && (
        <div
          className="form-ok"
          style={{
            marginBottom: 14,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 12,
            flexWrap: "wrap",
          }}
        >
          <span>
            <strong>{justCreated.title}</strong> yaratildi.
            Endi unga darslar qo'shing — darssiz kurs
            o'quvchiga bo'sh ko'rinadi.
          </span>

          <span
            style={{
              display: "flex",
              gap: 8,
            }}
          >
            <Link
              href={`/admin/courses/${justCreated.id}`}
              className="btn btn-primary btn-sm"
            >
              Darslar qo'shish
            </Link>

            <button
              type="button"
              className="btn btn-ghost btn-sm"
              onClick={() => setJustCreated(null)}
            >
              Keyinroq
            </button>
          </span>
        </div>
      )}

      <div className="card tablewrap">
        <table className="table">
          <thead>
            <tr>
              <th scope="col">Nomi</th>

              {isArvr && (
                <th scope="col">Turi</th>
              )}

              <th scope="col">Holati</th>
              <th scope="col">Darslar</th>
              <th scope="col">O&apos;quvchilar</th>

              <th
                scope="col"
                style={{ textAlign: "right" }}
              >
                Amallar
              </th>
            </tr>
          </thead>

          <tbody>
            {items.length === 0 && (
              <tr>
                <td
                  colSpan={isArvr ? 6 : 5}
                  className="empty"
                >
                  Hozircha hech narsa yo'q — "
                  {createLabel}" tugmasi bilan
                  birinchisini qo'shing.
                </td>
              </tr>
            )}

            {items.map((c) => (
              <tr key={c.id}>
                <td>
                  <div className="cell-name">
                    {c.title}
                  </div>

                  <div className="cell-sub">
                    {c.category || "Kategoriyasiz"}
                  </div>
                </td>

                {isArvr && (
                  <td>
                    <span
                      className={`chip ${
                        c.content_type === "vr"
                          ? "chip-sky"
                          : "chip-amber"
                      }`}
                    >
                      {CONTENT_TYPE_LABELS[
                        c.content_type
                      ] || c.content_type}
                    </span>
                  </td>
                )}

                <td>
                  <span
                    className={`chip ${
                      STATUS_CHIPS[c.status] ||
                      "chip-gray"
                    }`}
                  >
                    {STATUS_LABELS[c.status] ||
                      c.status}
                  </span>
                </td>

                <td>
                  {c.lessons_count > 0 ? (
                    <Link
                      href={`/admin/courses/${c.id}`}
                      className="chip chip-green"
                      style={{
                        textDecoration: "none",
                      }}
                    >
                      {c.lessons_count} dars
                    </Link>
                  ) : (
                    <Link
                      href={`/admin/courses/${c.id}`}
                      className="chip chip-amber"
                      style={{
                        textDecoration: "none",
                      }}
                    >
                      Dars qo'shish
                    </Link>
                  )}
                </td>

                <td>
                  {c.students}
                </td>

                <td
                  style={{
                    textAlign: "right",
                  }}
                >
                  <div
                    style={{
                      display: "inline-flex",
                      gap: 7,
                    }}
                  >
                    <Link
                      href={`/admin/courses/${c.id}`}
                      className="iconbtn"
                      aria-label={`${c.title} darslarini boshqarish`}
                      title="Darslar"
                    >
                      <BookIcon />
                    </Link>

                    <button
                      type="button"
                      className="iconbtn"
                      onClick={() => openEdit(c)}
                      aria-label={`${c.title}ni tahrirlash`}
                      title="Tahrirlash"
                    >
                      <EditIcon />
                    </button>

                    <button
                      type="button"
                      className="iconbtn is-danger"
                      onClick={() => {
                        setModal({
                          type: "delete",
                          item: c,
                        });

                        setModalError("");
                      }}
                      aria-label={`${c.title}ni o'chirish`}
                      title="O'chirish"
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

      {(modal?.type === "create" ||
        modal?.type === "edit") && (
        <Modal
          title={
            modal.type === "create"
              ? createLabel
              : "Tahrirlash"
          }
          onClose={() => setModal(null)}
          footer={
            <>
              <button
                type="button"
                className="btn btn-ghost"
                onClick={() => setModal(null)}
              >
                Bekor qilish
              </button>

              <button
                type="button"
                className="btn btn-primary"
                onClick={save}
                disabled={busy}
              >
                {busy
                  ? "Saqlanmoqda..."
                  : modal.type === "create"
                  ? "Yaratish"
                  : "Saqlash"}
              </button>
            </>
          }
        >
          {/* =============================== */}
          {/* KURS NOMI                       */}
          {/* =============================== */}

          <div className="field">
            <label htmlFor="cm-title">
              {isArvr ? "Nomi" : "Kurs nomi"} *
            </label>

            <input
              id="cm-title"
              className="input"
              value={form.title}
              onChange={(e) =>
                setF("title", e.target.value)
              }
              placeholder={
                isArvr
                  ? "Masalan: O'rmon ekotizimi (AR)"
                  : "Masalan: Ekologiya asoslari"
              }
              autoFocus
            />
          </div>

          {/* =============================== */}
          {/* KURS HAQIDA MA'LUMOT             */}
          {/* =============================== */}

          <div className="field">
            <label htmlFor="cm-desc">
              {isArvr
                ? "Tavsif"
                : "Kurs haqida ma'lumot"}
            </label>

            <textarea
              id="cm-desc"
              className="textarea"
              value={form.description}
              onChange={(e) =>
                setF(
                  "description",
                  e.target.value
                )
              }
              placeholder={
                isArvr
                  ? "Qisqacha tavsif..."
                  : "Bu kursda nimalar o'rganiladi?"
              }
            />
          </div>

          {/* ================================================== */}
          {/* AR/VR REJIMI UCHUN QO'SHIMCHA MAYDONLAR             */}
          {/* Oddiy kurs uchun ular umuman ko'rinmaydi.          */}
          {/* ================================================== */}

          {isArvr && (
            <>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns:
                    "1fr 1fr",
                  gap: 12,
                }}
              >
                <div className="field">
                  <label htmlFor="cm-cat">
                    Kategoriya
                  </label>

                  <input
                    id="cm-cat"
                    className="input"
                    value={form.category}
                    onChange={(e) =>
                      setF(
                        "category",
                        e.target.value
                      )
                    }
                    placeholder="Ekologiya / Biologiya / ..."
                  />
                </div>

                <div className="field">
                  <label htmlFor="cm-type">
                    Kontent turi
                  </label>

                  <select
                    id="cm-type"
                    className="select"
                    value={form.contentType}
                    onChange={(e) =>
                      setF(
                        "contentType",
                        e.target.value
                      )
                    }
                  >
                    <option value="course">
                      Oddiy kurs
                    </option>

                    <option value="ar">
                      AR kontent
                    </option>

                    <option value="vr">
                      VR kontent
                    </option>
                  </select>
                </div>
              </div>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns:
                    "1fr 1fr",
                  gap: 12,
                }}
              >
                <div className="field">
                  <label htmlFor="cm-status">
                    Holati
                  </label>

                  <select
                    id="cm-status"
                    className="select"
                    value={form.status}
                    onChange={(e) =>
                      setF(
                        "status",
                        e.target.value
                      )
                    }
                  >
                    <option value="active">
                      Faol — o'quvchilar ko'radi
                    </option>

                    <option value="draft">
                      Qoralama — faqat adminga ko'rinadi
                    </option>

                    <option value="archived">
                      Arxiv — ro'yxatdan olinadi
                    </option>
                  </select>
                </div>

                <div className="field">
                  <label htmlFor="cm-embed">
                    Embed havola (ixtiyoriy)
                  </label>

                  <input
                    id="cm-embed"
                    className="input"
                    value={form.embedUrl}
                    onChange={(e) =>
                      setF(
                        "embedUrl",
                        e.target.value
                      )
                    }
                    placeholder="https://..."
                  />
                </div>
              </div>

              <label
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 9,
                  fontSize: 14,
                  cursor: "pointer",
                }}
              >
                <input
                  type="checkbox"
                  checked={form.recommended}
                  onChange={(e) =>
                    setF(
                      "recommended",
                      e.target.checked
                    )
                  }
                />

                Yangi o'quvchilarga tavsiya etilsin
              </label>
            </>
          )}

          {modalError && (
            <p
              className="form-error"
              role="alert"
            >
              {modalError}
            </p>
          )}
        </Modal>
      )}

      {modal?.type === "delete" && (
        <Modal
          title="O'chirishni tasdiqlang"
          onClose={() => setModal(null)}
          footer={
            <>
              <button
                type="button"
                className="btn btn-ghost"
                onClick={() => setModal(null)}
              >
                Bekor qilish
              </button>

              <button
                type="button"
                className="btn btn-danger"
                onClick={confirmDelete}
                disabled={busy}
              >
                {busy
                  ? "O'chirilmoqda..."
                  : "Ha, o'chirish"}
              </button>
            </>
          }
        >
          <p
            style={{
              margin: 0,
              fontSize: 14.5,
            }}
          >
            <strong>
              {modal.item.title}
            </strong>{" "}
            o'chirilsinmi?
          </p>

          <p
            style={{
              margin: 0,
              fontSize: 13.5,
              color: "var(--ink-soft)",
            }}
          >
            Ichidagi barcha darslar (
            {modal.item.lessons_count} ta) va
            o'quvchilarning bu kursga oid yozuvlari
            ham o'chadi. Bu amalni qaytarib bo'lmaydi.
          </p>

          {modalError && (
            <p
              className="form-error"
              role="alert"
            >
              {modalError}
            </p>
          )}
        </Modal>
      )}
    </>
  );
}
