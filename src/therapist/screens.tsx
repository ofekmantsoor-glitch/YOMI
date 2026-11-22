// Therapist screens (PRD T-01 … T-07). The therapist only views the patient's words; nothing here edits a report.
import { useEffect, useState, type FormEvent, type ReactNode } from 'react'
import { Link, Navigate, Outlet, useNavigate, useParams } from 'react-router'
import { ChevronLeft, ChevronRight, Plus, UserRound } from 'lucide-react'
import { api, isLocalMode, LOCAL_DEMO_PASSWORD, type Invite, type Report, type TaskType } from '../data/api'
import { copy, taskTypeLabel } from '../copy'
import { FREQUENCY_PERIODS, INVITE_VALID_HOURS, NON_COMPLETION_REASONS, type FrequencyPeriod } from '../domain/assumptions'
import { doneCount, localDate, nonCompletionCount, therapeuticWeek, weeklyTarget } from '../domain/week'
import { fmtCode, fmtDateTime, fmtDay, frequencyText, WEEKDAYS } from '../domain/format'
import { Button, Card, Chips, cx, ErrorNote, LinkButton, Loading, messageFor, Page, SaveBar, Tag, TextField, useLoad, useSave } from '../ui/kit'

export function RequireTherapist() {
  return api.currentTherapist() ? <Outlet /> : <Navigate to="/therapist/login" replace />
}

// ── T-01 ──
export function Login() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const submit = async (e: FormEvent) => {
    e.preventDefault(); setBusy(true); setError(null)
    try { await api.therapistLogin(email, password); navigate('/therapist') } catch (err) { setError(messageFor(err)) } finally { setBusy(false) }
  }
  return (
    <Page title="כניסת מטפל" lead="חשבונות ההדגמה הוגדרו מראש. אין הרשמה עצמית.">
      <form onSubmit={submit} className="glass rounded-lg p-5 space-y-4">
        <TextField label="אימייל" type="email" autoComplete="username" dir="ltr" value={email} onChange={setEmail} required />
        <TextField label="סיסמה" type="password" autoComplete="current-password" dir="ltr" value={password} onChange={setPassword} required />
        {error && <ErrorNote>{error}</ErrorNote>}
        <Button disabled={busy} className="w-full">{busy ? 'נכנס…' : 'כניסה'}</Button>
      </form>
      {isLocalMode && (
        <p className="text-sm text-muted mt-4">
          בהדגמה המקומית: <bdi dir="ltr">therapist1@yomi.test</bdi> או <bdi dir="ltr">therapist2@yomi.test</bdi>, סיסמה <bdi dir="ltr">{LOCAL_DEMO_PASSWORD}</bdi>
        </p>
      )}
    </Page>
  )
}

