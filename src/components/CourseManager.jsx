"use client";

import { useState } from "react";
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
 * Kurslar / AR-VR kontent boshqaruvi.
 *
 * mode:
 *   "course"  - oddiy kurslar
 *   "ar-vr"   - AR/VR kontentlar
 */
export default function CourseManager({ mode = "course" }) {
  const isArvr = mode === "ar-vr";

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


  /*
   * Kurs nomini solishtirish uchun bir xil ko'rinishga keltiramiz.
   *
   * Masalan:
   * "Ekologiya asoslari"
   * "  Ekologiya   asoslari "
   *
   * ikkalasi ham bir xil deb hisoblanadi.
   */
  const normalizeTitle = (value = "") => {
    return value
      .replace(/\s+/g, " ")
      .trim()
      .toLowerCase();
  };


  const openCreate = () => {
    setForm({
      ...EMPTY_FORM,
      contentType: isArvr ? "ar" : "course",
    });

    setModal({
      type: "create",
    });

    setModalError("");
  };


  const openEdit = (item) => {
    setForm({
      title: item.title || "",
      description: item.description || "",
      category: item.category || "",
      contentType: item.content_type || (isArvr ? "ar" : "course"),
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


  const closeModal = () => {
    if (busy) return;

    setModal(null);
    setModalError("");
    setForm(EMPTY_FORM);
  };


  const setF = (name, value) => {
    setForm((prev) => ({
      ...prev,
      [name]: value,
    }));

    if (modalError) {
      setModalError("");
    }
  };


  const save = async () => {
    const title = form.title
      .replace(/\s+/g, " ")
      .trim();

    const description = form.description
      .replace(/\s+/g, " ")
      .trim();


    /*
     * 1. Kurs nomi bo'sh bo'lmasligi kerak.
     */
    if (!title) {
      setModalError("Kurs nomi kiritilishi shart.");
      return;
    }


    /*
     * 2. Kurs nomi takrorlanmasligi kerak.
     *
     * Edit qilayotganda aynan o'zining eski nomi
     * duplicate hisoblanmaydi.
     */
    const normalizedTitle = normalizeTitle(title);

    const isEdit = modal?.type === "edit";

    const duplicate = items.find((item) => {
      if (isEdit && item.id === modal.item.id) {
        return false;
      }

      return normalizeTitle(item.title || "") === normalizedTitle;
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
      /*
       * Oddiy kurs uchun UI'da faqat:
       *   - nomi
       *   - tavsifi
       *
       * ko'rsatiladi.
       *
       * Lekin backend bilan mavjud kontrakt buzilmasligi uchun
       * qolgan qiymatlar ham yuboriladi.
       */
      const body = {
        title,
        description,
        category: form.category.trim(),
        contentType: form.contentType,
        status: form.status,
        embedUrl: form.embedUrl.trim(),
        recommended: Boolean(form.recommended),
      };


      /*
       * EDIT
       */
      if (isEdit) {
        const json = await apiFetch(
          `/api/admin/courses/${modal.item.id}`,
          {
            method: "PATCH",
            body,
          }
        );


        /*
         * setItems ishlatilmaydi.
         *
         * Chunki bu komponentda items state emas,
         * useCachedApi ichidan kelayotgan data hisoblanadi.
         */
        mutate((prev) => {
          if (!prev) {
            return prev;
          }

          const updatedCourse = json?.course;

          if (!updatedCourse) {
            return prev;
          }

          return {
            ...prev,
            courses: (prev.courses || []).map((item) => {
              if (item.id !== modal.item.id) {
                return item;
              }

              return {
                ...item,
                ...updatedCourse,

                /*
                 * Statistik qiymatlar backend javobida
                 * kelmasa eski qiymatlarni saqlaymiz.
                 */
                students:
                  updatedCourse.students ??
                  item.students ??
                  0,

                lessons_count:
                  updatedCourse.lessons_count ??
                  item.lessons_count ??
                  0,
              };
            }),
          };
        });


        setModal(null);
        setForm(EMPTY_FORM);

        return;
      }


      /*
       * CREATE
       */
      const json = await apiFetch(
        "/api/admin/courses",
        {
          method: "POST",
          body,
        }
      );


      const createdCourse = json?.course || json;


      /*
       * Yangi kursni keshdagi ro'yxatga qo'shamiz.
       * Sahifani reload qilmaymiz.
       */
      mutate((prev) => {
        if (!prev) {
          return prev;
        }

        return {
          ...prev,
          courses: [
            {
              ...createdCourse,
              students: 0,
              lessons_count: 0,
            },
            ...(prev.courses || []),
          ],
        };
      });


      /*
       * Kurs yaratilgandan keyin dars qo'shish uchun
       * notification chiqaramiz.
       */
      setJustCreated(createdCourse);

      setModal(null);
      setForm(EMPTY_FORM);

    } catch (err) {
      console.error("Course save error:", err);

      setModalError(
        err?.message ||
        "Kursni saqlashda xatolik yuz berdi."
      );
    } finally {
      setBusy(false);
    }
  };


  /*
   * Kursni o'chirish.
   */
  const confirmDelete = async () => {
    if (!modal?.item) {
      return;
    }

    setBusy(true);
    setModalError("");


    try {
      await apiFetch(
        `/api/admin/courses/${modal.item.id}`,
        {
          method: "DELETE",
        }
      );


      /*
       * Keshdan ham olib tashlaymiz.
       */
      mutate((prev) => {
        if (!prev) {
          return prev;
        }

        return {
          ...prev,
          courses: (prev.courses || []).filter(
            (item) => item.id !== modal.item.id
          ),
        };
      });


      setModal(null);
      setForm(EMPTY_FORM);

    } catch (err) {
      console.error("Course delete error:", err);

      setModalError(
        err?.message ||
        "Kursni o'chirishda xatolik yuz berdi."
      );
    } finally {
      setBusy(false);
    }
  };


  const title = isArvr
    ? "AR/VR kontent"
    : "Kurslar";

  const createLabel = isArvr
    ? "Yangi AR/VR kontent"
    : "Yangi kurs";


  /*
   * Loading
   */
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
      {/* HEADER */}
      <header className="page-head">
        <div>
          <h1 className="page-title">
            {title}
          </h1>

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
          <PlusIcon />
          {createLabel}
        </button>
      </header>


      {/* API ERROR */}
      {error && (
        <p
          className="form-error"
          role="alert"
          style={{ marginBottom: 14 }}
        >
          {error}
        </p>
      )}


      {/* COURSE CREATED */}
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
            <strong>{justCreated.title}</strong>{" "}
            yaratildi. Endi unga darslar qo'shing —
            darssiz kurs o'quvchiga bo'sh ko'rinadi.
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


      {/* TABLE */}
      <div className="card tablewrap">
        <table className="table">
          <thead>
            <tr>
              <th scope="col">
                Nomi
              </th>

              {isArvr && (
                <th scope="col">
                  Turi
                </th>
              )}

              <th scope="col">
                Holati
              </th>

              <th scope="col">
                Darslar
              </th>

              <th scope="col">
                O'quvchilar
              </th>

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
                  Hozircha hech narsa yo'q —
                  "{createLabel}" tugmasi bilan
                  birinchisini qo'shing.
                </td>
              </tr>
            )}


            {items.map((course) => (
              <tr key={course.id}>
                <td>
                  <div className="cell-name">
                    {course.title}
                  </div>

                  <div className="cell-sub">
                    {course.category || "Kategoriyasiz"}
                  </div>
                </td>


                {/* AR/VR TYPE */}
                {isArvr && (
                  <td>
                    <span
                      className={`chip ${
                        course.content_type === "vr"
                          ? "chip-sky"
                          : "chip-amber"
                      }`}
                    >
                      {
                        CONTENT_TYPE_LABELS[
                          course.content_type
                        ] ||
                        course.content_type
                      }
                    </span>
                  </td>
                )}


                {/* STATUS */}
                <td>
                  <span
                    className={`chip ${
                      STATUS_CHIPS[course.status] ||
                      "chip-gray"
                    }`}
                  >
                    {
                      STATUS_LABELS[course.status] ||
                      course.status
                    }
                  </span>
                </td>


                {/* LESSONS */}
                <td>
                  {course.lessons_count > 0 ? (
                    <Link
                      href={`/admin/courses/${course.id}`}
                      className="chip chip-green"
                      style={{
                        textDecoration: "none",
                      }}
                    >
                      {course.lessons_count} dars
                    </Link>
                  ) : (
                    <Link
                      href={`/admin/courses/${course.id}`}
                      className="chip chip-amber"
                      style={{
                        textDecoration: "none",
                      }}
                    >
                      Dars qo'shish
                    </Link>
                  )}
                </td>


                {/* STUDENTS */}
                <td>
                  {course.students ?? 0}
                </td>


                {/* ACTIONS */}
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
                    {/* LESSONS */}
                    <Link
                      href={`/admin/courses/${course.id}`}
                      className="iconbtn"
                      aria-label={`${course.title} darslarini boshqarish`}
                      title="Darslar"
                    >
                      <BookIcon />
                    </Link>


                    {/* EDIT */}
                    <button
                      type="button"
                      className="iconbtn"
                      onClick={() => openEdit(course)}
                      aria-label={`${course.title}ni tahrirlash`}
                      title="Tahrirlash"
                    >
                      <EditIcon />
                    </button>


                    {/* DELETE */}
                    <button
                      type="button"
                      className="iconbtn is-danger"
                      onClick={() => {
                        setModal({
                          type: "delete",
                          item: course,
                        });

                        setModalError("");
                      }}
                      aria-label={`${course.title}ni o'chirish`}
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


      {/* CREATE / EDIT MODAL */}
      {(modal?.type === "create" ||
        modal?.type === "edit") && (
        <Modal
          title={
            modal.type === "create"
              ? createLabel
              : "Tahrirlash"
          }
          onClose={closeModal}
          footer={
            <>
              <button
                type="button"
                className="btn btn-ghost"
                onClick={closeModal}
                disabled={busy}
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
          {/* NOMI */}
          <div className="field">
            <label htmlFor="cm-title">
              Nomi *
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


          {/* TAVSIF */}
          <div className="field">
            <label htmlFor="cm-desc">
              Tavsif
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
              placeholder="Qisqacha: bu kursda nimalar o'rganiladi?"
            />
          </div>


          {/*
           * ODDIY KURS:
           *
           * Yangi kurs yaratishda faqat:
           *   - Nomi
           *   - Tavsif
           *
           * ko'rsatiladi.
           *
           * AR/VR:
           * Barcha eski sozlamalar ko'rsatiladi.
           *
           * EDIT:
           * Oddiy kursning mavjud ma'lumotlarini
           * yo'qotib qo'ymaslik uchun eski maydonlar
           * tahrirlashda ko'rsatiladi.
           */}

          {(
            isArvr ||
            modal.type === "edit"
          ) && (
            <>
              {/* CATEGORY + TYPE */}
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns:
                    "1fr 1fr",
                  gap: 12,
                }}
              >
                {/* CATEGORY */}
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


                {/* CONTENT TYPE */}
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


              {/* STATUS + EMBED */}
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns:
                    "1fr 1fr",
                  gap: 12,
                }}
              >
                {/* STATUS */}
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


                {/* EMBED URL */}
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


              {/* RECOMMENDED */}
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


          {/* MODAL ERROR */}
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


      {/* DELETE MODAL */}
      {modal?.type === "delete" && (
        <Modal
          title="O'chirishni tasdiqlang"
          onClose={closeModal}
          footer={
            <>
              <button
                type="button"
                className="btn btn-ghost"
                onClick={closeModal}
                disabled={busy}
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
            {modal.item.lessons_count ?? 0} ta)
            va o'quvchilarning bu kursga oid
            yozuvlari ham o'chadi. Bu amalni
            qaytarib bo'lmaydi.
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