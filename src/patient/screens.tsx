// Patient screens, phone first (PRD P-01 … P-12). One short step at a time, no interpretation, no judgment.
import { useState, type FormEvent } from 'react'
import { Link, Navigate, Outlet, useNavigate, useParams, useSearchParams } from 'react-router'
import { ArrowRight } from 'lucide-react'
import { api, type BehavioralPayload, type ReportInput, type Task } from '../data/api'
import { copy, taskTypeLabel } from '../copy'
import { EMOTIONS, MAX_EMOTIONS, NON_COMPLETION_REASONS, OTHER_EMOTION, type NonCompletionReason } from '../domain/assumptions'
import { doneCount, isNew, localDate, therapeuticWeek, weeklyTarget } from '../domain/week'
import { frequencyText } from '../domain/format'
import { Button, Card, Chips, ErrorNote, EventTimeField, eventAtIso, LinkButton, Loading, messageFor, Page, SaveBar, Saved, Slider, Stepper, Tag, TextField, useLoad, useSave } from '../ui/kit'

export function RequirePatient() {
  return api.currentPatient() ? <Outlet /> : <Navigate to="/join" replace />
}

// ── P-01 ──
export function Join() {
  const navigate = useNavigate()
  const [code, setCode] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const submit = async (e: FormEvent) => {
    e.preventDefault(); setBusy(true); setError(null)
    try { await api.redeemInvite(code); navigate('/about?first=1') } catch (err) { setError(messageFor(err)) } finally { setBusy(false) }
  }
  return (
    <Page title="הצטרפות" lead="המטפל מסר לך קוד הצטרפות בפגישה. אין צורך בשם, אימייל או סיסמה.">
      <form onSubmit={submit} className="glass rounded-lg p-5 space-y-4">
        <TextField label="קוד הצטרפות" dir="ltr" autoCapitalize="characters" autoComplete="one-time-code" spellCheck={false}
          placeholder="XXXX-XXXX" value={code} onChange={setCode} className="w-full rounded-md border border-outline-variant bg-white/80 px-4 py-3 text-2xl tracking-widest text-center" />
        {error && <ErrorNote>{error}</ErrorNote>}
        <Button disabled={busy || !code.trim()} className="w-full">{busy ? 'מצטרף…' : 'הצטרפות'}</Button>
      </form>
    </Page>
  )
}

// ── P-02 ── (visibility rule = PRD working assumption 2: visible to the therapist as soon as it is saved)
export function Transparency() {
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const first = params.has('first')
  const items = [
    ['מה המטפל רואה', 'את המשימות שהגדיר ואת הדיווחים שלך עליהן, כולל דיווח על משימה שלא בוצעה והסיבה שבחרת.'],
    ['מתי', 'כל דיווח זמין למטפל מרגע שנשמר, כדי שיוכל לעבור עליו לקראת הפגישה. המטפל לא מקבל התראה על כל דיווח.'],
    ['מה המטפל לא עושה', 'המטפל רק קורא. הוא לא משנה את מה שכתבת.'],
    ['מי עוד רואה', 'אף אחד. אין באפליקציה בינה מלאכותית שקוראת את הדיווחים, ואין כלי פרסום או מעקב.'],
    ['זה לא שירות חירום', 'אף אחד לא עוקב אחרי הדיווחים בזמן אמת. במצב חירום יש לפנות לקווי הסיוע, שזמינים מכל מסך.'],
  ]
  return (
    <Page title="מה המטפל רואה ומתי">
      <Card>
        <dl className="space-y-4">
          {items.map(([t, d]) => <div key={t}><dt className="font-medium">{t}</dt><dd className="text-muted">{d}</dd></div>)}
        </dl>
      </Card>
      <div className="mt-6 flex flex-wrap gap-3">
        {first ? <LinkButton to="/" className="w-full">הבנתי, להמשיך</LinkButton>
          : <Button variant="secondary" onClick={() => navigate(-1)}>חזרה</Button>}
        <Link to="/help" className="inline-flex items-center min-h-11 px-2 text-primary underline">{copy.helpTitle}</Link>
      </div>
    </Page>
  )
}

