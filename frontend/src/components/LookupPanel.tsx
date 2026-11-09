"use client";

import { BookingStatus, formErrors, lookupQuerySchema } from "@willow/shared";
import type { Booking, SlotWithAvailability } from "@willow/shared";
import { FormEvent, useState } from "react";
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

function formatTime(iso: string) {
  return new Intl.DateTimeFormat("en-GB", { hour: "2-digit", minute: "2-digit" }).format(new Date(iso));
}

function GridIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
      <rect x="1" y="1" width="6" height="6" />
      <rect x="9" y="1" width="6" height="6" />
      <rect x="1" y="9" width="6" height="6" />
      <rect x="9" y="9" width="6" height="6" />
    </svg>
  );
}

function ListIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
      <rect x="1" y="2" width="14" height="2" />
      <rect x="1" y="7" width="14" height="2" />
      <rect x="1" y="12" width="14" height="2" />
    </svg>
  );
}

type LookupPanelProps = {
  lookupQuery: string;
  lookupErr: string;
  lookupApiError: string;
  nextCursor: string | null;
  lookupBusy: boolean;
  loadingMore: boolean;
  cancellingId: string | null;
  lookedUp: boolean;
  lookupResults: Booking[];
  slotById: Map<string, SlotWithAvailability>;
  onLookupQueryChange: (value: string) => void;
  onLookupErr: (value: string) => void;
  onLookup: (event: FormEvent) => void;
  onLoadMore: () => void;
  onCancel: (id: string) => Promise<void>;
  onCopyId: (id: string) => void;
};

