"use client";

import { useEffect, useId, useRef, useState } from "react";

export type SelectOption = {
  value: string;
  label: string;
};

type SelectDropdownProps = {
  label: string;
  value: string;
  options: SelectOption[];
  onChange: (value: string) => void;
};

export function SelectDropdown({ label, value, options, onChange }: SelectDropdownProps) {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const root = useRef<HTMLDivElement>(null);
  const listId = useId();
  const labelId = useId();
  const selected = options.find((option) => option.value === value) ?? options[0];

  useEffect(() => {
    if (!open) return;
    const onDoc = (event: MouseEvent) => {
      if (!root.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  function choose(option: SelectOption) {
    onChange(option.value);
    setOpen(false);
  }

  function onTriggerKey(event: React.KeyboardEvent<HTMLButtonElement>) {
    if (event.key === "ArrowDown" || event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      setOpen(true);
      const index = Math.max(0, options.findIndex((option) => option.value === value));
      setActive(index);
      return;
    }
    if (!open) return;
    if (event.key === "ArrowUp") {
      event.preventDefault();
      setActive((i) => (i - 1 + options.length) % options.length);
    }
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActive((i) => (i + 1) % options.length);
    }
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      const option = options[active];
      if (option) choose(option);
    }
  }

  return (
    <div ref={root} className="relative w-full sm:w-[16rem]">
      <span id={labelId} className="mb-1 block text-sm text-stone-600">
        {label}
      </span>
      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-labelledby={labelId}
        aria-controls={listId}
        onClick={() => setOpen((v) => !v)}
        onKeyDown={onTriggerKey}
        className="flex w-full items-center justify-between gap-3 border border-[#cfc6b8] bg-white px-3 py-2.5 text-left text-base text-ink outline-none ring-leaf/30 hover:border-leaf focus-visible:ring-2"
      >
        <span>{selected?.label}</span>
        <svg
          className={`h-4 w-4 shrink-0 text-leaf transition ${open ? "rotate-180" : ""}`}
          viewBox="0 0 20 20"
          fill="none"
          aria-hidden="true"
        >
          <path d="M5 7.5 10 12.5 15 7.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
      {open ? (
        <ul
          id={listId}
          role="listbox"
          aria-labelledby={labelId}
          className="absolute z-20 mt-1 w-full overflow-hidden border border-[#cfc6b8] bg-white py-1 shadow-lg"
        >
          {options.map((option, index) => {
            const isSelected = option.value === value;
            return (
              <li key={option.value || "any"} role="option" aria-selected={isSelected}>
                <button
                  type="button"
                  className={`flex w-full items-center justify-between px-3 py-2.5 text-left text-sm ${
                    index === active || isSelected ? "bg-[#f7fbf5] text-leaf" : "text-ink hover:bg-stone-50"
                  }`}
                  onMouseEnter={() => setActive(index)}
                  onClick={() => choose(option)}
                >
                  {option.label}
                  {isSelected ? <span aria-hidden="true">✓</span> : null}
                </button>
              </li>
            );
          })}
        </ul>
      ) : null}
    </div>
  );
}
