export type Cell = { text: string; done: boolean };
export type WeekData = Record<string /* dayIdx */, Record<string /* timeKey */, Cell>>;
