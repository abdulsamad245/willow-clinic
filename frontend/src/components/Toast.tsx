"use client";

import { createContext, useCallback, useContext, useState } from "react";

type Tone = "success" | "error";

type ToastItem = {
  id: string;
  message: string;
  tone: Tone;
};

type ToastContextValue = {
  toast: (message: string, tone?: Tone) => void;
};

const ToastContext = createContext<ToastContextValue | null>(null);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);

  const toast = useCallback((message: string, tone: Tone = "success") => {
    const id = crypto.randomUUID();
    setItems((rows) => [...rows, { id, message, tone }]);
    window.setTimeout(() => {
      setItems((rows) => rows.filter((row) => row.id !== id));
    }, 4200);
  }, []);

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <div
        id="willow-toasts"
        className="pointer-events-none fixed inset-x-0 top-5 z-[60] flex flex-col items-center gap-2 px-4"
        aria-live="polite"
        aria-relevant="additions"
      >
        {items.map((item) => (
          <p
            key={item.id}
            role="status"
            className={`willow-overlay pointer-events-auto w-full max-w-md border px-4 py-3 text-sm font-medium shadow-xl ${
              item.tone === "error"
                ? "border-red-900 bg-red-900 text-white"
                : "border-ink bg-ink text-white"
            }`}
          >
            {item.message}
          </p>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used inside ToastProvider");
  return ctx;
}
