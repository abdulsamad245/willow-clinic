"use client";

import { bookFormSchema, formErrors, lookupEmailSchema, lookupIdSchema, type FormErrors } from "@willow/shared";
import type { Booking, SlotWithAvailability } from "@willow/shared";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { cancelBooking, createBooking, getBooking, listBookings, listSlots } from "@/lib/api";
import { Field } from "@/components/Field";
import { SelectDropdown } from "@/components/SelectDropdown";
import { Spinner } from "@/components/Spinner";
import { useToast } from "@/components/Toast";

function dayKey(iso: string) {
  return iso.slice(0, 10);
}

function formatDay(iso: string) {
  return new Intl.DateTimeFormat("en-GB", { weekday: "long", day: "numeric", month: "long" }).format(new Date(iso));
}

function formatWeekday(iso: string) {
  return new Intl.DateTimeFormat("en-GB", { weekday: "short" }).format(new Date(iso));
}

function formatDayNum(iso: string) {
  return new Intl.DateTimeFormat("en-GB", { day: "numeric" }).format(new Date(iso));
}

function formatMonth(iso: string) {
  return new Intl.DateTimeFormat("en-GB", { month: "short" }).format(new Date(iso));
}

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

function SlotSkeleton({ layout }: { layout: "grid" | "list" }) {
  return (
    <div className="mt-5" aria-hidden="true">
      <div className="flex gap-2 overflow-hidden">
        {Array.from({ length: 5 }).map((_, index) => (
          <div key={index} className="skeleton h-[4.5rem] w-[4.5rem] shrink-0" />
        ))}
      </div>
      {layout === "list" ? (
        <div className="mt-5 border border-[#cfc6b8] bg-[#fffdf8]">
          {Array.from({ length: 6 }).map((_, index) => (
            <div key={index} className="flex items-center justify-between gap-3 border-b border-[#efe8dc] px-4 py-3 last:border-b-0">
              <div className="grid gap-2">
                <div className="skeleton h-4 w-36" />
                <div className="skeleton h-3 w-20" />
              </div>
              <div className="skeleton h-9 w-16" />
            </div>
          ))}
        </div>
      ) : (
        <div className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-3">
          {Array.from({ length: 9 }).map((_, index) => (
            <div key={index} className="skeleton h-20" />
          ))}
        </div>
      )}
    </div>
  );
}

