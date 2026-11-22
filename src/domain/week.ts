// Week and count rules (PRD "כללי חישוב", all working assumptions). Computed on the client from raw rows,
// never on the server, so report payloads can be encrypted later without breaking the weekly view.
import { NEW_BADGE_DAYS, TIME_ZONE, type FrequencyPeriod } from './assumptions'

export type LocalDate = string // 'YYYY-MM-DD' in Israel time

const localFmt = new Intl.DateTimeFormat('en-CA', { timeZone: TIME_ZONE, year: 'numeric', month: '2-digit', day: '2-digit' })

/** Israel calendar date of an instant. Times are stored in UTC and shown in Israel time. */
export const localDate = (at: string | Date): LocalDate => localFmt.format(new Date(at))

export function addDays(d: LocalDate, n: number): LocalDate {
  const [y, m, day] = d.split('-').map(Number)
  return new Date(Date.UTC(y, m - 1, day + n)).toISOString().slice(0, 10)
}

export const weekdayOf = (d: LocalDate) => new Date(`${d}T00:00:00Z`).getUTCDay()

/**
 * The seven dates of a therapeutic week: it starts on the patient's fixed session weekday, so "this week"
 * is the gap between sessions rather than a calendar week. offset -1 = the previous week.
 */
export function therapeuticWeek(sessionWeekday: number, today: LocalDate, offset = 0): LocalDate[] {
  const back = (weekdayOf(today) - sessionWeekday + 7) % 7
  const start = addDays(today, -back + offset * 7)
  return Array.from({ length: 7 }, (_, i) => addDays(start, i))
}

export interface TaskLike {
  id: string
  frequency_count: number | null
  frequency_period: FrequencyPeriod
  created_at: string
}
export interface ReportLike {
  task_id: string | null
  kind: 'thought' | 'behavioral' | 'non_completion'
  event_at: string
}

/** Y: the weekly target. null for "כשזה קורה", where the card shows only the count. */
export function weeklyTarget(t: TaskLike): number | null {
  if (t.frequency_period === 'open' || t.frequency_count == null) return null
  return t.frequency_period === 'day' ? t.frequency_count * 7 : t.frequency_count
}

const inWeek = (r: ReportLike, week: LocalDate[]) => week.includes(localDate(r.event_at))

/** X: reports on the task whose event date falls in the week. Non-completion is shown separately, never counted. */
export const doneCount = (t: TaskLike, reports: ReportLike[], week: LocalDate[]) =>
  reports.filter(r => r.task_id === t.id && r.kind !== 'non_completion' && inWeek(r, week)).length

export const nonCompletionCount = (t: TaskLike, reports: ReportLike[], week: LocalDate[]) =>
  reports.filter(r => r.task_id === t.id && r.kind === 'non_completion' && inWeek(r, week)).length

/** "חדש" until the first report on the task, or until NEW_BADGE_DAYS after it was created. */
export function isNew(t: TaskLike, reports: ReportLike[], now: Date = new Date()): boolean {
  if (reports.some(r => r.task_id === t.id)) return false
  return now.getTime() - new Date(t.created_at).getTime() < NEW_BADGE_DAYS * 86_400_000
}