// ── P-03 / P-04 ──
export function MyTasks() {
  const { data, error } = useLoad(() => api.myData(), [])
  if (error) return <Page title="המשימות שלי"><ErrorNote>{messageFor(error)}</ErrorNote></Page>
  if (!data) return <Loading />
  const week = therapeuticWeek(data.patient.session_weekday, localDate(new Date()))
  return (
    <Page title="המשימות שלי">
      {data.tasks.length === 0 ? <Card><p data-testid="empty-tasks">{copy.emptyTasks}</p></Card> : (
        <ul className="space-y-4">
          {data.tasks.map(t => {
            const x = doneCount(t, data.reports, week), y = weeklyTarget(t)
            return (
              <li key={t.id}>
                <article className="glass rounded-lg p-5" aria-labelledby={`t-${t.id}`} data-testid="task-card">
                  <div className="flex flex-wrap items-center gap-2 mb-2">
                    <Tag tone={t.type === 'behavioral' ? 'blue' : 'lilac'}>{taskTypeLabel[t.type]}</Tag>
                    {isNew(t, data.reports) && <Tag tone="apricot">חדש</Tag>}
                  </div>
                  <h2 id={`t-${t.id}`} className="text-xl font-semibold">{t.title}</h2>
                  {t.instruction && <p className="mt-1">{t.instruction}</p>}
                  <p className="text-sm text-muted mt-2">
                    {frequencyText(t)} · <span data-testid="progress">{y == null ? `${x} דיווחים השבוע` : `${x} מתוך ${y} השבוע`}</span>
                  </p>
                  <div className="mt-4 flex gap-3">
                    <LinkButton to={`/report/${t.id}`} className="flex-1"><span aria-hidden>דיווח</span><span className="sr-only">דיווח על {t.title}</span></LinkButton>
                    <LinkButton to={`/not-done/${t.id}`} variant="secondary" className="flex-1"><span aria-hidden>לא ביצעתי</span><span className="sr-only">לא ביצעתי: {t.title}</span></LinkButton>
                  </div>
                </article>
              </li>
            )
          })}
        </ul>
      )}
    </Page>
  )
}

/** Loads one of my active tasks, then renders the matching form. */
function WithTask({ render }: { render: (t: Task) => React.ReactNode }) {
  const { taskId = '' } = useParams()
  const { data, error } = useLoad(() => api.myData(), [])
  if (error) return <Page title="שגיאה"><ErrorNote>{messageFor(error)}</ErrorNote></Page>
  if (!data) return <Loading />
  const task = data.tasks.find(t => t.id === taskId)
  return task ? <>{render(task)}</> : <Page title="המשימה לא נמצאה"><LinkButton to="/">{copy.backToTasks}</LinkButton></Page>
}
export const ReportScreen = () => <WithTask render={t => t.type === 'behavioral' ? <BehavioralReport task={t} /> : <ThoughtReport task={t} />} />
export const NonCompletionScreen = () => <WithTask render={t => <NonCompletion task={t} />} />

/** id is created when the form opens, so a double tap or a retry saves one report (PRD idempotency). */
function useReportDraft(task: Task, dirty: boolean) {
  const [id] = useState(() => crypto.randomUUID())
  const [startedAt] = useState(() => new Date().toISOString())
  const [eventAt, setEventAt] = useState<string | null>(null)
  const save = useSave(dirty)
  const submit = (input: ReportInput) =>
    save.run(() => api.saveReport({ ...input, id, task_id: task.id, started_at: startedAt, event_at: eventAtIso(eventAt) }))
  return { save, submit, eventAt, setEventAt }
}

const TaskHeader = ({ task }: { task: Task }) => (
  <div className="mb-6">
    <Tag tone={task.type === 'behavioral' ? 'blue' : 'lilac'}>{taskTypeLabel[task.type]}</Tag>
    <h1 className="text-[1.75rem] leading-tight font-semibold mt-2">{task.title}</h1>
    {task.instruction && <p className="text-muted mt-1">{task.instruction}</p>}
  </div>
)

// ── P-05 ──
function BehavioralReport({ task }: { task: Task }) {
  const [status, setStatus] = useState<BehavioralPayload['status'] | null>(null)
  const [before, setBefore] = useState<number | null>(null)
  const [after, setAfter] = useState<number | null>(null)
  const [note, setNote] = useState('')
  const [invalid, setInvalid] = useState(false)
  const { save, submit, eventAt, setEventAt } = useReportDraft(task, Boolean(status || before != null || after != null || note))
  if (save.state === 'saved') return <Saved />
  const onSave = () => {
    if (!status) return setInvalid(true)
    setInvalid(false)
    submit({ kind: 'behavioral', payload: { status, distress_before: before, distress_after: after, note: note.trim() } })
  }
  return (
    <main className="mx-auto max-w-xl px-5 py-6">
      <TaskHeader task={task} />
      <div className="glass rounded-lg p-5 space-y-6">
        <Chips legend="איך זה הלך?" selected={status ? [status] : []} onToggle={setStatus}
          options={[{ value: 'done', label: 'בוצע' }, { value: 'partial', label: 'בוצע חלקית' }]} />
        <Slider label="מצוקה לפני (רשות)" value={before} onChange={setBefore} />
        <Slider label="מצוקה אחרי (רשות)" value={after} onChange={setAfter} />
        <TextField label="הערה (רשות)" value={note} onChange={setNote} multiline />
        <EventTimeField value={eventAt} onChange={setEventAt} />
        {invalid && <ErrorNote>צריך לבחור ״בוצע״ או ״בוצע חלקית״.</ErrorNote>}
        <SaveBar state={save.state} error={save.error} onSave={onSave} />
      </div>
    </main>
  )
}

