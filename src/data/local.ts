// In-memory stand-in for Supabase, used until the project exists. Mirrors the rules in 001_schema.sql
// (who can see what, single-use codes, idempotent save) so screens behave the same on either backend.
// Data lives only in memory and resets on page reload: clinical content never goes to browser storage (PRD).
import { INVITE_VALID_HOURS } from '../domain/assumptions'
import { ApiError, type Invite, type NewTask, type Patient, type Report, type ReportInput, type Task, type Therapist } from './types'

// shortcut: one shared demo password for the in-memory accounts; real accounts come from demo:reset + Supabase Auth.
export const LOCAL_DEMO_PASSWORD = 'demo1234'

const DAY = 86_400_000
const iso = (ms: number) => new Date(ms).toISOString()
const uuid = () => crypto.randomUUID()

interface InviteRow extends Invite { patient_id: string; used_at: string | null }

const db = {
  therapists: [] as Therapist[],
  patients: [] as Patient[],
  invites: [] as InviteRow[],
  tasks: [] as Task[],
  reports: [] as Report[],
}
const session = { therapistId: null as string | null, patientId: null as string | null }

/** Demo controls (local mode only): while on, every save fails, to show the failure state. */
export const demo = { failSaves: false }

function seed() {
  const now = Date.now()
  const ago = (days: number, hour = 18) => {
    const d = new Date(now - days * DAY)
    d.setHours(hour, 0, 0, 0)
    return d.toISOString()
  }
  const t1: Therapist = { id: uuid(), display_name: 'נועה לוי (הדגמה)', email: 'therapist1@yomi.test' }
  const t2: Therapist = { id: uuid(), display_name: 'אורי כהן (הדגמה)', email: 'therapist2@yomi.test' }
  db.therapists.push(t1, t2)
  const weekday = new Date(now - 3 * DAY).getDay() // session 3 days ago: the current week already has days in it
  const mk = (therapist: Therapist, nickname: string, joinedDaysAgo: number, session_weekday = weekday): Patient =>
    ({ id: uuid(), therapist_id: therapist.id, nickname, session_weekday, created_at: ago(joinedDaysAgo + 1), joined_at: ago(joinedDaysAgo) })
  const dana = mk(t1, 'ד׳ (הדגמה)', 10)
  const yoav = mk(t1, 'י׳ (הדגמה)', 5)
  db.patients.push(dana, yoav, mk(t2, 'ש׳ (הדגמה)', 4, 0))

  const task = (p: Patient, over: Partial<Task>): Task => ({
    id: uuid(), patient_id: p.id, type: 'behavioral', title: '', instruction: '', frequency_count: null,
    frequency_period: 'open', due_date: null, status: 'active', created_at: ago(10), ...over,
  })
  const lift = task(dana, { title: 'לעלות במעלית קומה אחת', instruction: 'לעלות במעלית קומה אחת ולהישאר בה עד שהדלת נפתחת.', frequency_count: 3, frequency_period: 'week' })
  const thoughts = task(dana, { type: 'thought', title: 'לתעד מחשבה כשעולה חרדה', instruction: 'כשמרגישים חרדה עולה, לכתוב מה קרה, מה הרגשת ואיזו מחשבה עלתה.' })
  const walk = task(yoav, { title: 'הליכה של 10 דקות', instruction: 'הליכה קצרה מחוץ לבית.', frequency_count: 1, frequency_period: 'day', created_at: ago(5) })
  db.tasks.push(lift, thoughts, walk)

  const rep = (t: Task, days: number, input: ReportInput) => {
    const at = ago(days)
    db.reports.push({ ...input, id: uuid(), patient_id: dana.id, task_id: t.id, event_at: at, started_at: at,
      created_at: iso(Date.parse(at) + 2 * 3600_000) } as Report)
  }
  rep(lift, 9, { kind: 'behavioral', payload: { status: 'done', distress_before: 70, distress_after: 45, note: '' } })
  rep(lift, 6, { kind: 'non_completion', payload: { reason: 'too_hard_avoided', note: '' } })
  rep(thoughts, 8, { kind: 'thought', payload: { situation: 'חיכיתי לתשובה על הודעה בעבודה.', emotions: [{ name: 'חרדה', intensity: 65 }], thought: 'עשיתי משהו לא בסדר.' } })
  rep(lift, 2, { kind: 'behavioral', payload: { status: 'partial', distress_before: 80, distress_after: null, note: 'ירדתי אחרי חצי קומה.' } })
  rep(thoughts, 1, { kind: 'thought', payload: { situation: 'נכנסתי לפגישה עם הרבה אנשים.', emotions: [{ name: 'חרדה', intensity: 70 }, { name: 'בושה', intensity: 40 }], thought: '' } })
}
seed()

const wait = (ms = 450) => new Promise(r => setTimeout(r, ms)) // makes "שומר…" visible, like a real network

