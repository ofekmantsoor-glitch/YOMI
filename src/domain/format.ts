import { FREQUENCY_PERIODS, TIME_ZONE } from './assumptions'
import type { LocalDate } from './week'

export const WEEKDAYS = ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שבת'] as const

const dt = new Intl.DateTimeFormat('he-IL', { timeZone: TIME_ZONE, weekday: 'short', day: 'numeric', month: 'numeric', hour: '2-digit', minute: '2-digit' })
const d = new Intl.DateTimeFormat('he-IL', { timeZone: 'UTC', weekday: 'short', day: 'numeric', month: 'numeric' })

/** Instant in Israel time, e.g. "יום ג׳, 18.11, 18:00". */
export const fmtDateTime = (at: string) => dt.format(new Date(at))
/** A local calendar date, e.g. "יום ג׳, 18.11". */
export const fmtDay = (day: LocalDate) => d.format(new Date(`${day}T00:00:00Z`))

export function frequencyText(t: { frequency_count: number | null; frequency_period: keyof typeof FREQUENCY_PERIODS }) {
  if (t.frequency_period === 'open' || !t.frequency_count) return FREQUENCY_PERIODS.open
  const times = t.frequency_count === 1 ? 'פעם אחת' : `${t.frequency_count} פעמים`
  return `${times} ${FREQUENCY_PERIODS[t.frequency_period]}`
}

/** "XXXX-XXXX" for reading a join code aloud. */
export const fmtCode = (c: string) => `${c.slice(0, 4)}-${c.slice(4)}`