export function BookingApp() {
  const { toast } = useToast();
  const [view, setView] = useState<"book" | "lookup">("book");
  const [slotView, setSlotView] = useState<"grid" | "list">("grid");
  const [slots, setSlots] = useState<SlotWithAvailability[]>([]);
  const [provider, setProvider] = useState("");
  const [doctors, setDoctors] = useState<string[]>([]);
  const [slotsLoading, setSlotsLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [selected, setSelected] = useState<SlotWithAvailability | null>(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [formErr, setFormErr] = useState<FormErrors>({});
  const [submitError, setSubmitError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [ticket, setTicket] = useState<Booking | null>(null);
  const [lookupId, setLookupId] = useState("");
  const [lookupEmail, setLookupEmail] = useState("");
  const [lookupResults, setLookupResults] = useState<Booking[]>([]);
  const [idErr, setIdErr] = useState("");
  const [emailErr, setEmailErr] = useState("");
  const [lookupApiError, setLookupApiError] = useState("");
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [lookupBusy, setLookupBusy] = useState<"id" | "email" | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [lookedUp, setLookedUp] = useState(false);
  const [now, setNow] = useState(0);
  const [activeDay, setActiveDay] = useState("");

  async function refresh(nextProvider = provider) {
    setSlotsLoading(true);
    setLoadError("");
    try {
      const all = await listSlots();
      setDoctors([...new Set(all.slots.map((slot) => slot.provider))]);
      const data = nextProvider ? await listSlots(nextProvider) : all;
      setSlots(data.slots);
    } catch (err) {
      const message = err instanceof Error ? err.message : "We couldn't load the timetable just now.";
      setLoadError(message);
      toast(message, "error");
    } finally {
      setSlotsLoading(false);
    }
  }

  useEffect(() => {
    setNow(Date.now());
    void refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const upcoming = useMemo(
    () => slots.filter((slot) => new Date(slot.start).getTime() > now),
    [slots, now]
  );

  const days = useMemo(() => {
    const map = new Map<string, SlotWithAvailability[]>();
    for (const slot of upcoming) {
      const key = dayKey(slot.start);
      const list = map.get(key) ?? [];
      list.push(slot);
      map.set(key, list);
    }
    return [...map.entries()].map(([key, daySlots]) => ({
      key,
      sample: daySlots[0].start,
      slots: daySlots,
      open: daySlots.filter((slot) => slot.available).length,
    }));
  }, [upcoming]);

  useEffect(() => {
    if (days.length === 0) {
      setActiveDay("");
      return;
    }
    if (!days.some((day) => day.key === activeDay)) {
      setActiveDay(days[0].key);
    }
  }, [days, activeDay]);

  const dayIndex = Math.max(0, days.findIndex((day) => day.key === activeDay));
  const current = days[dayIndex] ?? days[0];
  const daySlots = current?.slots ?? [];
  const slotById = useMemo(() => new Map(slots.map((slot) => [slot.id, slot])), [slots]);

  function pickSlot(slot: SlotWithAvailability) {
    setSelected(slot);
    setSubmitError("");
    setFormErr({});
  }

  function goDay(delta: number) {
    const next = days[dayIndex + delta];
    if (next) setActiveDay(next.key);
  }

  function blurName() {
    const parsed = bookFormSchema.pick({ name: true }).safeParse({ name });
    setFormErr((prev) => ({ ...prev, name: parsed.success ? undefined : parsed.error.issues[0]?.message }));
  }

  function blurEmail() {
    const parsed = bookFormSchema.pick({ email: true }).safeParse({ email });
    setFormErr((prev) => ({ ...prev, email: parsed.success ? undefined : parsed.error.issues[0]?.message }));
  }

  async function onBook(event: FormEvent) {
    event.preventDefault();
    if (!selected) return;
    const parsed = bookFormSchema.safeParse({ name, email });
    if (!parsed.success) {
      setFormErr(formErrors(parsed.error));
      return;
    }
    setFormErr({});
    setSubmitError("");
    setSubmitting(true);
    try {
      const booking = await createBooking({
        slot_id: selected.id,
        name: parsed.data.name,
        email: parsed.data.email,
      });
      setTicket(booking);
      setSelected(null);
      setName("");
      setEmail("");
      toast("Appointment confirmed");
      await refresh();
    } catch (err) {
      const message = err instanceof Error ? err.message : "We couldn't complete that booking.";
      setSubmitError(message);
      toast(message, "error");
    } finally {
      setSubmitting(false);
    }
  }

  async function onLookupId(event: FormEvent) {
    event.preventDefault();
    const parsed = lookupIdSchema.safeParse({ id: lookupId });
    if (!parsed.success) {
      setIdErr(formErrors(parsed.error).id ?? "Please paste the booking id from your confirmation.");
      return;
    }
    setIdErr("");
    setLookupApiError("");
    setNextCursor(null);
    setLookupBusy("id");
    setLookedUp(true);
    try {
      const booking = await getBooking(parsed.data.id);
      setLookupResults([booking]);
    } catch (err) {
      const message = err instanceof Error ? err.message : "We couldn't find a booking with that id.";
      setLookupResults([]);
      setLookupApiError(message);
    } finally {
      setLookupBusy(null);
    }
  }

  async function onLookupEmail(event: FormEvent) {
    event.preventDefault();
    const parsed = lookupEmailSchema.safeParse({ email: lookupEmail });
    if (!parsed.success) {
      setEmailErr(formErrors(parsed.error).email ?? "Please enter the email used when booking.");
      return;
    }
    setEmailErr("");
    setLookupApiError("");
    setLookupBusy("email");
    setLookedUp(true);
    try {
      const data = await listBookings(parsed.data.email);
      setLookupResults(data.bookings);
      setNextCursor(data.next_cursor);
      if (data.bookings.length === 0) {
        setLookupApiError("We couldn't find any bookings for that email.");
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "We couldn't list bookings for that email.";
      setLookupResults([]);
      setNextCursor(null);
      setLookupApiError(message);
    } finally {
      setLookupBusy(null);
    }
  }

  async function onLoadMore() {
    if (!nextCursor || loadingMore) return;
    setLoadingMore(true);
    try {
      const data = await listBookings(lookupEmail, nextCursor);
      setLookupResults((rows) => [...rows, ...data.bookings]);
      setNextCursor(data.next_cursor);
    } catch (err) {
      toast(err instanceof Error ? err.message : "We couldn't load the next page.", "error");
    } finally {
      setLoadingMore(false);
    }
  }

  async function onCancel(id: string) {
    setCancellingId(id);
    try {
      const cancelled = await cancelBooking(id);
      setLookupResults((rows) => rows.map((row) => (row.id === id ? cancelled : row)));
      toast("Booking cancelled");
      await refresh();
    } catch (err) {
      const message = err instanceof Error ? err.message : "We couldn't cancel that booking.";
      setLookupApiError(message);
      toast(message, "error");
    } finally {
      setCancellingId(null);
    }
  }

  async function copyId(id: string) {
    try {
      await navigator.clipboard.writeText(id);
      toast("Booking id copied");
    } catch {
      toast("We couldn't copy that id.", "error");
    }
  }

  return (
    <div className="mx-auto w-full max-w-[1080px] px-4 py-6 sm:px-6 sm:py-8 pb-24">
      <header className="mb-8 flex flex-col gap-4 border-b border-[#cfc6b8] pb-5 sm:mb-10 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm text-leaf">Family practice, Yaba, Lagos</p>
          <h1 className="font-serif text-[2rem] font-semibold leading-none tracking-tight sm:text-4xl">Willow Clinic</h1>
        </div>
        <nav className="flex gap-5 text-sm sm:gap-6" aria-label="Primary">
          <button
            className={`min-h-11 pb-1 ${view === "book" ? "border-b-2 border-leaf font-semibold text-ink" : "text-stone-500"}`}
            type="button"
            aria-pressed={view === "book"}
            onClick={() => setView("book")}
          >
            Book
          </button>
          <button
            className={`min-h-11 pb-1 ${view === "lookup" ? "border-b-2 border-leaf font-semibold text-ink" : "text-stone-500"}`}
            type="button"
            aria-pressed={view === "lookup"}
            onClick={() => setView("lookup")}
          >
            Find a booking
          </button>
        </nav>
      </header>

      {view === "book" ? (
        <section>
          <h2 className="max-w-xl font-serif text-3xl font-semibold leading-tight sm:text-4xl">Pick a day, then a time</h2>
          <p className="mt-3 max-w-xl text-base text-stone-600 sm:text-lg">
            One clinic day at a time. Book with Dr Ade, Dr Nkechi, or Dr Tunde and keep the confirmation number.
          </p>

          <div className="mt-6 flex flex-col gap-4 sm:mt-8 sm:flex-row sm:items-end sm:justify-between">
            <SelectDropdown
              label="Doctor"
              value={provider}
              options={[
                { value: "", label: "Any doctor" },
                ...doctors.map((item) => ({ value: item, label: item })),
              ]}
              onChange={(value) => {
                setProvider(value);
                void refresh(value);
              }}
            />
            <div className="inline-flex w-full border border-[#cfc6b8] bg-white sm:w-auto" role="group" aria-label="Slot layout">
              <button
                className={`inline-flex min-h-11 flex-1 items-center justify-center gap-2 px-3 py-2 text-sm sm:flex-none ${
                  slotView === "grid" ? "bg-ink text-white" : "text-stone-600 hover:bg-[#f7f3ea]"
                }`}
                type="button"
                aria-pressed={slotView === "grid"}
                onClick={() => setSlotView("grid")}
              >
                <GridIcon />
                Grid
              </button>
              <button
                className={`inline-flex min-h-11 flex-1 items-center justify-center gap-2 border-l border-[#cfc6b8] px-3 py-2 text-sm sm:flex-none ${
                  slotView === "list" ? "bg-ink text-white" : "text-stone-600 hover:bg-[#f7f3ea]"
                }`}
                type="button"
                aria-pressed={slotView === "list"}
                onClick={() => setSlotView("list")}
              >
                <ListIcon />
                List
              </button>
            </div>
          </div>

          {loadError ? <p className="mt-6 text-red-800">{loadError}</p> : null}

          <div aria-busy={slotsLoading} aria-live="polite">
            {slotsLoading ? <SlotSkeleton layout={slotView} /> : null}
            {!slotsLoading && !loadError && days.length === 0 ? (
              <p className="mt-6 text-stone-600">No upcoming slots for this doctor yet.</p>
            ) : null}

            {!slotsLoading && current ? (
              <div className="mt-6">
                <div className="flex items-center gap-2">
                  <button
                    className="hidden min-h-11 min-w-11 shrink-0 border border-[#cfc6b8] bg-white text-lg disabled:opacity-30 sm:grid sm:place-items-center"
                    type="button"
                    aria-label="Previous day"
                    disabled={dayIndex <= 0}
                    onClick={() => goDay(-1)}
                  >
                    ‹
                  </button>
                  <div className="flex snap-x gap-2 overflow-x-auto p-px pb-1" role="tablist" aria-label="Clinic days">
                    {days.map((day) => {
                      const selectedDay = day.key === current.key;
                      return (
                        <button
                          key={day.key}
                          type="button"
                          role="tab"
                          aria-selected={selectedDay}
                          onClick={() => setActiveDay(day.key)}
                          className={`snap-start shrink-0 border px-3 py-2 text-left ${
                            selectedDay ? "border-ink bg-ink text-white" : "border-[#cfc6b8] bg-[#fffdf8] text-ink"
                          }`}
                        >
                          <span className="block text-xs uppercase tracking-wide opacity-80">{formatWeekday(day.sample)}</span>
                          <span className="block font-serif text-2xl leading-none">{formatDayNum(day.sample)}</span>
                          <span className="mt-1 block text-xs">
                            {formatMonth(day.sample)} · {day.open} open
                          </span>
                        </button>
                      );
                    })}
                  </div>
                  <button
                    className="hidden min-h-11 min-w-11 shrink-0 border border-[#cfc6b8] bg-white text-lg disabled:opacity-30 sm:grid sm:place-items-center"
                    type="button"
                    aria-label="Next day"
                    disabled={dayIndex >= days.length - 1}
                    onClick={() => goDay(1)}
                  >
                    ›
                  </button>
                </div>

                <div className="mt-3 flex items-center gap-2 sm:hidden">
                  <button
                    className="min-h-11 flex-1 border border-[#cfc6b8] bg-white px-3 text-sm disabled:opacity-30"
                    type="button"
                    disabled={dayIndex <= 0}
                    onClick={() => goDay(-1)}
                  >
                    Previous
                  </button>
                  <button
                    className="min-h-11 flex-1 border border-[#cfc6b8] bg-white px-3 text-sm disabled:opacity-30"
                    type="button"
                    disabled={dayIndex >= days.length - 1}
                    onClick={() => goDay(1)}
                  >
                    Next
                  </button>
                </div>

                <div className="mt-5 flex flex-wrap items-end justify-between gap-2 border-b border-[#cfc6b8] pb-2">
                  <h3 className="font-serif text-2xl sm:text-3xl">{formatDay(current.sample)}</h3>
                  <p className="text-sm text-stone-600">
                    {current.open} open · {daySlots.length} slots · day {dayIndex + 1} of {days.length}
                  </p>
                </div>

                {slotView === "grid" ? (
                  <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
                    {daySlots.map((slot) => (
                      <button
                        key={slot.id}
                        type="button"
                        disabled={!slot.available}
                        onClick={() => pickSlot(slot)}
                        className={`min-h-[4.5rem] border border-[#cfc6b8] border-l-4 px-3 py-3 text-left ${
                          slot.available
                            ? "border-l-leaf bg-[#fffdf8] hover:bg-[#f7fbf5]"
                            : "cursor-not-allowed border-l-[#d9d1c3] bg-[#f3efe6] text-stone-400 line-through"
                        }`}
                      >
                        <span className="block font-serif text-xl leading-none">{formatTime(slot.start)}</span>
                        <span className="mt-1 block text-sm text-stone-500">{slot.provider}</span>
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="mt-4 overflow-x-auto border border-[#cfc6b8] bg-[#fffdf8]">
                    <table className="w-full min-w-[28rem] text-left text-sm">
                      <thead className="border-b border-[#cfc6b8] bg-[#f7f3ea] text-stone-600">
                        <tr>
                          <th className="px-4 py-3 font-medium">Time</th>
                          <th className="px-4 py-3 font-medium">Doctor</th>
                          <th className="px-4 py-3 font-medium">Status</th>
                          <th className="px-4 py-3 font-medium">
                            <span className="sr-only">Book</span>
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {daySlots.map((slot) => (
                          <tr key={slot.id} className="border-b border-[#efe8dc] last:border-b-0">
                            <td className="px-4 py-3 font-serif text-lg">{formatTime(slot.start)}</td>
                            <td className="px-4 py-3">{slot.provider}</td>
                            <td className="px-4 py-3">{slot.available ? "Open" : "Taken"}</td>
                            <td className="px-4 py-3 text-right">
                              {slot.available ? (
                                <button
                                  className="min-h-11 border border-leaf px-3 font-semibold text-leaf"
                                  type="button"
                                  onClick={() => pickSlot(slot)}
                                >
                                  Book
                                </button>
                              ) : null}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            ) : null}
          </div>
        </section>
      ) : (
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
                    setIdErr(parsed.success ? "" : (formErrors(parsed.error).id ?? ""));
                  }}
                  onChange={(event) => {
                    setLookupId(event.target.value);
                    if (idErr) setIdErr("");
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
                    setEmailErr(parsed.success ? "" : (formErrors(parsed.error).email ?? ""));
                  }}
                  onChange={(event) => {
                    setLookupEmail(event.target.value);
                    if (emailErr) setEmailErr("");
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
                      <span className={`px-2 py-1 text-xs uppercase ${booking.status === "cancelled" ? "bg-red-100 text-red-800" : "bg-[#e7f0e4] text-leaf"}`}>
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
                      <button className="min-h-11 border border-[#cfc6b8] px-3 text-sm" type="button" onClick={() => void copyId(booking.id)}>
                        Copy id
                      </button>
                      {booking.status === "confirmed" ? (
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
                <p className="text-stone-600">No bookings to show yet.</p>
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
      )}

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
                onBlur={blurName}
                onChange={(event) => {
                  setName(event.target.value);
                  if (formErr.name) setFormErr((prev) => ({ ...prev, name: undefined }));
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
                onBlur={blurEmail}
                onChange={(event) => {
                  setEmail(event.target.value);
                  if (formErr.email) setFormErr((prev) => ({ ...prev, email: undefined }));
                }}
              />
            </div>
            {submitError ? <p className="mt-3 text-red-800">{submitError}</p> : null}
            <div className="mt-5 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <button className="min-h-11 border border-[#cfc6b8] px-4" type="button" onClick={() => setSelected(null)}>
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
              <button className="min-h-11 border border-[#cfc6b8] px-4" type="button" onClick={() => void copyId(ticket.id)}>
                Copy id
              </button>
              <button className="min-h-11 bg-leaf px-4 font-semibold text-white" type="button" onClick={() => setTicket(null)}>
                Done
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
