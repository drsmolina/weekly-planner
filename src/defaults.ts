import { WeekData } from "./types";

export function makeEmptyWeek(): WeekData {
  const wk: WeekData = {};
  for (let d = 0; d < 7; d++) wk[String(d)] = {};
  return wk;
}

// The base template starts empty so new users are not seeded with predefined
// activities. They can populate their own schedule as needed.
export function makeDefaultTemplate(): WeekData {
  return makeEmptyWeek();
}
