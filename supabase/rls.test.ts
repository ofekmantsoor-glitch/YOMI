// Runs supabase/migrations/001_schema.sql against an in-process Postgres (PGlite) with a stub of Supabase's
// auth schema, then tries to cross user boundaries. Every cross-boundary attempt must fail (PRD: privacy & security).
// Stage 2 adds e2e/rls.spec.ts, which repeats these checks against the real Supabase project.
import { readFileSync } from 'node:fs'
import { randomUUID } from 'node:crypto'
import { beforeAll, describe, expect, it } from 'vitest'
import { PGlite } from '@electric-sql/pglite'
import { pgcrypto } from '@electric-sql/pglite/contrib/pgcrypto'

const SUPABASE_STUB = `
  create role anon nologin; create role authenticated nologin;
  create schema auth; create schema extensions;
  create table auth.users (id uuid primary key);
  create function auth.uid() returns uuid language sql stable as
    $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
  grant usage on schema auth, public, extensions to anon, authenticated;
  grant execute on function auth.uid() to anon, authenticated;
`

let db: PGlite
const therapistA = randomUUID()
const therapistB = randomUUID()
const deviceP = randomUUID() // patient of A, after joining
const deviceQ = randomUUID() // patient of B, after joining
const deviceX = randomUUID() // an anonymous device that never joined

async function as<T = Record<string, unknown>>(user: string, sql: string, params: unknown[] = []) {
  await db.exec(`set role authenticated; select set_config('request.jwt.claim.sub', '${user}', false);`)
  try {
    return (await db.query<T>(sql, params)).rows
  } finally {
    await db.exec(`reset role; select set_config('request.jwt.claim.sub', '', false);`)
  }
}
const fails = (p: Promise<unknown>, msg?: RegExp) => expect(p).rejects.toThrow(msg)

let patientA: string, patientB: string, taskA: string, codeA: string

beforeAll(async () => {
  db = new PGlite({ extensions: { pgcrypto } })
  await db.exec(SUPABASE_STUB)
  await db.exec(readFileSync(new URL('./migrations/001_schema.sql', import.meta.url), 'utf8'))
  for (const id of [therapistA, therapistB, deviceP, deviceQ, deviceX]) {
    await db.query('insert into auth.users (id) values ($1)', [id])
  }
  await db.query(`insert into therapist values ($1, 'מטפלת א', 'a@yomi.test'), ($2, 'מטפל ב', 'b@yomi.test')`,
    [therapistA, therapistB])

  const [a] = await as<{ patient_id: string; code: string }>(therapistA, `select * from create_patient('דנה', 2::smallint)`)
  patientA = a.patient_id; codeA = a.code
  const [b] = await as<{ patient_id: string; code: string }>(therapistB, `select * from create_patient('יואב', 0::smallint)`)
  patientB = b.patient_id

  await as(deviceP, `select * from redeem_invite($1)`, [codeA.toLowerCase().slice(0, 4) + '-' + codeA.slice(4)])
  await as(deviceQ, `select * from redeem_invite($1)`, [b.code])

  const [t] = await as<{ id: string }>(therapistA,
    `insert into task (patient_id, type, title, frequency_count, frequency_period)
     values ($1, 'behavioral', 'לעלות במעלית קומה אחת', 3, 'week') returning id`, [patientA])
  taskA = t.id
})

describe('invites', () => {
  it('code is 8 chars without look-alikes', () => expect(codeA).toMatch(/^[2-9A-HJKMNP-Z]{8}$/))
  it('a used code cannot be reused', () => fails(as(deviceX, `select * from redeem_invite($1)`, [codeA]), /code_used/))
  it('an unknown code is rejected', () => fails(as(deviceX, `select * from redeem_invite('ZZZZZZZZ')`), /invalid_code/))
  it('an expired code is rejected', async () => {
    const [c] = await as<{ patient_id: string; code: string }>(therapistA, `select * from create_patient('רון', 1::smallint)`)
    await db.query(`update invite set expires_at = now() - interval '1 second' where code = $1`, [c.code])
    await fails(as(deviceX, `select * from redeem_invite($1)`, [c.code]), /code_expired/)
  })
  it('a therapist cannot issue a code for another therapist’s patient', () =>
    fails(as(therapistB, `select * from issue_invite($1)`, [patientA]), /not_allowed/))
  it('anonymous visitors (no sign-in) cannot call functions', async () => {
    await db.exec('set role anon')
    try { await fails(db.query(`select * from redeem_invite('ABCDEFGH')`)) } finally { await db.exec('reset role') }
  })
})

