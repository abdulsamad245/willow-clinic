"use client";

import {
  bookFormSchema,
  formErrors,
  lookupEmailSchema,
  lookupIdSchema,
  lookupQuerySchema,
  type FormErrors,
} from "@willow/shared";
import type { Booking, SlotWithAvailability } from "@willow/shared";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { BookSheet } from "@/components/BookSheet";
import { ClinicMark } from "@/components/ClinicMark";
import { LookupPanel } from "@/components/LookupPanel";
import { SlotBoard, type DayGroup } from "@/components/SlotBoard";
import { cancelBooking, createBooking, getBooking, listBookings, listSlots } from "@/lib/api";
import { userMessage } from "@/lib/errors";
import { useToast } from "@/components/Toast";

function dayKey(iso: string) {
  return iso.slice(0, 10);
}

export function BookingApp({ initialView = "book" }: { initialView?: "book" | "lookup" }) {
  const { toast } = useToast();
  const [view, setViewState] = useState<"book" | "lookup">(initialView);

  function setView(next: "book" | "lookup") {
    setViewState(next);
    const url = next === "lookup" ? "/?view=lookup" : "/";
    window.history.replaceState(null, "", url);
  }
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
  const [lookupQuery, setLookupQuery] = useState("");
  const [pagedEmail, setPagedEmail] = useState("");
  const [lookupResults, setLookupResults] = useState<Booking[]>([]);
  const [lookupErr, setLookupErr] = useState("");
  const [lookupApiError, setLookupApiError] = useState("");
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [lookupBusy, setLookupBusy] = useState(false);
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
      const message = userMessage(err, "We could not load the timetable just now. Please try again.");
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

  const days = useMemo((): DayGroup[] => {
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
      toast("Your appointment is confirmed successfully.");
      await refresh();
    } catch (err) {
      const message = userMessage(err, "We could not complete that booking. Please try again.");
      setSubmitError(message);
      toast(message, "error");
    } finally {
      setSubmitting(false);
    }
  }

  async function onLookup(event: FormEvent) {
    event.preventDefault();
    const parsed = lookupQuerySchema.safeParse({ query: lookupQuery });
    if (!parsed.success) {
      setLookupErr(formErrors(parsed.error).query ?? "Please enter a booking id or the email used when you booked.");
      return;
    }
    const query = parsed.data.query;
    setLookupErr("");
    setLookupApiError("");
    setLookedUp(true);
    setLookupBusy(true);

    if (query.includes("@")) {
      const emailParsed = lookupEmailSchema.safeParse({ email: query });
      if (!emailParsed.success) {
        setLookupBusy(false);
        setLookupErr(formErrors(emailParsed.error).email ?? "Please enter the email used when you booked.");
        return;
      }
      try {
        const data = await listBookings(emailParsed.data.email);
        setPagedEmail(emailParsed.data.email);
        setLookupResults(data.bookings);
        setNextCursor(data.next_cursor);
        if (data.bookings.length === 0) {
          setLookupApiError("We could not find any bookings for that email.");
        }
      } catch (err) {
        const message = userMessage(err, "We could not list bookings for that email. Please try again.");
        setLookupResults([]);
        setNextCursor(null);
        setPagedEmail("");
        setLookupApiError(message);
      } finally {
        setLookupBusy(false);
      }
      return;
    }

    const idParsed = lookupIdSchema.safeParse({ id: query });
    if (!idParsed.success) {
      setLookupBusy(false);
      setLookupErr(formErrors(idParsed.error).id ?? "Please paste the booking id.");
      return;
    }
    setPagedEmail("");
    setNextCursor(null);
    try {
      const booking = await getBooking(idParsed.data.id);
      setLookupResults([booking]);
    } catch (err) {
      const message = userMessage(err, "We could not find a booking with that booking id.");
      setLookupResults([]);
      setLookupApiError(message);
    } finally {
      setLookupBusy(false);
    }
  }

  async function onLoadMore() {
    if (!nextCursor || !pagedEmail || loadingMore) return;
    setLoadingMore(true);
    try {
      const data = await listBookings(pagedEmail, nextCursor);
      setLookupResults((rows) => [...rows, ...data.bookings]);
      setNextCursor(data.next_cursor);
    } catch (err) {
      toast(userMessage(err, "We could not load the next page. Please try again."), "error");
    } finally {
      setLoadingMore(false);
    }
  }

  async function onCancel(id: string) {
    setCancellingId(id);
    try {
      const cancelled = await cancelBooking(id);
      setLookupResults((rows) => rows.map((row) => (row.id === id ? cancelled : row)));
      toast("Your booking has been cancelled successfully.");
      await refresh();
    } catch (err) {
      const message = userMessage(err, "We could not cancel that booking. Please try again.");
      setLookupApiError(message);
      toast(message, "error");
    } finally {
      setCancellingId(null);
    }
  }

  async function copyId(id: string) {
    try {
      await navigator.clipboard.writeText(id);
      toast("Booking id copied successfully.");
    } catch {
      toast("We could not copy that booking id. Please copy it manually.", "error");
    }
  }

  return (
    <div className="mx-auto w-full max-w-[1080px] px-4 py-6 sm:px-6 sm:py-8 pb-24">
      <header className="mb-8 flex flex-col gap-4 border-b border-[#cfc6b8] pb-5 sm:mb-10 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-3">
            <ClinicMark className="size-8 shrink-0 sm:size-9" />
            <h1 className="font-serif text-[2rem] font-semibold leading-none tracking-tight sm:text-4xl">Willow Clinic</h1>
          </div>
          <p className="mt-1 pl-11 text-sm text-leaf sm:pl-12">Family practice, Yaba, Lagos</p>
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
      <nav className="mb-6 text-sm text-stone-500" aria-label="Breadcrumb">
        <ol className="flex flex-wrap items-center gap-2">
          <li>
            <button type="button" className="hover:text-leaf" onClick={() => setView("book")}>
              Home
            </button>
          </li>
          <li aria-hidden="true">/</li>
          <li>
            {view === "book" ? (
              <span className="font-medium text-ink" aria-current="page">
                Book
              </span>
            ) : (
              <button type="button" className="hover:text-leaf" onClick={() => setView("book")}>
                Book
              </button>
            )}
          </li>
          {view === "lookup" ? (
            <>
              <li aria-hidden="true">/</li>
              <li>
                <span className="font-medium text-ink" aria-current="page">
                  Find a booking
                </span>
              </li>
            </>
          ) : null}
        </ol>
      </nav>

      {view === "book" ? (
        <SlotBoard
          doctors={doctors}
          provider={provider}
          onProvider={(value) => {
            setProvider(value);
            void refresh(value);
          }}
          slotView={slotView}
          onSlotView={setSlotView}
          loadError={loadError}
          slotsLoading={slotsLoading}
          days={days}
          dayIndex={dayIndex}
          current={current}
          onDay={setActiveDay}
          onGoDay={goDay}
          onPick={pickSlot}
        />
      ) : (
        <LookupPanel
          lookupQuery={lookupQuery}
          lookupErr={lookupErr}
          lookupApiError={lookupApiError}
          nextCursor={nextCursor}
          lookupBusy={lookupBusy}
          loadingMore={loadingMore}
          cancellingId={cancellingId}
          lookedUp={lookedUp}
          lookupResults={lookupResults}
          slotById={slotById}
          onLookupQueryChange={setLookupQuery}
          onLookupErr={setLookupErr}
          onLookup={onLookup}
          onLoadMore={onLoadMore}
          onCancel={onCancel}
          onCopyId={copyId}
        />
      )}

      <BookSheet
        selected={selected}
        ticket={ticket}
        ticketSlot={ticket ? slotById.get(ticket.slot_id) : undefined}
        name={name}
        email={email}
        formErr={formErr}
        submitError={submitError}
        submitting={submitting}
        onName={setName}
        onEmail={setEmail}
        onClearNameError={() => setFormErr((prev) => ({ ...prev, name: undefined }))}
        onClearEmailError={() => setFormErr((prev) => ({ ...prev, email: undefined }))}
        onBlurName={blurName}
        onBlurEmail={blurEmail}
        onBook={onBook}
        onCloseSelected={() => setSelected(null)}
        onCloseTicket={() => setTicket(null)}
        onCopyId={copyId}
      />
    </div>
  );
}
