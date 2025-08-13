import React, { useEffect, useMemo, useState } from "react";
import { PlannerCell } from "./PlannerCell";
import { Cell, WeekData } from "./types";
import {
  DAY_NAMES,
  TZ_PH,
  TZ_NY,
  fmtISO,
  addDays,
  parseISODateLocal,
  startOfWeekInTZ,
  TIMES,
  keyHM,
  tzOffsetMinutes,
  shiftSlot,
} from "./utils";
import { makeDefaultTemplate, makeEmptyWeek } from "./defaults";
import {
  STORAGE_KEY,
  STORAGE_TEMPLATE_KEY,
  STORAGE_AUTOSEED_KEY,
  STORAGE_NOTES_KEY,
  load,
  save,
} from "./storage";

export default function App() {
  const localTZ = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const [dateInput, setDateInput] = useState<string>(
    fmtISO(startOfWeekInTZ(new Date(), localTZ))
  );
  const [viewTZ, setViewTZ] = useState<"PH" | "EST">("EST");

  const weekStartLabel = useMemo(
    () =>
      startOfWeekInTZ(
        parseISODateLocal(dateInput),
        viewTZ === "EST" ? TZ_NY : TZ_PH
      ),
    [dateInput, viewTZ]
  );

  const weekStartLocal = useMemo(
    () => startOfWeekInTZ(parseISODateLocal(dateInput), localTZ),
    [dateInput, localTZ]
  );
  const wkKey = fmtISO(weekStartLocal);

  const todayStart = useMemo(
    () => startOfWeekInTZ(new Date(), localTZ),
    [localTZ]
  );
  const minDate = useMemo(() => addDays(todayStart, -14), [todayStart]);
  const maxDate = useMemo(() => addDays(todayStart, 14), [todayStart]);
  const atMin = weekStartLocal <= minDate;
  const atMax = weekStartLocal >= maxDate;

  const tzDeltaMin = useMemo(() => {
    if (viewTZ === "PH") return 0;
    const ref = new Date(weekStartLabel);
    const ny = tzOffsetMinutes(ref, TZ_NY);
    const ph = tzOffsetMinutes(ref, TZ_PH);
    return ny - ph;
  }, [viewTZ, weekStartLabel]);

  const [data, setData] = useState<Record<string, WeekData>>(() => load(STORAGE_KEY, {}));
  const [autoSeed, setAutoSeed] = useState<boolean>(() => load(STORAGE_AUTOSEED_KEY, true));
  const [baseTemplate, setBaseTemplate] = useState<WeekData>(() =>
    load(STORAGE_TEMPLATE_KEY, makeDefaultTemplate())
  );
  const [notes, setNotes] = useState<string>(() => load(STORAGE_NOTES_KEY, ""));
  useEffect(() => {
    if (!data[wkKey]) {
      const seeded = autoSeed ? JSON.parse(JSON.stringify(baseTemplate)) : makeEmptyWeek();
      setData((prev) => ({ ...prev, [wkKey]: seeded }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [wkKey]);

  useEffect(() => save(STORAGE_KEY, data), [data]);
  useEffect(() => save(STORAGE_TEMPLATE_KEY, baseTemplate), [baseTemplate]);
  useEffect(() => save(STORAGE_AUTOSEED_KEY, autoSeed), [autoSeed]);
  useEffect(() => save(STORAGE_NOTES_KEY, notes), [notes]);

  const weekData: WeekData = data[wkKey] || makeEmptyWeek();

  function setCell(dayIdx: number, timeKey: string, cell: Cell) {
    const target = tzDeltaMin === 0 ? { dayIdx, timeKey } : shiftSlot(dayIdx, timeKey, -tzDeltaMin);
    setData((prev) => {
      const next = { ...prev };
      const w = { ...(next[wkKey] || makeEmptyWeek()) } as WeekData;
      const d = { ...(w[String(target.dayIdx)] || {}) } as Record<string, Cell>;
      d[target.timeKey] = cell;
      w[String(target.dayIdx)] = d;
      next[wkKey] = w;
      return next;
    });
  }
  function toggleCellDone(dayIdx: number, timeKey: string) {
    const source = tzDeltaMin === 0 ? { dayIdx, timeKey } : shiftSlot(dayIdx, timeKey, -tzDeltaMin);
    const cur = weekData[String(source.dayIdx)]?.[source.timeKey];
    setCell(source.dayIdx, source.timeKey, { text: cur?.text || "", done: !(cur?.done ?? false) });
  }

  function shiftWeek(delta: number) {
    const target = addDays(weekStartLocal, delta * 7);
    if (target < minDate || target > maxDate) return;
    setDateInput(fmtISO(target));
  }
  function resetWeekToTemplate() {
    setData((prev) => ({ ...prev, [wkKey]: JSON.parse(JSON.stringify(baseTemplate)) }));
  }
  function saveCurrentAsTemplate() {
    setBaseTemplate(JSON.parse(JSON.stringify(weekData)));
  }

  const headerDays = Array.from({ length: 7 }, (_, i) => addDays(weekStartLabel, i));

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-[1200px] p-4 sm:p-6">
        <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight">Weekly Planner</h1>

        {/* Controls */}
        <div className="mt-4 rounded-xl border bg-white shadow-sm p-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2 flex-wrap">
            <button
              className="rounded-md border px-3 py-1 text-sm"
              onClick={() => shiftWeek(-1)}
              disabled={atMin}
            >
              ← Prev week
            </button>
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600">Week of</span>
              <input
                type="date"
                value={fmtISO(weekStartLabel)}
                min={fmtISO(minDate)}
                max={fmtISO(maxDate)}
                onChange={(e) => {
                  const next = startOfWeekInTZ(parseISODateLocal(e.target.value), localTZ);
                  if (next < minDate || next > maxDate) return;
                  setDateInput(fmtISO(next));
                }}
                className="rounded-md border px-2 py-1 text-sm"
              />
            </div>
            <button
              className="rounded-md border px-3 py-1 text-sm"
              onClick={() => shiftWeek(1)}
              disabled={atMax}
            >
              Next week →
            </button>

            {/* TZ selector */}
            <label className="ml-3 inline-flex items-center gap-2 text-sm">
              <span className="text-gray-600">View timezone</span>
              <select
                value={viewTZ}
                onChange={(e) => setViewTZ(e.target.value as "PH" | "EST")}
                className="rounded-md border px-2 py-1 text-sm"
              >
                <option value="EST">New York (EST/EDT)</option>
                <option value="PH">Manila</option>
              </select>
            </label>

            <label className="ml-3 inline-flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={autoSeed}
                onChange={(e) => setAutoSeed(e.target.checked)}
              />
              Auto-seed new weeks from Base Template
            </label>
          </div>

          <div className="flex items-center gap-2">
            <button className="rounded-md border px-3 py-1 text-sm" onClick={resetWeekToTemplate}>
              Reset week to Base
            </button>
            <button
              className="rounded-md bg-black text-white px-3 py-1 text-sm"
              onClick={saveCurrentAsTemplate}
            >
              Save week as Base
            </button>
          </div>
        </div>

        {/* Grid */}
        <div className="mt-4 overflow-x-auto rounded-xl border bg-white shadow-sm">
          <div className="min-w-[1040px]">
            {/* Header Row (dates rendered in chosen TZ) */}
            <div className="grid" style={{ gridTemplateColumns: `80px repeat(7, minmax(0, 1fr))` }}>
              <div className="h-12 border-b bg-gray-50" />
              {headerDays.map((d, i) => (
                <div key={i} className="h-12 border-b bg-gray-50 px-3 flex items-center">
                  <div className="font-semibold">
                    {new Intl.DateTimeFormat("en-US", {
                      timeZone: viewTZ === "EST" ? TZ_NY : TZ_PH,
                      day: "numeric",
                    }).format(d)}{" "}
                    {DAY_NAMES[i]}
                  </div>
                </div>
              ))}
            </div>

            {/* Time rows (30-min). When viewing in EST, each visible slot is mapped back by −tzDeltaMin */}
            {TIMES.map(({ h, m }) => (
              <div key={`${h}:${m}`} className="grid" style={{ gridTemplateColumns: `80px repeat(7, minmax(0, 1fr))` }}>
                <div
                  className={`h-12 border-b border-r px-3 py-2 text-sm ${
                    m === 0 ? "bg-gray-50 text-gray-700" : "bg-gray-50 text-gray-400"
                  } flex items-center`}
                >
                  {m === 0 ? `${h}:00` : ""}
                </div>
                {headerDays.map((_, di) => {
                  const displayedKey = keyHM(h, m);
                  const source =
                    tzDeltaMin === 0
                      ? { dayIdx: di, timeKey: displayedKey }
                      : shiftSlot(di, displayedKey, -tzDeltaMin);
                  const cell = weekData[String(source.dayIdx)]?.[source.timeKey];
                  return (
                    <PlannerCell
                      key={`${di}-${displayedKey}`}
                      value={cell}
                      onChange={(v) => setCell(di, displayedKey, v)}
                      onToggleDone={() => toggleCellDone(di, displayedKey)}
                    />
                  );
                })}
              </div>
            ))}
          </div>
        </div>

        <div className="mt-4">
          <textarea
            className="w-full rounded-md border p-2 text-sm"
            placeholder="Notes / reminders"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </div>
      </div>
    </div>
  );
}
