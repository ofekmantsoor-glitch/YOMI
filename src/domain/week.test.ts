import { describe, expect, it } from 'vitest'
import { doneCount, isNew, localDate, nonCompletionCount, therapeuticWeek, weeklyTarget, type ReportLike, type TaskLike } from './week'

const task = (over: Partial<TaskLike> = {}): TaskLike =>
  ({ id: 't1', frequency_count: 3, frequency_period: 'week', created_at: '2026-11-10T08:00:00Z', ...over })
const report = (kind: ReportLike['kind'], event_at: string, task_id: string | null = 't1'): ReportLike =>
  ({ kind, event_at, task_id })

describe('therapeuticWeek', () => {
  it('starts on the session weekday (Tuesday session, today Monday → previous Tuesday)', () => {
    // 2026-11-23 is a Monday; Tuesday = 2
    expect(therapeuticWeek(2, '2026-11-23')).toEqual(
      ['2026-11-17', '2026-11-18', '2026-11-19', '2026-11-20', '2026-11-21', '2026-11-22', '2026-11-23'])
  })
  it('starts today when today is the session day', () => {
    expect(therapeuticWeek(1, '2026-11-23')[0]).toBe('2026-11-23')
  })
  it('crosses a month boundary', () => {
    expect(therapeuticWeek(5, '2026-12-02')).toEqual(
      ['2026-11-27', '2026-11-28', '2026-11-29', '2026-11-30', '2026-12-01', '2026-12-02', '2026-12-03'])
  })
  it('offset -1 gives the previous week', () => {
    expect(therapeuticWeek(2, '2026-11-23', -1)[0]).toBe('2026-11-10')
  })
})

describe('localDate', () => {
  it('uses Israel time: 23:30 UTC is already the next day in Israel', () => {
    expect(localDate('2026-11-20T23:30:00Z')).toBe('2026-11-21')
  })
})

describe('X / Y', () => {
  const week = therapeuticWeek(2, '2026-11-23')
  it('daily frequency: Y = 7 × count', () => expect(weeklyTarget(task({ frequency_count: 2, frequency_period: 'day' }))).toBe(14))
  it('weekly frequency: Y = count', () => expect(weeklyTarget(task())).toBe(3))
  it('"when it happens" has no Y', () => expect(weeklyTarget(task({ frequency_count: null, frequency_period: 'open' }))).toBeNull())
  it('non-completion is not counted in X but is counted separately', () => {
    const rs = [report('behavioral', '2026-11-18T10:00:00Z'), report('non_completion', '2026-11-19T10:00:00Z')]
    expect(doneCount(task(), rs, week)).toBe(1)
    expect(nonCompletionCount(task(), rs, week)).toBe(1)
  })
  it('counts by event date, not entry date, and ignores other weeks and tasks', () => {
    const rs = [
      report('behavioral', '2026-11-16T10:00:00Z'), // Monday before the week
      report('behavioral', '2026-11-20T10:00:00Z', 'other'),
      report('behavioral', '2026-11-23T21:30:00Z'), // Monday 23:30 Israel, still in week
    ]
    expect(doneCount(task(), rs, week)).toBe(1)
  })
})

describe('"new" badge', () => {
  const created = '2026-11-20T08:00:00Z'
  it('is shown on a fresh task', () => expect(isNew(task({ created_at: created }), [], new Date('2026-11-21T08:00:00Z'))).toBe(true))
  it('disappears after the first report', () =>
    expect(isNew(task({ created_at: created }), [report('non_completion', '2026-11-20T09:00:00Z')], new Date('2026-11-21T08:00:00Z'))).toBe(false))
  it('disappears after 7 days', () => expect(isNew(task({ created_at: created }), [], new Date('2026-11-27T08:00:01Z'))).toBe(false))
})