describe('therapist isolation', () => {
  it('sees only own patients', async () => {
    const rows = await as<{ id: string }>(therapistB, 'select id from patient')
    expect(rows.map(r => r.id)).toEqual([patientB])
  })
  it('cannot read another therapist’s tasks or reports', async () => {
    expect(await as(therapistB, 'select * from task where patient_id = $1', [patientA])).toEqual([])
    expect(await as(therapistB, 'select * from report where patient_id = $1', [patientA])).toEqual([])
  })
  it('cannot create a task for another therapist’s patient', () =>
    fails(as(therapistB, `insert into task (patient_id, type, title, frequency_period) values ($1, 'thought', 'x', 'open')`,
      [patientA])))
  it('cannot change a patient record', () =>
    fails(as(therapistA, `update patient set nickname = 'x' where id = $1`, [patientA])))
})

describe('patient isolation and reports', () => {
  const reportId = randomUUID()
  const save = (user: string, id: string, task: string | null, kind: string, eventAt = 'now()') =>
    as(user, `select * from save_report($1, $2, $3, ${eventAt}, now(), $4)`,
      [id, task, kind, JSON.stringify({ status: 'done', distress_before: 60, distress_after: 30, note: '' })])

  it('patient sees own task, not others', async () => {
    expect((await as(deviceP, 'select id from task')).length).toBe(1)
    expect(await as(deviceQ, 'select id from task')).toEqual([])
  })
  it('patient cannot create tasks', () =>
    fails(as(deviceP, `insert into task (patient_id, type, title, frequency_period) values ($1, 'thought', 'x', 'open')`,
      [patientA])))
  it('saving twice with the same id creates one report and one version', async () => {
    await save(deviceP, reportId, taskA, 'behavioral')
    await save(deviceP, reportId, taskA, 'behavioral')
    expect((await db.query('select 1 from report where id = $1', [reportId])).rows.length).toBe(1)
    expect((await db.query('select 1 from report_version where report_id = $1', [reportId])).rows.length).toBe(1)
  })
  it('non-completion is a report on the same task', () => save(deviceP, randomUUID(), taskA, 'non_completion'))
  it('kind must match the task type', () => fails(save(deviceP, randomUUID(), taskA, 'thought'), /invalid_report/))
  it('event date cannot be in the future', () =>
    fails(save(deviceP, randomUUID(), taskA, 'behavioral', `now() + interval '1 day'`), /event_in_future/))
  it('another patient cannot report on my task or read my reports', async () => {
    await fails(save(deviceQ, randomUUID(), taskA, 'behavioral'), /not_allowed/)
    await fails(save(deviceQ, reportId, taskA, 'behavioral'), /not_allowed/)
    expect(await as(deviceQ, 'select * from report')).toEqual([])
    expect(await as(deviceQ, 'select * from report_version')).toEqual([])
  })
  it('a device that never joined cannot save', () => fails(save(deviceX, randomUUID(), taskA, 'behavioral'), /not_allowed/))
  it('own therapist reads the report, the other does not', async () => {
    expect((await as(therapistA, 'select * from report_version')).length).toBeGreaterThan(0)
    expect(await as(therapistB, 'select * from report_version')).toEqual([])
  })
  it('report_version is append-only for everyone', async () => {
    for (const user of [deviceP, therapistA]) {
      await fails(as(user, `update report_version set payload = '{}'::jsonb`))
      await fails(as(user, `delete from report_version`))
      await fails(as(user, `insert into report_version (report_id, version_no, payload) values ($1, 2, '{}')`, [reportId]))
    }
  })
  it('therapist cannot edit or delete the patient’s report', async () => {
    await fails(as(therapistA, `update report set event_at = now()`))
    await fails(as(therapistA, `delete from report`))
  })
})
