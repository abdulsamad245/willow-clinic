"use client";

import type { SlotWithAvailability } from "@willow/shared";
import { SelectDropdown } from "@/components/SelectDropdown";

export type DayGroup = {
  key: string;
  sample: string;
  slots: SlotWithAvailability[];
  open: number;
};

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

type SlotBoardProps = {
  doctors: string[];
  provider: string;
  onProvider: (value: string) => void;
  slotView: "grid" | "list";
  onSlotView: (value: "grid" | "list") => void;
  loadError: string;
  slotsLoading: boolean;
  days: DayGroup[];
  dayIndex: number;
  current?: DayGroup;
  onDay: (key: string) => void;
  onGoDay: (delta: number) => void;
  onPick: (slot: SlotWithAvailability) => void;
};

export function SlotBoard({
  doctors,
  provider,
  onProvider,
  slotView,
  onSlotView,
  loadError,
  slotsLoading,
  days,
  dayIndex,
  current,
  onDay,
  onGoDay,
  onPick,
}: SlotBoardProps) {
  const daySlots = current?.slots ?? [];

  return (
    <section>
      <h2 className="max-w-xl font-serif text-3xl font-semibold leading-tight sm:text-4xl">Pick a day, then a time</h2>
      <p className="mt-3 max-w-xl text-base text-stone-600 sm:text-lg">
        One clinic day at a time. Book with Dr Ade, Dr Nkechi, or Dr Tunde and keep the booking id.
      </p>

      <div className="mt-6 flex flex-col gap-4 sm:mt-8 sm:flex-row sm:items-end sm:justify-between">
        <SelectDropdown
          label="Doctor"
          value={provider}
          options={[
            { value: "", label: "Any doctor" },
            ...doctors.map((item) => ({ value: item, label: item })),
          ]}
          onChange={onProvider}
        />
        <div className="inline-flex w-full border border-[#cfc6b8] bg-white sm:w-auto" role="group" aria-label="Slot layout">
          <button
            className={`inline-flex min-h-11 flex-1 items-center justify-center gap-2 px-3 py-2 text-sm sm:flex-none ${
              slotView === "grid" ? "bg-ink text-white" : "text-stone-600 hover:bg-[#f7f3ea]"
            }`}
            type="button"
            aria-pressed={slotView === "grid"}
            onClick={() => onSlotView("grid")}
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
            onClick={() => onSlotView("list")}
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
          <p className="mt-6 text-stone-600">There are no upcoming slots for this doctor yet. Please try another doctor or check back later.</p>
        ) : null}

        {!slotsLoading && current ? (
          <div className="mt-6">
            <div className="flex items-center gap-2">
              <button
                className="hidden min-h-11 min-w-11 shrink-0 border border-[#cfc6b8] bg-white text-lg disabled:opacity-30 sm:grid sm:place-items-center"
                type="button"
                aria-label="Previous day"
                disabled={dayIndex <= 0}
                onClick={() => onGoDay(-1)}
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
                      onClick={() => onDay(day.key)}
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
                onClick={() => onGoDay(1)}
              >
                ›
              </button>
            </div>

            <div className="mt-3 flex items-center gap-2 sm:hidden">
              <button
                className="min-h-11 flex-1 border border-[#cfc6b8] bg-white px-3 text-sm disabled:opacity-30"
                type="button"
                disabled={dayIndex <= 0}
                onClick={() => onGoDay(-1)}
              >
                Previous
              </button>
              <button
                className="min-h-11 flex-1 border border-[#cfc6b8] bg-white px-3 text-sm disabled:opacity-30"
                type="button"
                disabled={dayIndex >= days.length - 1}
                onClick={() => onGoDay(1)}
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
                    onClick={() => onPick(slot)}
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
                              onClick={() => onPick(slot)}
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
  );
}
