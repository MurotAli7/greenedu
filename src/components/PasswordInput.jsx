"use client";

import { useId, useState } from "react";

function EyeIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M2 12s3.6-6.5 10-6.5S22 12 22 12s-3.6 6.5-10 6.5S2 12 2 12z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function EyeOffIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M4 4l16 16" />
      <path d="M9.6 5.7A9.7 9.7 0 0 1 12 5.5c6.4 0 10 6.5 10 6.5a17 17 0 0 1-2.6 3.4" />
      <path d="M6.5 7.9A16.6 16.6 0 0 0 2 12s3.6 6.5 10 6.5c1.4 0 2.6-.3 3.7-.8" />
      <path d="M9.9 9.9a3 3 0 0 0 4.2 4.2" />
    </svg>
  );
}

/**
 * Parol maydoni — ko'rsatish/yashirish tugmasi bilan.
 * Oddiy <input> kabi ishlatiladi: name, value, onChange, placeholder, autoComplete.
 */
export default function PasswordInput({
  label,
  name = "password",
  value,
  onChange,
  placeholder = "••••••••",
  autoComplete = "current-password",
  autoFocus = false,
  id,
}) {
  const [visible, setVisible] = useState(false);
  const generatedId = useId();
  const inputId = id || `pw-${generatedId}`;

  return (
    <div className="field">
      {label && <label htmlFor={inputId}>{label}</label>}
      <div className="pw-wrap">
        <input
          id={inputId}
          name={name}
          type={visible ? "text" : "password"}
          className="input pw-input"
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          autoComplete={autoComplete}
          autoFocus={autoFocus}
        />
        <button
          type="button"
          className="pw-toggle"
          onClick={() => setVisible((v) => !v)}
          aria-label={visible ? "Parolni yashirish" : "Parolni ko'rsatish"}
          title={visible ? "Parolni yashirish" : "Parolni ko'rsatish"}
          tabIndex={-1}
        >
          {visible ? <EyeOffIcon /> : <EyeIcon />}
        </button>
      </div>
    </div>
  );
}
