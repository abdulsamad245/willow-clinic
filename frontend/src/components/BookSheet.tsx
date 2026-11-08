"use client";

import type { Booking, FormErrors, SlotWithAvailability } from "@willow/shared";
import { FormEvent } from "react";
import { Field } from "@/components/Field";
import { Spinner } from "@/components/Spinner";

function formatTime(iso: string) {
  return new Intl.DateTimeFormat("en-GB", { hour: "2-digit", minute: "2-digit" }).format(new Date(iso));
}

function formatWhen(iso: string) {
  return new Intl.DateTimeFormat("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));
}

type BookSheetProps = {
  selected: SlotWithAvailability | null;
  ticket: Booking | null;
  name: string;
  email: string;
  formErr: FormErrors;
  submitError: string;
  submitting: boolean;
  onName: (value: string) => void;
  onEmail: (value: string) => void;
  onClearNameError: () => void;
  onClearEmailError: () => void;
  onBlurName: () => void;
  onBlurEmail: () => void;
  onBook: (event: FormEvent) => void;
  onCloseSelected: () => void;
  onCloseTicket: () => void;
  onCopyId: (id: string) => void;
};

export function BookSheet({
  selected,
  ticket,
  name,
  email,
  formErr,
  submitError,
  submitting,
  onName,
  onEmail,
  onClearNameError,
  onClearEmailError,
  onBlurName,
  onBlurEmail,
  onBook,
  onCloseSelected,
  onCloseTicket,
  onCopyId,
}: BookSheetProps) {
  return (
    <>
      {selected ? (
        <div className="fixed inset-0 z-10 grid place-items-end bg-ink/40 p-0 sm:place-items-center sm:p-4">
          <form
            onSubmit={onBook}
            className="max-h-[100dvh] w-full overflow-y-auto border-t border-[#cfc6b8] bg-[#fffdf8] p-5 shadow-xl sm:max-h-none sm:max-w-md sm:border sm:p-6"
            noValidate
          >
            <p className="text-sm text-leaf">New booking</p>
            <h3 className="font-serif text-2xl">Confirm this slot</h3>
            <p className="text-stone-600">
              {selected.provider} · {formatWhen(selected.start)} – {formatTime(selected.end)}
            </p>
            <div className="mt-4">
              <Field
                label="Full name"
                autoComplete="name"
                value={name}
                error={formErr.name}
                onBlur={onBlurName}
                onChange={(event) => {
                  onName(event.target.value);
                  if (formErr.name) onClearNameError();
                }}
              />
            </div>
            <div className="mt-3">
              <Field
                label="Email"
                type="email"
                autoComplete="email"
                value={email}
                error={formErr.email}
                onBlur={onBlurEmail}
                onChange={(event) => {
                  onEmail(event.target.value);
                  if (formErr.email) onClearEmailError();
                }}
              />
            </div>
            {submitError ? <p className="mt-3 text-red-800">{submitError}</p> : null}
            <div className="mt-5 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <button className="min-h-11 border border-[#cfc6b8] px-4" type="button" onClick={onCloseSelected}>
                Back
              </button>
              <button
                className="inline-flex min-h-11 items-center justify-center gap-2 bg-leaf px-4 font-semibold text-white disabled:opacity-60"
                disabled={submitting}
                type="submit"
              >
                {submitting ? <Spinner /> : null}
                {submitting ? "Booking" : "Book slot"}
              </button>
            </div>
          </form>
        </div>
      ) : null}

      {ticket ? (
        <div className="fixed inset-0 z-20 grid place-items-end bg-ink/40 p-0 sm:place-items-center sm:p-4">
          <div className="w-full border-t border-[#cfc6b8] bg-[#fffdf8] p-5 shadow-xl sm:max-w-md sm:border sm:p-6">
            <p className="text-sm text-leaf">Confirmed</p>
            <h3 className="font-serif text-2xl">You are booked.</h3>
            <dl className="mt-4 grid gap-3">
              <div>
                <dt className="text-xs uppercase text-stone-500">Patient</dt>
                <dd className="font-serif text-xl">{ticket.name}</dd>
              </div>
              <div>
                <dt className="text-xs uppercase text-stone-500">Booking id</dt>
                <dd className="break-all font-mono text-sm">{ticket.id}</dd>
              </div>
            </dl>
            <div className="mt-5 flex flex-col-reverse gap-3 sm:flex-row">
              <button className="min-h-11 border border-[#cfc6b8] px-4" type="button" onClick={() => void onCopyId(ticket.id)}>
                Copy id
              </button>
              <button className="min-h-11 bg-leaf px-4 font-semibold text-white" type="button" onClick={onCloseTicket}>
                Done
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
