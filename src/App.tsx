import React, { useEffect, useMemo, useRef, useState } from "react";

// -------------------- Utilities --------------------
const DAY_NAMES = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];
const TZ_PH = "Asia/Manila";
const TZ_NY = "America/New_York";

function fmtISO(d: Date) {
  return d.toISOString().slice(0, 10);
}
function addDays(d: Date, n: number) {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}

// Start-of-week in a specific timezone (Sunday)
function startOfWeekInTZ(date: Date, timeZone: string) {
  const name = new Intl.DateTimeFormat("en-US", { timeZone, weekday: "short" }).format(date);
  const map: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
  const dow = map[name];
  const out = new Date(date);
  out.setDate(out.getDate() - dow);
  out.setHours(0, 0, 0, 0);
  return out;
}

// 30-min blocks 05:00 → 23:30
const TIMES: { h: number; m: number }[] = [];
for (let h = 5; h <= 23; h++) {
  TIMES.push({ h, m: 0 });
  TIMES.push({ h, m: 30 });
}
function keyHM(h: number, m: number) {
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

// Get UTC offset (minutes) for a given timezone and instant
function tzOffsetMinutes(instant: Date, timeZone: string) {
  const dtf = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
  const parts = dtf.formatToParts(instant);
  const pick = (t: string) => parts.find((p) => p.type === t)!.value;
  const asUTC = Date.UTC(+pick("year"), +pick("month") - 1, +pick("day"), +pick("hour"), +pick("minute"), +pick("second"));
  const utcNow = Date.UTC(
    instant.getUTCFullYear(),
    instant.getUTCMonth(),
    instant.getUTCDate(),
    instant.getUTCHours(),
    instant.getUTCMinutes(),
    instant.getUTCSeconds()
  );
  return Math.round((asUTC - utcNow) / 60000); // minutes east of UTC
}

// Shift a slot (dayIdx + "HH:MM") by delta minutes; wrap day/time correctly
function shiftSlot(dayIdx: number, timeKey: string, deltaMin: number) {
  const [h, m] = timeKey.split(":").map(Number);
  const total0 = h * 60 + m + deltaMin;
  // normalize 0..1439
  const total = ((total0 % 1440) + 1440) % 1440;
  const dayBump = Math.floor((h * 60 + m + deltaMin) / 1440);
  const nh = Math.floor(total / 60);
  const nm = total % 60;
  const nd = (dayIdx + dayBump + 7) % 7;
  return { dayIdx: nd, timeKey: keyHM(nh, nm) };
}

// -------------------- Types --------------------
type Cell = { text: string; done: boolean };
export type WeekData = Record<string /*dayIdx*/, Record<string /*timeKey*/, Cell>>;

// -------------------- Defaults (Daphne routine) --------------------
function makeEmptyWeek(): WeekData {
  const wk: WeekData = {};
  for (let d = 0; d < 7; d++) wk[String(d)] = {};
  return wk;
}

const TRAIN_BY_DAY: Record<number, string> = {
  0: "Rest walk + stretch",
  1: "Lower Strength",
  2: "LISS 45m + mobility",
  3: "Upper Strength",
  4: "LISS 45m + hips",
  5: "Full-body Strength",
  6: "Mobility + light intervals",
};
const CREATE_BY_DAY: Record<number, string> = {
  0: "Analytics & plan next week",
  1: "YT research + outline",
  2: "Script draft + B-roll list",
  3: "Record VO + first edit",
  4: "Final edit + thumbnail + captions",
  5: "SEO/metadata + schedule + post",
  6: "AI stock batch + metadata & upload",
};
const DEEPWORK_BY_DAY: Record<number, string> = {
  0: "Reflect/journal + plan week",
  1: "SQL/automation deep work",
  2: "Deep work + Acts of Service 20:30–21:00",
  3: "SQL/automation deep work",
  4: "Deep work + Acts of Service 20:30–21:00",
  5: "SQL/automation deep work",
  6: "Light study / fun project",
};

function makeDefaultTemplate(): WeekData {
  const wk = makeEmptyWeek();
  const setText = (day: number, timeKey: string, text: string) => (wk[String(day)][timeKey] = { text, done: false });

  function* timesBetween(start: string, endExcl: string) {
    const [sh, sm] = start.split(":").map(Number);
    const [eh, em] = endExcl.split(":").map(Number);
    let h = sh,
      m = sm;
    while (h < eh || (h === eh && m < em)) {
      yield keyHM(h, m);
      m += 30;
      if (m >= 60) {
        m = 0;
        h += 1;
      }
    }
  }
  const fillRange = (day: number, start: string, endExcl: string, text: string) => {
    for (const k of timesBetween(start, endExcl)) setText(day, k, text);
  };

  for (let d = 0; d < 7; d++) {
    setText(d, "08:30", "Home+shower+snack+journal");
    setText(d, "09:00", "Meds (escitalopram)");
    fillRange(d, "09:30", "17:00", "SLEEP");
    fillRange(d, "17:00", "18:00", `Train: ${TRAIN_BY_DAY[d]}`);
    setText(d, "18:00", "Protein dinner (30–40g)");
    fillRange(d, "18:30", "20:00", `Create: ${CREATE_BY_DAY[d]}`);
    setText(d, "20:00", "Admin / tidy");
    fillRange(d, "20:30", "22:00", DEEPWORK_BY_DAY[d]);
    setText(d, "22:00", "Commute + pre-shift meal");
    setText(d, "23:00", "Night shift (overnight)");
    setText(d, "23:30", "Night shift (overnight)");
  }
  return wk;
}

// -------------------- Storage helpers --------------------
const STORAGE_KEY = "planner:data:v2_halfhours";
const STORAGE_TEMPLATE_KEY = "planner:baseTemplate:v2_halfhours";
const STORAGE_AUTOSEED_KEY = "planner:autoSeed:v1";
function load<T>(k: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(k);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}
function save<T>(k: string, v: T) {
  try {
    localStorage.setItem(k, JSON.stringify(v));
  } catch {}
}

// -------------------- 30-min Cell --------------------
function PlannerCell({
  value,
  onChange,
  onToggleDone,
}: {
  value: Cell | undefined;
  onChange: (v: Cell) => void;
  onToggleDone: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const text = value?.text ?? "";
  const done = value?.done ?? false;
  const len = text.length;
  const sizeClass = len < 40 ? "text-base" : len < 120 ? "text-sm" : "text-xs";

  return (
    <div className="group relative h-12 border-l border-b border-gray-200 p-1">
      <div className="absolute right-1 top-1 opacity-0 group-hover:opacity-100 transition">
        <button
          className={`h-5 w-5 grid place-items-center rounded-full border ${
            done ? "bg-emerald-600 text-white border-emerald-600" : "bg-white text-gray-500"
          }`}
          title={done ? "Mark as not done" : "Mark done"}
          onClick={onToggleDone}
        >
          ✓
        </button>
      </div>
      <div
        ref={ref}
        contentEditable
        suppressContentEditableWarning
        className={`h-full w-full outline-none leading-snug whitespace-pre-wrap ${sizeClass} ${
          done ? "line-through text-gray-400" : "text-gray-800"
        }`}
        onBlur={(e) => onChange({ text: e.currentTarget.innerText.trim(), done })}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            (e.target as HTMLDivElement).blur();
          }
        }}
      >
        {text}
      </div>
    </div>
  );
}