function me(): Therapist {
  const t = db.therapists.find(x => x.id === session.therapistId)
  if (!t) throw new ApiError('not_allowed')
  return t
}
function myPatient(id: string): Patient {
  const p = db.patients.find(x => x.id === id)
  if (!p || p.therapist_id !== me().id) throw new ApiError('not_found') // same answer as "doesn't exist" (RLS)
  return p
}
function selfPatient(): Patient {
  const p = db.patients.find(x => x.id === session.patientId)
  if (!p) throw new ApiError('not_allowed')
  return p
}
const newCode = () => {
  const alphabet = '23456789ABCDEFGHJKMNPQRSTUVWXYZ'
  return Array.from(crypto.getRandomValues(new Uint8Array(8)), b => alphabet[b % 31]).join('')
}
function issue(patientId: string): Invite {
  const now = Date.now()
  for (const i of db.invites) if (i.patient_id === patientId && !i.used_at) i.expires_at = iso(Math.min(Date.parse(i.expires_at), now))
  const inv = { code: newCode(), expires_at: iso(now + INVITE_VALID_HOURS * 3600_000), patient_id: patientId, used_at: null }
  db.invites.push(inv)
  return { code: inv.code, expires_at: inv.expires_at }
}
const clone = <T>(x: T): T => structuredClone(x)

export const local = {
  // ── therapist ──
  async therapistLogin(email: string, password: string) {
    await wait()
    const t = db.therapists.find(x => x.email === email.trim().toLowerCase())
    if (!t || password !== LOCAL_DEMO_PASSWORD) throw new ApiError('bad_login')
    session.therapistId = t.id
    return clone(t)
  },
  currentTherapist: () => clone(db.therapists.find(x => x.id === session.therapistId) ?? null),
  therapistLogout() { session.therapistId = null },

  async listPatients() {
    await wait(150)
    const t = me()
    return db.patients.filter(p => p.therapist_id === t.id).map(p => {
      const last = db.reports.filter(r => r.patient_id === p.id).map(r => r.created_at).sort().at(-1) ?? null
      const invite = p.joined_at ? null : db.invites.filter(i => i.patient_id === p.id && !i.used_at).at(-1) ?? null
      return { patient: clone(p), lastReportAt: last, invite: invite && { code: invite.code, expires_at: invite.expires_at } }
    })
  },
  async createPatient(nickname: string, session_weekday: number) {
    await wait()
    const p: Patient = { id: uuid(), therapist_id: me().id, nickname: nickname.trim(), session_weekday,
      created_at: iso(Date.now()), joined_at: null }
    db.patients.push(p)
    return { patient: clone(p), invite: issue(p.id) }
  },
  async issueInvite(patientId: string) {
    await wait()
    if (myPatient(patientId).joined_at) throw new ApiError('already_joined')
    return issue(patientId)
  },
  async patientData(patientId: string) {
    await wait(150)
    const p = myPatient(patientId)
    return { patient: clone(p), tasks: clone(db.tasks.filter(t => t.patient_id === p.id)), reports: clone(db.reports.filter(r => r.patient_id === p.id)) }
  },
  async createTask(input: NewTask) {
    await wait()
    myPatient(input.patient_id)
    const t: Task = { ...input, id: uuid(), status: 'active', created_at: iso(Date.now()) }
    db.tasks.push(t)
    return clone(t)
  },
  async report(reportId: string) {
    await wait(150)
    const r = db.reports.find(x => x.id === reportId)
    if (!r) throw new ApiError('not_found')
    const patient = myPatient(r.patient_id)
    return { report: clone(r), patient: clone(patient), task: clone(db.tasks.find(t => t.id === r.task_id) ?? null) }
  },

  // ── patient ──
  async redeemInvite(raw: string) {
    await wait()
    const code = raw.toUpperCase().replace(/[^A-Z0-9]/g, '')
    const inv = db.invites.find(i => i.code === code)
    if (!inv) throw new ApiError('invalid_code')
    if (inv.used_at) throw new ApiError('code_used')
    if (Date.parse(inv.expires_at) <= Date.now()) throw new ApiError('code_expired')
    const p = db.patients.find(x => x.id === inv.patient_id)!
    inv.used_at = iso(Date.now())
    p.joined_at = inv.used_at
    session.patientId = p.id
    return clone(p)
  },
  currentPatient: () => clone(db.patients.find(x => x.id === session.patientId) ?? null),
  async myData() {
    await wait(150)
    const p = selfPatient()
    return { patient: clone(p), tasks: clone(db.tasks.filter(t => t.patient_id === p.id && t.status === 'active')),
      reports: clone(db.reports.filter(r => r.patient_id === p.id)) }
  },
  async saveReport(r: { id: string; task_id: string; event_at: string; started_at: string } & ReportInput) {
    await wait(700)
    if (demo.failSaves) throw new ApiError('network')
    const p = selfPatient()
    const existing = db.reports.find(x => x.id === r.id)
    if (existing) { // idempotent: a retry or a double tap returns the first save
      if (existing.patient_id !== p.id) throw new ApiError('not_allowed')
      return clone(existing)
    }
    const task = db.tasks.find(t => t.id === r.task_id && t.patient_id === p.id)
    if (!task) throw new ApiError('not_allowed')
    if (task.status !== 'active') throw new ApiError('task_ended')
    if (r.kind !== 'non_completion' && r.kind !== task.type) throw new ApiError('invalid_report')
    if (Date.parse(r.event_at) > Date.now() + 5 * 60_000) throw new ApiError('event_in_future')
    const row = { ...clone(r), patient_id: p.id, created_at: iso(Date.now()) } as Report
    db.reports.push(row)
    return clone(row)
  },

  // ── demo shortcuts (local mode only) ──
  demoEnterAsPatient() { session.patientId = db.patients[0].id },
  demoPatientLogout() { session.patientId = null },
}
