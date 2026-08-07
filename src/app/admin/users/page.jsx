"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Modal from "@/components/Modal";
import { timeAgo } from "@/lib/format";
import { SearchIcon, EditIcon, TrashIcon } from "@/components/Icons";
import { SkeletonPageHead, SkeletonTable } from "@/components/Skeleton";
import { ROLE_LABELS, ROLE_CHIPS, ROLES } from "@/lib/constants";
import { apiFetch } from "@/lib/api/client";
import { useCachedApi } from "@/lib/api/useCached";


export default function AdminUsersPage() {
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");

  const [editUser, setEditUser] = useState(null); // modal: rol o'zgartirish
  const [editRole, setEditRole] = useState("student");
  const [deleteUser, setDeleteUser] = useState(null); // modal: o'chirish
  const [busy, setBusy] = useState(false);
  const [modalError, setModalError] = useState("");

  // Kesh: sahifaga qaytganda ro'yxat darhol ko'rinadi, fonda yangilanadi
  const { data, loading, error, mutate } = useCachedApi("/api/admin/users");
  const users = data?.users || [];

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return users.filter((u) => {
      if (roleFilter !== "all" && u.role !== roleFilter) return false;
      if (!q) return true;
      return (
        (u.fullName || "").toLowerCase().includes(q) ||
        (u.email || "").toLowerCase().includes(q)
      );
    });
  }, [users, search, roleFilter]);

  const openEdit = (u) => {
    setEditUser(u);
    setEditRole(u.role || "student");
    setModalError("");
  };

  const saveRole = async () => {
    setBusy(true);
    setModalError("");
    try {
      await apiFetch(`/api/admin/users/${editUser.id}`, {
        method: "PATCH",
        body: { role: editRole },
      });
      mutate((prev) => ({
        ...prev,
        users: (prev?.users || []).map((u) =>
          u.id === editUser.id ? { ...u, role: editRole } : u
        ),
      }));
      setEditUser(null);
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
      await apiFetch(`/api/admin/users/${deleteUser.id}`, { method: "DELETE" });
      mutate((prev) => ({
        ...prev,
        users: (prev?.users || []).filter((u) => u.id !== deleteUser.id),
      }));
      setDeleteUser(null);
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
        <SkeletonTable rows={6} cols={4} />
      </>
    );
  }
  if (error) return <p className="form-error">{error}</p>;

  return (
    <>
      <header className="page-head">
        <div>
          <h1 className="page-title">Foydalanuvchilar</h1>
          <p className="page-sub">{users.length} ta hisob ro'yxatdan o'tgan.</p>
        </div>
      </header>

      <div className="filterbar">
        <label className="filter-search">
          <SearchIcon />
          <input
            placeholder="Ism yoki email bo'yicha qidirish"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </label>
        <select
          className="filter-select"
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value)}
          aria-label="Rol bo'yicha filtr"
        >
          <option value="all">Barcha rollar</option>
          {ROLES.map((role) => (
            <option key={role} value={role}>
              {ROLE_LABELS[role]}
            </option>
          ))}
        </select>
      </div>

      <div className="card tablewrap">
        <table className="table">
          <thead>
            <tr>
              <th scope="col">Foydalanuvchi</th>
              <th scope="col">Rol</th>
              <th scope="col">Ro&apos;yxatdan o&apos;tgan</th>
              <th scope="col" style={{ textAlign: "right" }}>Amallar</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && (
              <tr><td colSpan={4} className="empty">Mos foydalanuvchi topilmadi.</td></tr>
            )}
            {filtered.map((u) => (
              <tr key={u.id}>
                <td>
                  <div className="cell-user">
                    <span className="avatar">
                      {(u.fullName || u.email || "?").charAt(0).toUpperCase()}
                    </span>
                    <div>
                      <div className="cell-name">{u.fullName || "Ismsiz"}</div>
                      <div className="cell-sub">{u.email}</div>
                    </div>
                  </div>
                </td>
                <td>
                  <span className={`chip ${ROLE_CHIPS[u.role] || "chip-gray"}`}>
                    {ROLE_LABELS[u.role] || u.role}
                  </span>
                </td>
                <td style={{ color: "var(--ink-soft)" }}>{timeAgo(u.createdAt)}</td>
                <td style={{ textAlign: "right" }}>
                  <div style={{ display: "inline-flex", gap: 7 }}>
                    <button
                      type="button" className="iconbtn"
                      onClick={() => openEdit(u)}
                      aria-label={`${u.email} rolini o'zgartirish`}
                    >
                      <EditIcon />
                    </button>
                    <button
                      type="button" className="iconbtn is-danger"
                      onClick={() => { setDeleteUser(u); setModalError(""); }}
                      aria-label={`${u.email} hisobini o'chirish`}
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

      {editUser && (
        <Modal
          title="Rolni o'zgartirish"
          onClose={() => setEditUser(null)}
          footer={
            <>
              <button type="button" className="btn btn-ghost" onClick={() => setEditUser(null)}>
                Bekor qilish
              </button>
              <button type="button" className="btn btn-primary" onClick={saveRole} disabled={busy}>
                {busy ? "Saqlanmoqda..." : "Saqlash"}
              </button>
            </>
          }
        >
          <p style={{ margin: 0, fontSize: 14, color: "var(--ink-soft)" }}>
            <strong style={{ color: "var(--ink)" }}>{editUser.fullName || editUser.email}</strong>{" "}
            uchun yangi rolni tanlang.
          </p>
          <div className="field">
            <label htmlFor="role">Rol</label>
            <select
              id="role" className="select" value={editRole}
              onChange={(e) => setEditRole(e.target.value)}
            >
              {ROLES.map((role) => (
                <option key={role} value={role}>
                  {ROLE_LABELS[role]}
                </option>
              ))}
            </select>
          </div>
          {editRole === "admin" && (
            <p className="form-ok" style={{ background: "var(--sun-soft)", color: "#9a6a1c" }}>
              Diqqat: admin roli boshqaruv paneliga to'liq kirish huquqini beradi.
            </p>
          )}
          {modalError && <p className="form-error" role="alert">{modalError}</p>}
        </Modal>
      )}

      {deleteUser && (
        <Modal
          title="Hisobni o'chirish"
          onClose={() => setDeleteUser(null)}
          footer={
            <>
              <button type="button" className="btn btn-ghost" onClick={() => setDeleteUser(null)}>
                Bekor qilish
              </button>
              <button type="button" className="btn btn-danger" onClick={confirmDelete} disabled={busy}>
                {busy ? "O'chirilmoqda..." : "Ha, o'chirish"}
              </button>
            </>
          }
        >
          <p style={{ margin: 0, fontSize: 14.5 }}>
            <strong>{deleteUser.fullName || deleteUser.email}</strong> hisobini o'chirmoqchimisiz?
          </p>
          <p style={{ margin: 0, fontSize: 13.5, color: "var(--ink-soft)" }}>
            Bu amalni qaytarib bo'lmaydi: foydalanuvchining barcha yozuvlari, statistikasi va
            faollik tarixi o'chib ketadi.
          </p>
          {modalError && <p className="form-error" role="alert">{modalError}</p>}
        </Modal>
      )}
    </>
  );
}
