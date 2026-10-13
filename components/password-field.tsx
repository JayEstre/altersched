<<<<<<< HEAD
import type { InputHTMLAttributes } from 'react'

type PasswordFieldProps = {
  label: string
  name: string
  showPassword: boolean
  onToggle: () => void
  className?: string
} & Omit<InputHTMLAttributes<HTMLInputElement>, 'type'>
=======
import type { InputHTMLAttributes } from "react";

type PasswordFieldProps = {
  label: string;
  name: string;
  showPassword: boolean;
  onToggle: () => void;
  className?: string;
} & Omit<InputHTMLAttributes<HTMLInputElement>, "type">;
>>>>>>> 64bbe35105f1f6c5ed950e8e05ea24299def12bf

function EyeIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
<<<<<<< HEAD
      <path
        d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6S2 12 2 12Z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="12" cy="12" r="3" fill="none" stroke="currentColor" strokeWidth="1.8" />
    </svg>
  )
=======
      <path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6S2 12 2 12Z" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="12" cy="12" r="3" fill="none" stroke="currentColor" strokeWidth="1.8" />
    </svg>
  );
>>>>>>> 64bbe35105f1f6c5ed950e8e05ea24299def12bf
}

function EyeOffIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
<<<<<<< HEAD
      <path
        d="M3 3l18 18"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
      <path
        d="M10.6 10.6A2 2 0 0 1 13.4 13.4"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
      <path
        d="M9.1 5.5A10.7 10.7 0 0 1 12 5c6.5 0 10 7 10 7a17.3 17.3 0 0 1-4.4 5.3M6.2 6.2A17.9 17.9 0 0 0 2 12s3.5 7 10 7a11 11 0 0 0 5.3-1.4"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
=======
      <path d="M3 3l18 18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <path d="M10.6 10.6A2 2 0 0 1 13.4 13.4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <path d="M9.1 5.5A10.7 10.7 0 0 1 12 5c6.5 0 10 7 10 7a17.3 17.3 0 0 1-4.4 5.3M6.2 6.2A17.9 17.9 0 0 0 2 12s3.5 7 10 7a11 11 0 0 0 5.3-1.4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
>>>>>>> 64bbe35105f1f6c5ed950e8e05ea24299def12bf
}

export function PasswordField({
  label,
  name,
  showPassword,
  onToggle,
<<<<<<< HEAD
  className = '',
  id,
  ...inputProps
}: PasswordFieldProps) {
  const inputId = id ?? name

  return (
    <div className={`password-field-group${className ? ` ${className}` : ''}`}>
      <label htmlFor={inputId}>{label}</label>
      <div className="password-field">
        <input {...inputProps} id={inputId} name={name} type={showPassword ? 'text' : 'password'} />
        <button
          type="button"
          className="password-toggle"
          onClick={(event) => {
            event.preventDefault()
            event.stopPropagation()
            onToggle()
          }}
          aria-label={showPassword ? `Hide ${label.toLowerCase()}` : `Show ${label.toLowerCase()}`}
          aria-pressed={showPassword}
=======
  className = "",
  ...inputProps
}: PasswordFieldProps) {
  return (
    <label className={className || undefined}>
      {label}
      <div className="password-field">
        <input
          {...inputProps}
          name={name}
          type={showPassword ? "text" : "password"}
        />
        <button
          type="button"
          className="password-toggle"
          onClick={onToggle}
          aria-label={showPassword ? `Hide ${label.toLowerCase()}` : `Show ${label.toLowerCase()}`}
>>>>>>> 64bbe35105f1f6c5ed950e8e05ea24299def12bf
        >
          {showPassword ? <EyeOffIcon /> : <EyeIcon />}
        </button>
      </div>
<<<<<<< HEAD
    </div>
  )
=======
    </label>
  );
>>>>>>> 64bbe35105f1f6c5ed950e8e05ea24299def12bf
}
