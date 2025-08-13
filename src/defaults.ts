import { WeekData } from "./types";
import { keyHM } from "./utils";

export function makeEmptyWeek(): WeekData {
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

export function makeDefaultTemplate(): WeekData {
  const wk = makeEmptyWeek();
  const setText = (day: number, timeKey: string, text: string) => (wk[String(day)][timeKey] = { text, done: false });

  function* timesBetween(start: string, endExcl: string) {
    const [sh, sm] = start.split(":").map(Number);
    const [eh, em] = endExcl.split(":").map(Number);
    let h = sh, m = sm;
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