// ── P-06 ──
function NonCompletion({ task }: { task: Task }) {
  const [reason, setReason] = useState<NonCompletionReason | null>(null)
  const [note, setNote] = useState('')
  const { save, submit, eventAt, setEventAt } = useReportDraft(task, Boolean(reason || note))
  if (save.state === 'saved') return <Saved />
  return (
    <main className="mx-auto max-w-xl px-5 py-6">
      <TaskHeader task={task} />
      <div className="glass rounded-lg p-5 space-y-6">
        <Chips legend="מה הפריע?" columns selected={reason ? [reason] : []} onToggle={setReason}
          options={(Object.keys(NON_COMPLETION_REASONS) as NonCompletionReason[]).map(r => ({ value: r, label: NON_COMPLETION_REASONS[r] }))} />
        <TextField label="הערה (רשות)" value={note} onChange={setNote} multiline />
        <EventTimeField value={eventAt} onChange={setEventAt} />
        <SaveBar state={save.state} error={save.error} disabled={!reason}
          onSave={() => reason && submit({ kind: 'non_completion', payload: { reason, note: note.trim() } })} />
      </div>
    </main>
  )
}

// ── P-07 ── three steps; going back keeps what was entered (state lives above the steps).
function ThoughtReport({ task }: { task: Task }) {
  const navigate = useNavigate()
  const [step, setStep] = useState(1)
  const [situation, setSituation] = useState('')
  const [picked, setPicked] = useState<string[]>([])
  const [intensity, setIntensity] = useState<Record<string, number | null>>({})
  const [otherName, setOtherName] = useState('')
  const [thought, setThought] = useState('')
  const [invalid, setInvalid] = useState(false)
  const { save, submit, eventAt, setEventAt } = useReportDraft(task, Boolean(situation || picked.length || thought))
  if (save.state === 'saved') return <Saved />

  const toggle = (e: string) => setPicked(p => p.includes(e) ? p.filter(x => x !== e) : p.length < MAX_EMOTIONS ? [...p, e] : p)
  const emotions = picked.filter(e => intensity[e] != null)
    .map(e => ({ name: e === OTHER_EMOTION ? otherName.trim() || OTHER_EMOTION : e, intensity: intensity[e]! }))
  const onSave = () => {
    if (!situation.trim() && !thought.trim()) return setInvalid(true)
    submit({ kind: 'thought', payload: { situation: situation.trim(), emotions, thought: thought.trim() } })
  }

  return (
    <main className="mx-auto max-w-xl px-5 py-6">
      <button type="button" onClick={() => step > 1 ? setStep(step - 1) : navigate(-1)}
        className="inline-flex items-center gap-1 min-h-11 text-primary font-medium mb-2">
        <ArrowRight aria-hidden size={20} />{step > 1 ? 'חזרה לשלב הקודם' : 'חזרה'}
      </button>
      <p className="text-sm text-muted">{task.title}</p>
      <Stepper step={step} total={3} />
      <div className="glass rounded-lg p-5 space-y-6">
        {step === 1 && <>
          <TextField label="מה קרה?" hint="אפשר לתאר רגע אחד, כמו שהוא קרה." value={situation} onChange={setSituation} multiline />
          <EventTimeField value={eventAt} onChange={setEventAt} />
          <Button className="w-full" onClick={() => setStep(2)}>המשך</Button>
        </>}

        {step === 2 && <>
          <Chips legend={`מה הרגשת? (עד ${MAX_EMOTIONS})`} multiple selected={picked} onToggle={toggle}
            options={[...EMOTIONS, OTHER_EMOTION].map(e => ({ value: e, label: e }))} />
          {picked.length >= MAX_EMOTIONS && <p className="text-sm text-muted">אפשר לבחור עד {MAX_EMOTIONS} רגשות.</p>}
          {picked.includes(OTHER_EMOTION) && <TextField label="איזה רגש?" value={otherName} onChange={setOtherName} maxLength={30} />}
          {picked.map(e => (
            <Slider key={e} label={`עוצמה: ${e === OTHER_EMOTION ? otherName || OTHER_EMOTION : e}`} value={intensity[e] ?? null}
              onChange={v => setIntensity(s => ({ ...s, [e]: v }))} />
          ))}
          {emotions.length === 0 && <p className="text-sm text-muted">כדי להמשיך, צריך לבחור רגש אחד לפחות ולסמן את העוצמה שלו.</p>}
          <Button className="w-full" disabled={emotions.length === 0} onClick={() => setStep(3)}>המשך</Button>
        </>}

        {step === 3 && <>
          <TextField label="איזו מחשבה עלתה לך באותו רגע?" value={thought} onChange={setThought} multiline />
          {invalid && <ErrorNote>צריך לכתוב מה קרה או איזו מחשבה עלתה. אפשר לחזור לשלב הראשון.</ErrorNote>}
          <SaveBar state={save.state} error={save.error} onSave={onSave} />
        </>}
      </div>
    </main>
  )
}
