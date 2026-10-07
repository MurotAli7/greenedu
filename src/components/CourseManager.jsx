
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

function normalizeTitle(value = "") {
  return value
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

export default function CourseManager({ mode = "course" }) {
  const isArvr = mode === "ar-vr";

  const createLabel = isArvr ? "AR/VR kontent" : "Kurs";

  const apiUrl = `/api/admin/courses?type=${mode}`;

  const {
    data,
    loading,
    error,
    mutate,
  } = useCachedApi(apiUrl);

  const items = Array.isArray(data)
    ? data
    : Array.isArray(data?.courses)
      ? data.courses
      : [];

  const [modal, setModal] = useState({
    open: false,
    type: null,
    item: null,
  });

  const [form, setForm] = useState(EMPTY_FORM);

  const [busy, setBusy] = useState(false);
  const [modalError, setModalError] = useState("");

  const load = useCallback(async () => {
    await mutate();
  }, [mutate]);

  useEffect(() => {
    load();
  }, [load]);

  const closeModal = () => {
    if (busy) return;

    setModal({
      open: false,
      type: null,
      item: null,
    });

    setForm(EMPTY_FORM);
    setModalError("");
  };

  const openCreate = () => {
    setForm({
      ...EMPTY_FORM,
      contentType: isArvr ? "ar" : "course",
    });

    setModal({
      open: true,
      type: "create",
      item: null,
    });

    setModalError("");
  };

  const openEdit = (item) => {
    setForm({
      title: item.title || "",
      description: item.description || "",
      category: item.category || "",
      contentType:
        item.content_type ||
        item.contentType ||
        (isArvr ? "ar" : "course"),
      status: item.status || "active",
      embedUrl: item.embed_url || item.embedUrl || "",
      recommended: Boolean(item.recommended),
    });

    setModal({
      open: true,
      type: "edit",
      item,
    });

    setModalError("");
  };

  const handleChange = (field, value) => {
    setForm((prev) => ({
      ...prev,
      [field]: value,
    }));

    if (modalError) {
      setModalError("");
    }
  };

  const save = async () => {
    /*
     * Kurs nomini tozalaymiz:
     * "  Web   Dasturlash  "
     * =>
     * "Web Dasturlash"
     */
    const title = form.title.replace(/\s+/g, " ").trim();

    if (!title) {
      setModalError("Kurs nomi kiritilishi shart.");
      return;
    }

    const isEdit = modal.type === "edit";

    /*
     * Bir xil nomdagi kurslarni tekshirish.
     *
     * Masalan:
     * Python
     * python
     * PYTHON
     * Python
     *
     * bularning barchasi bir xil hisoblanadi.
     */
    const normalizedTitle = normalizeTitle(title);

    const duplicate = items.find((item) => {
      /*
       * Tahrirlash vaqtida aynan o'z kursimizni
       * duplicate deb hisoblamaymiz.
       */
      if (isEdit && item.id === modal.item?.id) {
        return false;
      }

      const existingTitle = normalizeTitle(item.title || "");

      return existingTitle === normalizedTitle;
    });

    if (duplicate) {
      setModalError(
        `"${duplicate.title}" nomli kurs allaqachon mavjud. Boshqa nom tanlang.`
      );
      return;
    }

    setBusy(true);
    setModalError("");

    try {
      const body = {
        title,
        description: form.description.trim(),

        /*
         * Oddiy kursda bu qiymatlar backend uchun
         * mavjud holatda saqlanadi.
         *
         * UI'da esa oddiy kurs uchun ko'rsatilmaydi.
         */
        category: form.category.trim(),
        contentType: form.contentType,
        status: form.status,
        embedUrl: form.embedUrl.trim(),
        recommended: Boolean(form.recommended),
      };

      let justCreated = null;

      if (isEdit) {
        const updated = await apiFetch(
          `/api/admin/courses/${modal.item.id}`,
          {
            method: "PATCH",
            body: JSON.stringify(body),
          }
        );

        if (updated?.course) {
          justCreated = updated.course;
        }

        await mutate();
      } else {
        const created = await apiFetch("/api/admin/courses", {
          method: "POST",
          body: JSON.stringify(body),
        });

        justCreated = created?.course || created;

        await mutate();
      }

      closeModal();

      /*
       * Yangi oddiy kurs yaratilgandan keyin
       * foydalanuvchini shu kursning darslari sahifasiga
       * o'tkazish uchun.
       */
      if (!isEdit && justCreated?.id) {
        window.location.href = `/admin/courses/${justCreated.id}`;
      }
    } catch (err) {
      console.error(err);

      setModalError(
        err?.message ||
          "Amalni bajarishda xatolik yuz berdi."
      );
    } finally {
      setBusy(false);
    }
  };

  const remove = async (item) => {
    const confirmed = window.confirm(
      `"${item.title}" kursini o‘chirishni xohlaysizmi?`
    );

    if (!confirmed) return;

    try {
      await apiFetch(`/api/admin/courses/${item.id}`, {
        method: "DELETE",
      });

      await mutate();
    } catch (err) {
      console.error(err);

      window.alert(
        err?.message ||
          "Kursni o‘chirishda xatolik yuz berdi."
      );
    }
  };

  const getLessonsCount = (item) => {
    return (
      item.lessons_count ??
      item.lesson_count ??
      item.lessonsCount ??
      0
    );
  };

  const getStudentsCount = (item) => {
    return (
      item.students_count ??
      item.student_count ??
      item.studentsCount ??
      0
    );
  };

  if (loading && !data) {
    return (
      <div className="space-y-6">
        <SkeletonPageHead />
        <SkeletonTable />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* HEADER */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            {isArvr ? "AR/VR kontent" : "Kurslar"}
          </h1>

          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            {isArvr
              ? "AR/VR ta’lim kontentlarini boshqaring."
              : "Kurslarni yarating, tahrirlang va boshqaring."}
          </p>
        </div>

        <button
          type="button"
          onClick={openCreate}
          className="inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-blue-700"
        >
          <PlusIcon className="h-5 w-5" />
          {createLabel}
        </button>
      </div>

      {/* ERROR */}
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-300">
          {error?.message || "Ma’lumotlarni yuklashda xatolik yuz berdi."}
        </div>
      )}

      {/* TABLE */}
      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-800">
            <thead className="bg-gray-50 dark:bg-gray-800/50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                  Nomi
                </th>

                {isArvr && (
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                    Turi
                  </th>
                )}

                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                  Holati
                </th>

                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                  Darslar
                </th>

                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                  O‘quvchilar
                </th>

                <th className="px-6 py-3 text-right text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                  Amallar
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
              {items.length === 0 ? (
                <tr>
                  <td
                    colSpan={isArvr ? 6 : 5}
                    className="px-6 py-12 text-center"
                  >
                    <div className="flex flex-col items-center justify-center">
                      <BookIcon className="mb-3 h-10 w-10 text-gray-400" />

                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        Hozircha hech narsa yo‘q — &quot;
                        {createLabel}
                        &quot; tugmasi bilan birinchisini qo‘shing.
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                items.map((item) => (
                  <tr
                    key={item.id}
                    className="transition hover:bg-gray-50 dark:hover:bg-gray-800/40"
                  >
                    {/* NAME */}
                    <td className="px-6 py-4">
                      <div>
                        <div className="font-medium text-gray-900 dark:text-white">
                          {item.title}
                        </div>

                        {item.category && (
                          <div className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                            {item.category}
                          </div>
                        )}

                        {item.description && (
                          <div className="mt-1 max-w-md truncate text-xs text-gray-500 dark:text-gray-400">
                            {item.description}
                          </div>
                        )}
                      </div>
                    </td>

                    {/* CONTENT TYPE */}
                    {isArvr && (
                      <td className="px-6 py-4">
                        <span className="text-sm text-gray-700 dark:text-gray-300">
                          {CONTENT_TYPE_LABELS?.[
                            item.content_type ||
                              item.contentType
                          ] ||
                            item.content_type ||
                            item.contentType ||
                            "—"}
                        </span>
                      </td>
                    )}

                    {/* STATUS */}
                    <td className="px-6 py-4">
                      {(() => {
                        const status =
                          item.status || "active";

                        const chip =
                          STATUS_CHIPS?.[status] ||
                          "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300";

                        return (
                          <span
                            className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${chip}`}
                          >
                            {STATUS_LABELS?.[status] ||
                              status}
                          </span>
                        );
                      })()}
                    </td>

                    {/* LESSONS */}
                    <td className="px-6 py-4 text-sm text-gray-700 dark:text-gray-300">
                      {getLessonsCount(item)}
                    </td>

                    {/* STUDENTS */}
                    <td className="px-6 py-4 text-sm text-gray-700 dark:text-gray-300">
                      {getStudentsCount(item)}
                    </td>

                    {/* ACTIONS */}
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-end gap-2">
                        <Link
                          href={`/admin/courses/${item.id}`}
                          title="Darslarni boshqarish"
                          className="rounded-lg p-2 text-gray-500 transition hover:bg-gray-100 hover:text-blue-600 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-blue-400"
                        >
                          <BookIcon className="h-5 w-5" />
                        </Link>

                        <button
                          type="button"
                          onClick={() => openEdit(item)}
                          title="Tahrirlash"
                          className="rounded-lg p-2 text-gray-500 transition hover:bg-gray-100 hover:text-blue-600 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-blue-400"
                        >
                          <EditIcon className="h-5 w-5" />
                        </button>

                        <button
                          type="button"
                          onClick={() => remove(item)}
                          title="O‘chirish"
                          className="rounded-lg p-2 text-gray-500 transition hover:bg-red-50 hover:text-red-600 dark:text-gray-400 dark:hover:bg-red-950/30 dark:hover:text-red-400"
                        >
                          <TrashIcon className="h-5 w-5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL */}
      <Modal
        open={modal.open}
        onClose={closeModal}
        title={
          modal.type === "edit"
            ? `${createLabel}ni tahrirlash`
            : `Yangi ${createLabel.toLowerCase()}`
        }
      >
        <div className="space-y-5">
          {/* MODAL ERROR */}
          {modalError && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-300">
              {modalError}
            </div>
          )}

          {/* TITLE */}
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
              Nomi
            </label>

            <input
              type="text"
              value={form.title}
              onChange={(e) =>
                handleChange("title", e.target.value)
              }
              placeholder="Kurs nomini kiriting"
              disabled={busy}
              className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900 outline-none transition placeholder:text-gray-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 disabled:cursor-not-allowed disabled:opacity-60 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
            />
          </div>

          {/* DESCRIPTION */}
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
              Tavsif
            </label>

            <textarea
              value={form.description}
              onChange={(e) =>
                handleChange(
                  "description",
                  e.target.value
                )
              }
              placeholder="Kurs haqida qisqacha ma’lumot"
              rows={4}
              disabled={busy}
              className="w-full resize-none rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900 outline-none transition placeholder:text-gray-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 disabled:cursor-not-allowed disabled:opacity-60 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
            />
          </div>

          {/*
           * ODDIY KURS UCHUN:
           *
           * Faqat:
           * 1. Nomi
           * 2. Tavsif
           *
           * ko‘rsatiladi.
           *
           * AR/VR rejimida esa eski qo‘shimcha
           * maydonlar saqlanadi.
           */}
          {isArvr && (
            <>
              {/* CATEGORY */}
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Kategoriya
                </label>

                <input
                  type="text"
                  value={form.category}
                  onChange={(e) =>
                    handleChange(
                      "category",
                      e.target.value
                    )
                  }
                  placeholder="Masalan: Biologiya"
                  disabled={busy}
                  className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900 outline-none transition placeholder:text-gray-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 disabled:cursor-not-allowed disabled:opacity-60 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                />
              </div>

              {/* CONTENT TYPE */}
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Kontent turi
                </label>

                <select
                  value={form.contentType}
                  onChange={(e) =>
                    handleChange(
                      "contentType",
                      e.target.value
                    )
                  }
                  disabled={busy}
                  className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 disabled:cursor-not-allowed disabled:opacity-60 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                >
                  <option value="ar">
                    AR
                  </option>

                  <option value="vr">
                    VR
                  </option>

                  <option value="arvr">
                    AR/VR
                  </option>
                </select>
              </div>

              {/* STATUS */}
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Holati
                </label>

                <select
                  value={form.status}
                  onChange={(e) =>
                    handleChange(
                      "status",
                      e.target.value
                    )
                  }
                  disabled={busy}
                  className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 disabled:cursor-not-allowed disabled:opacity-60 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                >
                  <option value="active">
                    Faol
                  </option>

                  <option value="draft">
                    Qoralama
                  </option>

                  <option value="inactive">
                    Faol emas
                  </option>
                </select>
              </div>

              {/* EMBED URL */}
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Embed havola
                </label>

                <input
                  type="url"
                  value={form.embedUrl}
                  onChange={(e) =>
                    handleChange(
                      "embedUrl",
                      e.target.value
                    )
                  }
                  placeholder="https://..."
                  disabled={busy}
                  className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900 outline-none transition placeholder:text-gray-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 disabled:cursor-not-allowed disabled:opacity-60 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                />
              </div>

              {/* RECOMMENDED */}
              <label className="flex cursor-pointer items-center gap-3">
                <input
                  type="checkbox"
                  checked={form.recommended}
                  onChange={(e) =>
                    handleChange(
                      "recommended",
                      e.target.checked
                    )
                  }
                  disabled={busy}
                  className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />

                <span className="text-sm text-gray-700 dark:text-gray-300">
                  Tavsiya etilgan kontent
                </span>
              </label>
            </>
          )}

          {/* BUTTONS */}
          <div className="flex flex-col-reverse gap-3 pt-2 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={closeModal}
              disabled={busy}
              className="rounded-lg border border-gray-300 px-4 py-2.5 text-sm font-medium text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
            >
              Bekor qilish
            </button>

            <button
              type="button"
              onClick={save}
              disabled={busy}
              className="rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {busy
                ? "Saqlanmoqda..."
                : modal.type === "edit"
                  ? "Saqlash"
                  : "Yaratish"}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
