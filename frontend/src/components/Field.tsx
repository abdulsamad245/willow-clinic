"use client";

import { useId, type InputHTMLAttributes } from "react";

type FieldProps = InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  error?: string;
};

export function Field({ label, error, id, className, ...props }: FieldProps) {
  const autoId = useId();
  const inputId = id ?? autoId;
  const errId = `${inputId}-error`;

  return (
    <div className="grid gap-1">
      <label htmlFor={inputId} className="text-sm text-stone-600">
        {label}
      </label>
      <input
        id={inputId}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? errId : undefined}
        {...props}
        className={`min-h-11 border bg-[#fffdf8] px-3 py-2.5 text-base text-ink placeholder:text-stone-400 outline-none ${
          error ? "border-red-700" : "border-[#cfc6b8] focus:border-leaf"
        } ${className ?? ""}`}
      />
      {error ? (
        <p id={errId} role="alert" className="text-sm text-red-800">
          {error}
        </p>
      ) : null}
    </div>
  );
}