// -------------------- Main App --------------------
export default function App() {
  // Date selection is just a day in the chosen view timezone
  const [dateInput, setDateInput] = useState<string>(fmtISO(new Date()));
  const [viewTZ, setViewTZ] = useState<"PH" | "EST">("EST"); // default to EST view

  // Compute start-of-week for labels in chosen view timezone
  const weekStartLabel = useMemo(
    () => startOfWeekInTZ(new Date(dateInput + "T00:00:00"), viewTZ === "EST" ? TZ_NY : TZ_PH),
    [dateInput, viewTZ]
  );

  // Underlying data is still keyed by local start-of-week to keep storage simple
  const weekStartLocal = useMemo(() => startOfWeekInTZ(new Date(dateInput + "T00:00:00"), Intl.DateTimeFormat().resolvedOptions().timeZone), [dateInput]);
  const wkKey = fmtISO(weekStartLocal);

  // Timezone offset (NY minus Manila) for this week – handles DST automatically
  const tzDeltaMin = useMemo(() => {
    if (viewTZ === "PH") return 0;
    const ref = new Date(weekStartLabel); // consistent instant in week
    const ny = tzOffsetMinutes(ref, TZ_NY);
    const ph = tzOffsetMinutes(ref, TZ_PH); // always +480
    return ny - ph; // −720 (EDT) or −780 (EST)
  }, [viewTZ, weekStartLabel]);

  // Data & template
  const [data, setData] = useState<Record<string, WeekData>>(() => load(STORAGE_KEY, {}));
  const [autoSeed, setAutoSeed] = useState<boolean>(() => load(STORAGE_AUTOSEED_KEY, true));
  const [baseTemplate, setBaseTemplate] = useState<WeekData>(() => load(STORAGE_TEMPLATE_KEY, makeDefaultTemplate()));
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

  const weekData: WeekData = data[wkKey] || makeEmptyWeek();

  // When viewing in EST, we map displayed cells → underlying cells by shifting -tzDelta
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
    const d = new Date(dateInput + "T00:00:00");
    d.setDate(d.getDate() + delta * 7);
    setDateInput(fmtISO(d));
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
            <button className="rounded-md border px-3 py-1 text-sm" onClick={() => shiftWeek(-1)}>← Prev week</button>
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600">Week of</span>
              <input type="date" value={fmtISO(weekStartLabel)} onChange={(e) => setDateInput(e.target.value)} className="rounded-md border px-2 py-1 text-sm" />
            </div>
            <button className="rounded-md border px-3 py-1 text-sm" onClick={() => shiftWeek(1)}>Next week →</button>

            {/* TZ selector */}
            <label className="ml-3 inline-flex items-center gap-2 text-sm">
              <span className="text-gray-600">View timezone</span>
              <select value={viewTZ} onChange={(e) => setViewTZ(e.target.value as "PH" | "EST")} className="rounded-md border px-2 py-1 text-sm">
                <option value="EST">New York (EST/EDT)</option>
                <option value="PH">Manila</option>
              </select>
            </label>

            <label className="ml-3 inline-flex items-center gap-2 text-sm">
              <input type="checkbox" checked={autoSeed} onChange={(e) => setAutoSeed(e.target.checked)} />
              Auto-seed new weeks from Base Template
            </label>
          </div>

          <div className="flex items-center gap-2">
            <button className="rounded-md border px-3 py-1 text-sm" onClick={resetWeekToTemplate}>Reset week to Base</button>
            <button className="rounded-md bg-black text-white px-3 py-1 text-sm" onClick={saveCurrentAsTemplate}>Save week as Base</button>
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
                    {new Intl.DateTimeFormat("en-US", { timeZone: viewTZ === "EST" ? TZ_NY : TZ_PH, day: "numeric" }).format(d)} {DAY_NAMES[i]}
                  </div>
                </div>
              ))}
            </div>

            {/* Time rows (30-min). When viewing in EST, each visible slot is mapped back by −tzDeltaMin */}
            {TIMES.map(({ h, m }) => (
              <div key={`${h}:${m}`} className="grid" style={{ gridTemplateColumns: `80px repeat(7, minmax(0, 1fr))` }}>
                <div className={`h-12 border-b border-r px-3 py-2 text-sm ${m === 0 ? "bg-gray-50 text-gray-700" : "bg-gray-50 text-gray-400"} flex items-center`}>
                  {m === 0 ? `${h}:00` : ""}
                </div>
                {headerDays.map((_, di) => {
                  const displayedKey = keyHM(h, m);
                  const source = tzDeltaMin === 0 ? { dayIdx: di, timeKey: displayedKey } : shiftSlot(di, displayedKey, -tzDeltaMin);
                  const cell = weekData[String(source.dayIdx)]?.[source.timeKey];
                  return (
                    <PlannerCell
                      key={`${di}-${displayedKey}`}
                      value={cell}
                      onChange={(v) => setCell(di, displayedKey, v)}     // setCell handles mapping
                      onToggleDone={() => toggleCellDone(di, displayedKey)} // toggle handles mapping
                    />
                  );
                })}
              </div>
            ))}
          </div>
        </div>

        <div className="mt-4 text-sm text-gray-600">
          Notes: caffeine cutoff ≈ 04:00; protein 1.6–2.2 g/kg/day; hydrate 2–3 L/day; keep bedroom cool & dark for day sleep.
        </div>
      </div>
    </div>
  );
}
