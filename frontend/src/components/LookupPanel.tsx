"use client";

import { BookingStatus, formErrors, lookupEmailSchema, lookupIdSchema } from "@willow/shared";
import type { Booking, SlotWithAvailability } from "@willow/shared";
import { FormEvent } from "react";
import { Field } from "@/components/Field";
import { Spinner } from "@/components/Spinner";

function formatWhen(iso: string) {
  return new Intl.DateTimeFormat("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));
}

type LookupPanelProps = {
  lookupId: string;
  lookupEmail: string;
  idErr: string;
  emailErr: string;
  lookupApiError: string;
  nextCursor: string | null;
  lookupBusy: "id" | "email" | null;
  loadingMore: boolean;
  cancellingId: string | null;
  lookedUp: boolean;
  lookupResults: Booking[];
  slotById: Map<string, SlotWithAvailability>;
  onLookupIdChange: (value: string) => void;
  onLookupEmailChange: (value: string) => void;
  onIdErr: (value: string) => void;
  onEmailErr: (value: string) => void;
  onLookupId: (event: FormEvent) => void;
  onLookupEmail: (event: FormEvent) => void;
  onLoadMore: () => void;
  onCancel: (id: string) => void;
  onCopyId: (id: string) => void;
};

export function LookupPanel({
  lookupId,
  lookupEmail,
  idErr,
  emailErr,
  lookupApiError,
  nextCursor,
  lookupBusy,
  loadingMore,
  cancellingId,
  lookedUp,
  lookupResults,
  slotById,
  onLookupIdChange,
  onLookupEmailChange,
  onIdErr,
  onEmailErr,
  onLookupId,
  onLookupEmail,
  onLoadMore,
  onCancel,
  onCopyId,
}: LookupPanelProps) {
  return (
    <section>
      <h2 className="font-serif text-3xl font-semibold sm:text-4xl">Look up a confirmation</h2>
      <p className="mt-2 max-w-xl text-stone-600">Use the booking id from your confirmation, or list bookings ten at a time by email.</p>
      <div className="mt-6 grid gap-px bg-[#cfc6b8] md:grid-cols-2">
        <form onSubmit={onLookupId} className="bg-[#fffdf8] p-4 sm:p-5" noValidate>
          <h3 className="font-serif text-xl">By confirmation number</h3>
          <div className="mt-4">
            <Field
              label="Booking id"
              value={lookupId}
              error={idErr}
              onBlur={() => {
                const parsed = lookupIdSchema.safeParse({ id: lookupId });
                onIdErr(parsed.success ? "" : (formErrors(parsed.error).id ?? ""));
              }}
              onChange={(event) => {
                onLookupIdChange(event.target.value);
                if (idErr) onIdErr("");
              }}
            />
          </div>
          <button
            className="mt-4 inline-flex min-h-11 w-full items-center justify-center gap-2 bg-leaf px-4 font-semibold text-white disabled:opacity-60 sm:w-auto"
            disabled={lookupBusy !== null}
            type="submit"
          >
            {lookupBusy === "id" ? <Spinner /> : null}
            {lookupBusy === "id" ? "Finding" : "Find booking"}
          </button>
        </form>
        <form onSubmit={onLookupEmail} className="bg-[#fffdf8] p-4 sm:p-5" noValidate>
          <h3 className="font-serif text-xl">By email</h3>
          <div className="mt-4">
            <Field
              label="Email"
              type="email"
              value={lookupEmail}
              error={emailErr}
              autoComplete="email"
              onBlur={() => {
                const parsed = lookupEmailSchema.safeParse({ email: lookupEmail });
                onEmailErr(parsed.success ? "" : (formErrors(parsed.error).email ?? ""));
              }}
              onChange={(event) => {
                onLookupEmailChange(event.target.value);
                if (emailErr) onEmailErr("");
              }}
            />
          </div>
          <button
            className="mt-4 inline-flex min-h-11 w-full items-center justify-center gap-2 bg-ink px-4 font-semibold text-white disabled:opacity-60 sm:w-auto"
            disabled={lookupBusy !== null}
            type="submit"
          >
            {lookupBusy === "email" ? <Spinner /> : null}
            {lookupBusy === "email" ? "Listing" : "List bookings"}
          </button>
        </form>
      </div>
      {lookupApiError ? <p className="mt-4 text-red-800">{lookupApiError}</p> : null}
      {lookupBusy ? (
        <div className="mt-4 grid gap-3" aria-busy="true">
          {Array.from({ length: 2 }).map((_, index) => (
            <div key={index} className="border border-[#cfc6b8] bg-[#fffdf8] p-5" aria-hidden="true">
              <div className="flex justify-between">
                <div className="skeleton h-5 w-40" />
                <div className="skeleton h-5 w-20" />
              </div>
              <div className="skeleton mt-3 h-4 w-56" />
              <div className="skeleton mt-2 h-4 w-72" />
            </div>
          ))}
        </div>
      ) : (
        <div className="mt-4 grid gap-3">
          {lookupResults.map((booking) => {
            const slot = slotById.get(booking.slot_id);
            const cancelling = cancellingId === booking.id;
            return (
              <article key={booking.id} className="border border-[#cfc6b8] bg-[#fffdf8] p-4 sm:p-5">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <strong className="break-words">{booking.name}</strong>
                  <span className={`px-2 py-1 text-xs uppercase ${booking.status === BookingStatus.CANCELLED ? "bg-red-100 text-red-800" : "bg-[#e7f0e4] text-leaf"}`}>
                    {booking.status}
                  </span>
                </div>
                <p className="break-all">{booking.email}</p>
                {slot ? (
                  <p className="text-sm text-stone-600">
                    {slot.provider} · {formatWhen(slot.start)}
                  </p>
                ) : null}
                <p className="break-all font-mono text-sm">{booking.id}</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <button className="min-h-11 border border-[#cfc6b8] px-3 text-sm" type="button" onClick={() => void onCopyId(booking.id)}>
                    Copy id
                  </button>
                  {booking.status === BookingStatus.CONFIRMED ? (
                    <button
                      className="inline-flex min-h-11 items-center gap-2 border border-[#cfc6b8] px-3 text-sm disabled:opacity-60"
                      type="button"
                      disabled={cancelling}
                      onClick={() => void onCancel(booking.id)}
                    >
                      {cancelling ? <Spinner /> : null}
                      {cancelling ? "Cancelling" : "Cancel booking"}
                    </button>
                  ) : null}
                </div>
              </article>
            );
          })}
          {lookedUp && !lookupBusy && lookupResults.length === 0 && !lookupApiError ? (
            <p className="text-stone-600">There are no bookings to show for that search.</p>
          ) : null}
        </div>
      )}
      {nextCursor ? (
        <button
          className="mt-4 inline-flex min-h-11 w-full items-center justify-center gap-2 bg-ink px-4 font-semibold text-white disabled:opacity-60 sm:w-auto"
          type="button"
          disabled={loadingMore}
          onClick={() => void onLoadMore()}
        >
          {loadingMore ? <Spinner /> : null}
          {loadingMore ? "Loading" : "Load more"}
        </button>
      ) : null}
    </section>
  );
}