export function LookupPanel({
  lookupQuery,
  lookupErr,
  lookupApiError,
  nextCursor,
  lookupBusy,
  loadingMore,
  cancellingId,
  lookedUp,
  lookupResults,
  slotById,
  onLookupQueryChange,
  onLookupErr,
  onLookup,
  onLoadMore,
  onCancel,
  onCopyId,
}: LookupPanelProps) {
  const [layout, setLayout] = useState<"grid" | "list">("list");
  const [pendingCancel, setPendingCancel] = useState<Booking | null>(null);
  const [detail, setDetail] = useState<Booking | null>(null);
  const pendingSlot = pendingCancel ? slotById.get(pendingCancel.slot_id) : undefined;
  const detailSlot = detail ? slotById.get(detail.slot_id) : undefined;
  const showResults = lookedUp && !lookupBusy;

  async function confirmCancel() {
    if (!pendingCancel) return;
    const id = pendingCancel.id;
    await onCancel(id);
    setPendingCancel(null);
    setDetail((current) => (current?.id === id ? null : current));
  }

  return (
    <section>
      <h2 className="font-serif text-3xl font-semibold sm:text-4xl">Look up a confirmation</h2>
      <p className="mt-2 max-w-xl text-stone-600">
        Search by booking id or by the email used when you booked. Email results are listed ten at a time.
      </p>
      <form onSubmit={onLookup} className="mt-6 border border-[#cfc6b8] bg-[#fffdf8] p-4 sm:p-5" noValidate>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
          <div className="min-w-0 flex-1">
            <Field
              label="Booking id or email"
              value={lookupQuery}
              error={lookupErr}
              autoComplete="off"
              spellCheck={false}
              placeholder="e.g. ada@example.com or 3fa85f64-5717-4562-b3fc-2c963f66afa6"
              onBlur={() => {
                const parsed = lookupQuerySchema.safeParse({ query: lookupQuery });
                onLookupErr(parsed.success ? "" : (formErrors(parsed.error).query ?? ""));
              }}
              onChange={(event) => {
                onLookupQueryChange(event.target.value);
                if (lookupErr) onLookupErr("");
              }}
            />
          </div>
          <button
            className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 bg-leaf px-5 font-semibold text-white disabled:opacity-60 sm:mt-6"
            disabled={lookupBusy}
            type="submit"
          >
            {lookupBusy ? <Spinner /> : null}
            {lookupBusy ? "Searching" : "Search"}
          </button>
        </div>
      </form>
      {lookupApiError ? <p className="mt-4 text-red-800">{lookupApiError}</p> : null}
      {showResults && lookupResults.length > 0 ? (
        <div className="mt-4 flex justify-end">
          <div className="inline-flex w-full border border-[#cfc6b8] bg-white sm:w-auto" role="group" aria-label="Booking layout">
            <button
              className={`inline-flex min-h-11 flex-1 items-center justify-center gap-2 px-3 py-2 text-sm sm:flex-none ${
                layout === "grid" ? "bg-ink text-white" : "text-stone-600 hover:bg-[#f7f3ea]"
              }`}
              type="button"
              aria-pressed={layout === "grid"}
              onClick={() => setLayout("grid")}
            >
              <GridIcon />
              Grid
            </button>
            <button
              className={`inline-flex min-h-11 flex-1 items-center justify-center gap-2 border-l border-[#cfc6b8] px-3 py-2 text-sm sm:flex-none ${
                layout === "list" ? "bg-ink text-white" : "text-stone-600 hover:bg-[#f7f3ea]"
              }`}
              type="button"
              aria-pressed={layout === "list"}
              onClick={() => setLayout("list")}
            >
              <ListIcon />
              List
            </button>
          </div>
        </div>
      ) : null}
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
        <div className={`mt-4 grid gap-3 ${layout === "grid" ? "sm:grid-cols-2" : ""}`}>
          {lookupResults.map((booking) => {
            const slot = slotById.get(booking.slot_id);
            const cancelling = cancellingId === booking.id;
            const cancelled = booking.status === BookingStatus.CANCELLED;
            return (
              <article
                key={booking.id}
                className={`border bg-[#fffdf8] ${cancelled ? "border-[#e4dccf] opacity-80" : "border-[#cfc6b8]"}`}
              >
                <button
                  className="w-full p-5 text-left"
                  type="button"
                  onClick={() => setDetail(booking)}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-serif text-xl">{slot?.provider ?? "Appointment"}</p>
                      <p className="text-stone-600">{slot ? formatWhen(slot.start) : booking.slot_id}</p>
                    </div>
                    <span
                      className={`shrink-0 px-2.5 py-1 text-xs font-medium ${
                        cancelled ? "bg-red-100 text-red-800" : "bg-[#e7f0e4] text-leaf"
                      }`}
                    >
                      {cancelled ? "Cancelled" : "Confirmed"}
                    </span>
                  </div>
                  {layout === "list" ? (
                    <>
                      <p className="mt-3 text-sm text-stone-600">
                        <span className="font-medium text-ink">{booking.name}</span>
                        <span className="mx-1.5 text-[#cfc6b8]">·</span>
                        <span className="break-all">{booking.email}</span>
                      </p>
                      <p className="mt-1 text-sm text-stone-500">Booked {formatWhen(booking.created_at)}</p>
                    </>
                  ) : (
                    <p className="mt-3 truncate text-sm text-stone-600">{booking.name}</p>
                  )}
                </button>
                {layout === "list" ? (
                  <div className="flex flex-wrap items-center justify-between gap-3 px-5 pb-5">
                    <div className="flex min-w-0 max-w-full items-center gap-2 bg-[#f3efe6] px-3 py-2">
                      <span className="min-w-0 truncate font-mono text-xs text-stone-600">{booking.id}</span>
                      <button
                        className="shrink-0 px-2 py-1 text-sm font-medium text-leaf hover:bg-white"
                        type="button"
                        onClick={() => void onCopyId(booking.id)}
                      >
                        Copy
                      </button>
                    </div>
                    {booking.status === BookingStatus.CONFIRMED ? (
                      <button
                        className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 border border-red-800 px-5 font-semibold text-red-800 disabled:opacity-60"
                        type="button"
                        disabled={cancelling}
                        onClick={() => setPendingCancel(booking)}
                      >
                        {cancelling ? <Spinner /> : null}
                        {cancelling ? "Cancelling" : "Cancel"}
                      </button>
                    ) : null}
                  </div>
                ) : null}
              </article>
            );
          })}
          {lookedUp && !lookupBusy && lookupResults.length === 0 && !lookupApiError ? (
            <p className="text-stone-600">There are no bookings to show for that search.</p>
          ) : null}
        </div>
      )}
      {nextCursor ? (
        <div className="mt-6 border border-[#cfc6b8] bg-[#fffdf8] px-5 py-6 text-center">
          <p className="text-stone-600">There are more bookings for this email.</p>
          <p className="mt-1 text-sm text-stone-500">We show ten at a time.</p>
          <button
            className="mt-4 inline-flex min-h-11 items-center justify-center gap-2 bg-ink px-5 font-semibold text-white disabled:opacity-60"
            type="button"
            disabled={loadingMore}
            onClick={() => void onLoadMore()}
          >
            {loadingMore ? <Spinner /> : null}
            {loadingMore ? "Loading" : "Load more"}
          </button>
        </div>
      ) : null}
      {detail ? (
        <div className="willow-overlay fixed inset-0 z-20 grid place-items-end bg-ink/40 p-0 sm:place-items-center sm:p-4">
          <div
            className="willow-sheet w-full border-t border-[#cfc6b8] bg-[#fffdf8] p-5 shadow-xl sm:max-w-md sm:border sm:p-6"
            role="dialog"
            aria-modal="true"
            aria-labelledby="booking-detail-title"
          >
            <p className="text-sm text-leaf">
              {detail.status === BookingStatus.CANCELLED ? "Cancelled" : "Confirmed"}
            </p>
            <h3 id="booking-detail-title" className="font-serif text-2xl">
              Booking details
            </h3>
            <dl className="mt-4 grid gap-3">
              <div>
                <dt className="text-xs uppercase text-stone-500">Appointment</dt>
                <dd>
                  {detailSlot
                    ? `${detailSlot.provider} · ${formatWhen(detailSlot.start)} – ${formatTime(detailSlot.end)}`
                    : detail.slot_id}
                </dd>
              </div>
              <div>
                <dt className="text-xs uppercase text-stone-500">Patient</dt>
                <dd className="font-serif text-xl">{detail.name}</dd>
              </div>
              <div>
                <dt className="text-xs uppercase text-stone-500">Email</dt>
                <dd className="break-all">{detail.email}</dd>
              </div>
              <div>
                <dt className="text-xs uppercase text-stone-500">Booked</dt>
                <dd>{formatWhen(detail.created_at)}</dd>
              </div>
              <div>
                <dt className="text-xs uppercase text-stone-500">Booking id</dt>
                <dd className="mt-1 flex items-center gap-2">
                  <span className="min-w-0 break-all font-mono text-sm">{detail.id}</span>
                  <button
                    className="shrink-0 border border-[#cfc6b8] px-2.5 py-1.5 text-sm"
                    type="button"
                    onClick={() => void onCopyId(detail.id)}
                  >
                    Copy
                  </button>
                </dd>
              </div>
            </dl>
            <div className="mt-5 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <button className="min-h-11 border border-[#cfc6b8] px-4" type="button" onClick={() => setDetail(null)}>
                Close
              </button>
              {detail.status === BookingStatus.CONFIRMED ? (
                <button
                  className="min-h-11 bg-red-800 px-4 font-semibold text-white"
                  type="button"
                  onClick={() => {
                    setPendingCancel(detail);
                    setDetail(null);
                  }}
                >
                  Cancel appointment
                </button>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}
      {pendingCancel ? (
        <div className="willow-overlay fixed inset-0 z-30 grid place-items-end bg-ink/40 p-0 sm:place-items-center sm:p-4">
          <div
            className="willow-sheet w-full border-t border-[#cfc6b8] bg-[#fffdf8] p-5 shadow-xl sm:max-w-md sm:border sm:p-6"
            role="dialog"
            aria-modal="true"
            aria-labelledby="cancel-title"
          >
            <p className="text-sm text-leaf">Cancel booking</p>
            <h3 id="cancel-title" className="font-serif text-2xl">
              Cancel this appointment?
            </h3>
            <p className="mt-2 text-stone-600">
              {pendingSlot
                ? `${pendingSlot.provider} · ${formatWhen(pendingSlot.start)}`
                : pendingCancel.slot_id}
            </p>
            <p className="mt-3 text-stone-600">The slot will be free for someone else.</p>
            <div className="mt-5 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <button
                className="min-h-11 border border-[#cfc6b8] px-4"
                type="button"
                disabled={cancellingId === pendingCancel.id}
                onClick={() => setPendingCancel(null)}
              >
                Keep booking
              </button>
              <button
                className="inline-flex min-h-11 items-center justify-center gap-2 bg-red-800 px-4 font-semibold text-white disabled:opacity-60"
                type="button"
                disabled={cancellingId === pendingCancel.id}
                onClick={() => void confirmCancel()}
              >
                {cancellingId === pendingCancel.id ? <Spinner /> : null}
                {cancellingId === pendingCancel.id ? "Cancelling" : "Cancel appointment"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
