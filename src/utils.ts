export const DAY_NAMES = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];
export const TZ_PH = "Asia/Manila";
export const TZ_NY = "America/New_York";

export function fmtISO(d: Date) {
  const offset = d.getTimezoneOffset();
  const local = new Date(d.getTime() - offset * 60000);
  return local.toISOString().slice(0, 10);
}

export function parseISODateLocal(iso: string) {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d);
}
export function addDays(d: Date, n: number) {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}

export function startOfWeekInTZ(date: Date, timeZone: string) {
  const name = new Intl.DateTimeFormat("en-US", { timeZone, weekday: "short" }).format(date);
  const map: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
  const dow = map[name];
  const out = new Date(date);
  out.setDate(out.getDate() - dow);
  out.setHours(0, 0, 0, 0);
  return out;
}

export const TIMES: { h: number; m: number }[] = [];
for (let h = 5; h <= 23; h++) {
  TIMES.push({ h, m: 0 });
  TIMES.push({ h, m: 30 });
}
export function keyHM(h: number, m: number) {
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

export function tzOffsetMinutes(instant: Date, timeZone: string) {
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
  return Math.round((asUTC - utcNow) / 60000);
}

export function shiftSlot(dayIdx: number, timeKey: string, deltaMin: number) {
  const [h, m] = timeKey.split(":").map(Number);
  const total0 = h * 60 + m + deltaMin;
  const total = ((total0 % 1440) + 1440) % 1440;
  const dayBump = Math.floor((h * 60 + m + deltaMin) / 1440);
  const nh = Math.floor(total / 60);
  const nm = total % 60;
  const nd = (dayIdx + dayBump + 7) % 7;
  return { dayIdx: nd, timeKey: keyHM(nh, nm) };
}
