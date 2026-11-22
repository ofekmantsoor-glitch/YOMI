// PRD working assumptions (docs/prd.md, "החלטות פתוחות והנחות העבודה ל-MVP").
// NOT decisions: each needs team approval before it moves into docs/spec.md. Change them here only.

/** #3: up to three emotions, each with its own 0–100 intensity. */
export const MAX_EMOTIONS = 3

/** #8: placeholder list, to be set with a therapist before usability tests. "אחר" takes free text. */
export const EMOTIONS = ['חרדה', 'פחד', 'עצב', 'כעס', 'אשמה', 'בושה', 'תסכול', 'בדידות'] as const
export const OTHER_EMOTION = 'אחר'

/** #7: fixed list of five, choosing one is required, note optional. */
export const NON_COMPLETION_REASONS = {
  forgot: 'שכחתי',
  no_time: 'לא היה זמן',
  too_hard_avoided: 'היה קשה מדי ונמנעתי',
  no_opportunity: 'לא הייתה הזדמנות',
  other: 'אחר',
} as const
export type NonCompletionReason = keyof typeof NON_COMPLETION_REASONS

/** #9: "open" = "כשזה קורה", no numeric target. */
export const FREQUENCY_PERIODS = { day: 'ביום', week: 'בשבוע', open: 'כשזה קורה' } as const
export type FrequencyPeriod = keyof typeof FREQUENCY_PERIODS

/** "New" badge lasts until the first report or this many days after creation. */
export const NEW_BADGE_DAYS = 7

/** Invite codes are single-use and valid for this long (T-03). Enforced in SQL; shown in the UI. */
export const INVITE_VALID_HOURS = 24

export const TIME_ZONE = 'Asia/Jerusalem'
