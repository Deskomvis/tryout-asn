export const SKD_PASSING = { twk: 65, tiu: 80, tkp: 166, total: 311 } as const;
export const SKD_MAX = { twk: 150, tiu: 175, tkp: 225, total: 550 } as const;
export const SKD_QUESTIONS = { twk: 30, tiu: 35, tkp: 45, total: 110 } as const;
export const SKD_DURATION_SECONDS = 6000;

export function isSKDExam(subcategory?: string | null): boolean {
  return (subcategory?.toUpperCase() ?? "").includes("SKD");
}

export function isSKDPassed(scores: { twk: number; tiu: number; tkp: number }): boolean {
  return scores.twk >= SKD_PASSING.twk &&
    scores.tiu >= SKD_PASSING.tiu &&
    scores.tkp >= SKD_PASSING.tkp;
}

export function getSKDSubtestStatus(scores: { twk: number; tiu: number; tkp: number }) {
  return {
    twk: scores.twk >= SKD_PASSING.twk,
    tiu: scores.tiu >= SKD_PASSING.tiu,
    tkp: scores.tkp >= SKD_PASSING.tkp,
  };
}