// ── T-02 ──
export function Patients() {
  const { data, error } = useLoad(() => api.listPatients(), [])
  return (
    <Page title="המטופלים שלי" wide>
      <div className="mb-6"><LinkButton to="/therapist/new-patient"><Plus aria-hidden size={20} />הוספת מטופל</LinkButton></div>
      {error ? <ErrorNote>{messageFor(error)}</ErrorNote> : !data ? <Loading /> : data.length === 0 ? (
        <Card><p>עוד אין מטופלים ברשימה. אפשר להוסיף מטופל ולמסור לו קוד הצטרפות.</p></Card>
      ) : (
        <ul className="grid gap-4 md:grid-cols-2">
          {data.map(({ patient, lastReportAt, invite }) => (
            <li key={patient.id}>
              <Link to={`/therapist/p/${patient.id}`} className="glass rounded-lg p-5 flex items-center gap-4 hover:bg-white">
                <span aria-hidden className="grid size-12 shrink-0 place-items-center rounded-full bg-secondary-fixed text-on-secondary-container"><UserRound /></span>
                <span className="min-w-0">
                  <span className="block text-lg font-medium">{patient.nickname}</span>
                  <span className="block text-sm text-muted">יום פגישה: {WEEKDAYS[patient.session_weekday]}</span>
                  <span className="block text-sm text-muted">
                    {invite ? <>ממתין להצטרפות · קוד <bdi dir="ltr">{fmtCode(invite.code)}</bdi></>
                      : lastReportAt ? `דיווח אחרון: ${fmtDateTime(lastReportAt)}` : 'עוד אין דיווחים'}
                  </span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </Page>
  )
}

function InviteCard({ invite }: { invite: Invite }) {
  return (
    <Card className="text-center">
      <p className="text-muted mb-1">קוד הצטרפות למסירה למטופל</p>
      <p className="text-4xl font-semibold tracking-widest tabular-nums mb-2" dir="ltr" data-testid="invite-code">{fmtCode(invite.code)}</p>
      <p className="text-sm text-muted">הקוד חד-פעמי ובתוקף {INVITE_VALID_HOURS} שעות (עד {fmtDateTime(invite.expires_at)}).</p>
    </Card>
  )
}

// ── T-03 ──
export function AddPatient() {
  const [nickname, setNickname] = useState('')
  const [weekday, setWeekday] = useState<string>('')
  const [created, setCreated] = useState<{ id: string; invite: Invite } | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const submit = async (e: FormEvent) => {
    e.preventDefault()
    if (!nickname.trim() || weekday === '') { setError('צריך כינוי ויום פגישה.'); return }
    setBusy(true); setError(null)
    try {
      const r = await api.createPatient(nickname, Number(weekday))
      setCreated({ id: r.patient.id, invite: r.invite })
    } catch (err) { setError(messageFor(err)) } finally { setBusy(false) }
  }
  if (created) return (
    <Page title="המטופל נוסף">
      <InviteCard invite={created.invite} />
      <div className="mt-6 flex flex-wrap gap-3">
        <LinkButton to={`/therapist/p/${created.id}`}>לדף המטופל</LinkButton>
        <LinkButton to="/therapist" variant="secondary">לרשימת המטופלים</LinkButton>
      </div>
    </Page>
  )
  return (
    <Page title="הוספת מטופל" lead="לא נאסף שם מלא ולא מספר זהות. מספיק כינוי שיהיה ברור לך.">
      <form onSubmit={submit} className="glass rounded-lg p-5 space-y-5">
        <TextField label="כינוי" hint="למשל ראשי תיבות" value={nickname} onChange={setNickname} maxLength={40} required />
        <div className="space-y-1.5">
          <label htmlFor="weekday" className="block font-medium">יום הפגישה הקבוע<span className="text-muted font-normal"> (חובה)</span></label>
          <p className="text-sm text-muted">השבוע בתצוגה מתחיל ביום הזה.</p>
          <select id="weekday" value={weekday} onChange={e => setWeekday(e.target.value)} className="w-full rounded-md border border-outline-variant bg-white/80 px-4 py-3 min-h-12">
            <option value="">בחירת יום</option>
            {WEEKDAYS.map((d, i) => <option key={d} value={i}>{d}</option>)}
          </select>
        </div>
        {error && <ErrorNote>{error}</ErrorNote>}
        <Button disabled={busy} className="w-full">{busy ? 'יוצר קוד…' : 'הוספה ויצירת קוד'}</Button>
      </form>
    </Page>
  )
}

// ── T-05 / T-06 ──
const reportLabel = (r: Report) =>
  r.kind === 'behavioral' ? (r.payload.status === 'done' ? 'בוצע' : 'בוצע חלקית')
  : r.kind === 'thought' ? 'תיעוד מחשבה'
  : `לא בוצע · ${NON_COMPLETION_REASONS[r.payload.reason]}`

export function PatientWeek() {
  const { id = '' } = useParams()
  const [offset, setOffset] = useState(0)
  const [invite, setInvite] = useState<Invite | null>(null)
  const { data, error } = useLoad(() => api.patientData(id), [id])
  const list = useLoad(() => api.listPatients(), [id])
  if (error) return <Page title="המטופל לא נמצא"><ErrorNote>{messageFor(error)}</ErrorNote></Page>
  if (!data) return <Loading />
  const { patient, tasks, reports } = data
  const today = localDate(new Date())
  const week = therapeuticWeek(patient.session_weekday, today, offset)
  const visibleTasks = tasks.filter(t => t.status === 'active' && localDate(t.created_at) <= week[6])
  const weekReports = reports.filter(r => week.includes(localDate(r.event_at)))
  const title = (taskId: string | null) => tasks.find(t => t.id === taskId)?.title ?? 'תיעוד ביוזמת המטופל'
  const pendingInvite = invite ?? list.data?.find(x => x.patient.id === id)?.invite ?? null

  return (
    <Page title={patient.nickname} lead={`יום פגישה: ${WEEKDAYS[patient.session_weekday]}`} wide>
      {!patient.joined_at && (
        <div className="mb-6 space-y-3 max-w-md">
          <p className="font-medium">המטופל עוד לא הצטרף.</p>
          {pendingInvite && Date.parse(pendingInvite.expires_at) > Date.now() && <InviteCard invite={pendingInvite} />}
          <Button variant="secondary" onClick={async () => setInvite(await api.issueInvite(id))}>יצירת קוד חדש</Button>
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-1">
          <button onClick={() => setOffset(o => o - 1)} className="glass grid size-11 place-items-center rounded-full" aria-label="השבוע הקודם"><ChevronRight aria-hidden /></button>
          <h2 className="text-lg font-medium px-2" aria-live="polite">
            {offset === 0 ? 'השבוע הנוכחי' : offset === -1 ? 'השבוע הקודם' : `לפני ${-offset} שבועות`}
            <span className="text-muted font-normal text-base"> · {fmtDay(week[0])} עד {fmtDay(week[6])}</span>
          </h2>
          <button onClick={() => setOffset(o => o + 1)} disabled={offset === 0} className="glass grid size-11 place-items-center rounded-full disabled:opacity-40" aria-label="השבוע הבא"><ChevronLeft aria-hidden /></button>
        </div>
        <LinkButton to={`/therapist/p/${id}/new-task`}><Plus aria-hidden size={20} />הגדרת משימה</LinkButton>
      </div>

      {/* Above the axis: X of Y per task. Non-completion shown separately; "no reports" is not the same as "not done". */}
      {visibleTasks.length > 0 ? (
        <ul className="grid gap-3 md:grid-cols-2 mb-6">
          {visibleTasks.map(t => {
            const x = doneCount(t, reports, week), y = weeklyTarget(t), nc = nonCompletionCount(t, reports, week)
            return (
              <li key={t.id} className="glass rounded-lg p-4" data-testid="task-summary">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <Tag tone={t.type === 'behavioral' ? 'blue' : 'lilac'}>{taskTypeLabel[t.type]}</Tag>
                    <p className="font-medium mt-1.5">{t.title}</p>
                    <p className="text-sm text-muted">{frequencyText(t)}</p>
                  </div>
                  <p className="text-xl font-semibold whitespace-nowrap">{y == null ? `${x} דיווחים` : `${x} מתוך ${y}`}</p>
                </div>
                <p className="text-sm mt-2">
                  {nc > 0 ? `דיווחי אי-ביצוע: ${nc}` : x === 0 ? <span className="text-muted">{copy.noReportsOnTask}</span> : null}
                </p>
              </li>
            )
          })}
        </ul>
      ) : <Card className="mb-6"><p>עוד אין משימות פעילות. אפשר להגדיר משימה ראשונה.</p></Card>}

      {weekReports.length === 0 && <p className="mb-4 text-muted" data-testid="empty-week">{copy.emptyWeek}</p>}
      <ol className="grid gap-2 lg:grid-cols-7" aria-label="ציר הימים">
        {week.map(day => {
          const items = weekReports.filter(r => localDate(r.event_at) === day).sort((a, b) => a.event_at.localeCompare(b.event_at))
          return (
            <li key={day} className={cx('glass rounded-md p-3 lg:min-h-40', day === today && 'ring-2 ring-primary')}>
              <p className="text-sm font-medium mb-2">{fmtDay(day)}{day === today && <span className="text-primary"> · היום</span>}</p>
              {items.length === 0 ? <p className="text-sm text-muted lg:sr-only">אין דיווחים</p> : (
                <ul className="space-y-2">
                  {items.map(r => (
                    <li key={r.id}>
                      <Link to={`/therapist/r/${r.id}`} className={cx('block rounded-sm px-2.5 py-2 text-sm hover:bg-white border-s-4',
                        r.kind === 'non_completion' ? 'border-tertiary bg-apricot' : r.kind === 'thought' ? 'border-secondary bg-secondary-fixed/50' : 'border-primary bg-primary-fixed/50')}>
                        <span className="block font-medium">{title(r.task_id)}</span>
                        <span className="block">{reportLabel(r)}</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </li>
          )
        })}
      </ol>
    </Page>
  )
}

// ── T-04 ──
export function AssignTask() {
  const { id = '' } = useParams()
  const navigate = useNavigate()
  const [type, setType] = useState<TaskType | null>(null)
  const [title, setTitle] = useState('')
  const [instruction, setInstruction] = useState('')
  const [period, setPeriod] = useState<FrequencyPeriod | null>(null)
  const [count, setCount] = useState('')
  const [due, setDue] = useState('')
  const [invalid, setInvalid] = useState<string | null>(null)
  const dirty = Boolean(type || title || instruction || period || count || due)
  const save = useSave(dirty)
  useEffect(() => { if (save.state === 'saved') navigate(`/therapist/p/${id}`) }, [save.state, id, navigate])

  const submit = () => {
    const n = Number(count)
    if (!type || !title.trim() || !period) return setInvalid('צריך לבחור סוג, לתת שם קצר ולבחור תדירות.')
    if (period !== 'open' && !(Number.isInteger(n) && n >= 1 && n <= 50)) return setInvalid('מספר הפעמים צריך להיות בין 1 ל-50.')
    setInvalid(null)
    save.run(() => api.createTask({ patient_id: id, type, title: title.trim(), instruction: instruction.trim(),
      frequency_period: period, frequency_count: period === 'open' ? null : n, due_date: due || null }))
  }
  return (
    <Page title="הגדרת משימה">
      <div className="glass rounded-lg p-5 space-y-6">
        <Chips legend="סוג המשימה (חובה)" selected={type ? [type] : []} onToggle={setType}
          options={[{ value: 'behavioral', label: taskTypeLabel.behavioral }, { value: 'thought', label: taskTypeLabel.thought }]} />
        <TextField label="שם קצר" hint="כך המשימה תופיע אצל המטופל" value={title} onChange={setTitle} maxLength={80} required />
        <TextField label="הנחיה" hint="במילים שלך" value={instruction} onChange={setInstruction} multiline />
        <Chips legend="תדירות (חובה)" selected={period ? [period] : []} onToggle={setPeriod}
          options={(Object.keys(FREQUENCY_PERIODS) as FrequencyPeriod[]).map(p => ({ value: p, label: FREQUENCY_PERIODS[p] }))} />
        {period && period !== 'open' && (
          <TextField label={`כמה פעמים ${FREQUENCY_PERIODS[period]}`} type="number" inputMode="numeric" min={1} max={50} value={count} onChange={setCount} required />
        )}
        <TextField label="תאריך יעד" hint="רשות. אחרי התאריך המשימה נשארת פעילה עד שמסיימים אותה." type="date"
          min={localDate(new Date())} value={due} onChange={setDue} />
        {invalid && <ErrorNote>{invalid}</ErrorNote>}
        <SaveBar state={save.state} error={save.error} onSave={submit} label="שמירת המשימה" />
      </div>
    </Page>
  )
}

// ── T-07 ──
const Field = ({ label, children }: { label: string; children: ReactNode }) => (
  <div className="py-3 border-b border-outline-variant/60 last:border-0">
    <dt className="text-sm text-muted">{label}</dt>
    <dd className="mt-0.5 whitespace-pre-wrap">{children}</dd>
  </div>
)
const textOr = (v: string) => v.trim() ? v : <span className="text-muted italic">{copy.notFilled}</span>
const numOr = (v: number | null) => v == null ? <span className="text-muted italic">{copy.notFilled}</span> : <span className="tabular-nums">{v} מתוך 100</span>

export function FullReport() {
  const { reportId = '' } = useParams()
  const { data, error } = useLoad(() => api.report(reportId), [reportId])
  if (error) return <Page title="הדיווח לא נמצא"><ErrorNote>{messageFor(error)}</ErrorNote></Page>
  if (!data) return <Loading />
  const { report: r, patient, task } = data
  return (
    <Page title={task?.title ?? 'תיעוד ביוזמת המטופל'} lead={`${patient.nickname}${task ? ` · ${taskTypeLabel[task.type]}` : ''}`}>
      <Card>
        <dl>
          <Field label="סוג הדיווח">{r.kind === 'non_completion' ? 'דיווח על אי-ביצוע' : r.kind === 'thought' ? 'תיעוד מחשבה' : 'דיווח ביצוע'}</Field>
          <Field label="מועד האירוע">{fmtDateTime(r.event_at)}</Field>
          <Field label="מועד ההזנה">{fmtDateTime(r.created_at)}</Field>
          <ReportFields r={r} />
        </dl>
      </Card>
      <div className="mt-6"><LinkButton to={`/therapist/p/${patient.id}`} variant="secondary">חזרה לתצוגה השבועית</LinkButton></div>
    </Page>
  )
}

function ReportFields({ r }: { r: Report }) {
  if (r.kind === 'behavioral') return <>
    <Field label="ביצוע">{r.payload.status === 'done' ? 'בוצע' : 'בוצע חלקית'}</Field>
    <Field label="מצוקה לפני">{numOr(r.payload.distress_before)}</Field>
    <Field label="מצוקה אחרי">{numOr(r.payload.distress_after)}</Field>
    <Field label="הערה">{textOr(r.payload.note)}</Field>
  </>
  if (r.kind === 'non_completion') return <>
    <Field label="מה הפריע">{NON_COMPLETION_REASONS[r.payload.reason]}</Field>
    <Field label="הערה">{textOr(r.payload.note)}</Field>
  </>
  return <>
    <Field label="מה קרה">{textOr(r.payload.situation)}</Field>
    <Field label="רגשות ועוצמה">
      {r.payload.emotions.length === 0 ? textOr('') : (
        <ul className="flex flex-wrap gap-2 mt-1">
          {r.payload.emotions.map(e => <li key={e.name}><Tag tone="lilac">{e.name} · {e.intensity}</Tag></li>)}
        </ul>
      )}
    </Field>
    <Field label="המחשבה שעלתה">{textOr(r.payload.thought)}</Field>
  </>
}

