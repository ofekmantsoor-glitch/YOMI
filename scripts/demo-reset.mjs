// npm run demo:reset: wipes ALL data in the Supabase project and loads fictional demo data (PRD assumption 5).
// Needs in .env.local: VITE_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, DEMO_PASSWORD.
// The service-role key bypasses row-level security, so it stays on this machine and never reaches the browser.
import { createClient } from '@supabase/supabase-js'

process.loadEnvFile('.env.local')
const { VITE_SUPABASE_URL: url, SUPABASE_SERVICE_ROLE_KEY: key, DEMO_PASSWORD: password } = process.env
if (!url || !key || !password) {
  console.error('Missing VITE_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY or DEMO_PASSWORD in .env.local')
  process.exit(1)
}
const db = createClient(url, key, { auth: { persistSession: false } })
const NONE = '00000000-0000-0000-0000-000000000000'

async function must(promise) {
  const { data, error } = await promise
  if (error) throw error
  return data
}

// 1. Wipe. Reports first: report.task_id is ON DELETE RESTRICT.
for (const table of ['report', 'patient', 'therapist']) {
  await must(db.from(table).delete().neq('id', NONE))
}
for (let page = 1; ; page++) {
  const { users } = await must(db.auth.admin.listUsers({ page, perPage: 200 }))
  const demo = users.filter(u => u.is_anonymous || u.email?.endsWith('@yomi.test'))
  for (const u of demo) await must(db.auth.admin.deleteUser(u.id))
  if (users.length < 200) break
}

// 2. Therapists (fictional).
const therapists = [
  { email: 'therapist1@yomi.test', display_name: 'נועה לוי (הדגמה)' },
  { email: 'therapist2@yomi.test', display_name: 'אורי כהן (הדגמה)' },
]
for (const t of therapists) {
  const { user } = await must(db.auth.admin.createUser({ email: t.email, password, email_confirm: true }))
  t.id = user.id
  await must(db.from('therapist').insert({ id: t.id, email: t.email, display_name: t.display_name }))
}

// 3. Patients. Session day = three days ago, so the current therapeutic week already has a few days in it.
const DAY = 86_400_000
const now = Date.now()
const ago = (days, hour = 18) => {
  const d = new Date(now - days * DAY)
  d.setUTCHours(hour - 2, 0, 0, 0) // roughly Israel local hour
  return d.toISOString()
}
const sessionWeekday = new Date(now - 3 * DAY).getDay()

const [dana, yoav] = await must(db.from('patient').insert([
  { therapist_id: therapists[0].id, nickname: 'ד׳ (הדגמה)', session_weekday: sessionWeekday, joined_at: ago(10) },
  { therapist_id: therapists[0].id, nickname: 'י׳ (הדגמה)', session_weekday: sessionWeekday, joined_at: ago(5) },
]).select())
await must(db.from('patient').insert(
  { therapist_id: therapists[1].id, nickname: 'ש׳ (הדגמה)', session_weekday: 0, joined_at: ago(4) }))

// 4. Tasks.
const [lift, thoughts] = await must(db.from('task').insert([
  { patient_id: dana.id, type: 'behavioral', title: 'לעלות במעלית קומה אחת',
    instruction: 'לעלות במעלית קומה אחת ולהישאר בה עד שהדלת נפתחת.', frequency_count: 3, frequency_period: 'week',
    created_at: ago(10) },
  { patient_id: dana.id, type: 'thought', title: 'לתעד מחשבה כשעולה חרדה',
    instruction: 'כשמרגישים חרדה עולה, לכתוב מה קרה, מה הרגשת ואיזו מחשבה עלתה.', frequency_period: 'open',
    created_at: ago(10) },
]).select())
await must(db.from('task').insert({ patient_id: yoav.id, type: 'behavioral', title: 'הליכה של 10 דקות',
  instruction: 'הליכה קצרה מחוץ לבית.', frequency_count: 1, frequency_period: 'day', created_at: ago(5) }))

// 5. Reports: previous week and the current one. Yoav has none (the empty-week state).
const reports = [
  [lift, 'behavioral', 9, { status: 'done', distress_before: 70, distress_after: 45, note: '' }],
  [lift, 'non_completion', 6, { reason: 'too_hard_avoided', note: '' }],
  [thoughts, 'thought', 8, { situation: 'חיכיתי לתשובה על הודעה בעבודה.',
    emotions: [{ name: 'חרדה', intensity: 65 }], thought: 'עשיתי משהו לא בסדר.' }],
  [lift, 'behavioral', 2, { status: 'partial', distress_before: 80, distress_after: 60, note: 'ירדתי אחרי חצי קומה.' }],
  [thoughts, 'thought', 1, { situation: 'נכנסתי לפגישה עם הרבה אנשים.',
    emotions: [{ name: 'חרדה', intensity: 70 }, { name: 'בושה', intensity: 40 }], thought: '' }],
  [lift, 'non_completion', 0, { reason: 'no_time', note: '' }],
]
for (const [task, kind, days, payload] of reports) {
  const id = crypto.randomUUID()
  const at = ago(days)
  await must(db.from('report').insert({ id, patient_id: dana.id, task_id: task.id, kind, event_at: at,
    started_at: new Date(Date.parse(at) + 60_000).toISOString(), created_at: new Date(Date.parse(at) + 120_000).toISOString() }))
  await must(db.from('report_version').insert({ report_id: id, version_no: 1, payload }))
}

console.log(`Demo data loaded.
  Therapists: ${therapists.map(t => t.email).join(', ')} (password: DEMO_PASSWORD from .env.local)
  therapist1 has 2 patients (one with a week of reports, one with an empty week); therapist2 has 1.
  To test joining, add a patient in the app and use the code it shows.`)
