// Shared UI pieces in the Luminous Silk style. Plain React, no component library.
import { useCallback, useEffect, useId, useState, type ButtonHTMLAttributes, type ReactNode } from 'react'
import { Link, useBlocker } from 'react-router'
import { Check, Loader2 } from 'lucide-react'
import { copy, errorText, genericError } from '../copy'
import { ApiError } from '../data/types'

export const cx = (...c: (string | false | null | undefined)[]) => c.filter(Boolean).join(' ')

type BtnProps = ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'secondary' | 'quiet' }
const btn = {
  primary: 'bg-primary text-white shadow-[0_12px_28px_rgb(111_138_183/0.25)] hover:bg-primary-container',
  secondary: 'glass text-primary hover:bg-white',
  quiet: 'text-primary hover:bg-white/60',
}
export function Button({ variant = 'primary', className, ...rest }: BtnProps) {
  return (
    <button
      {...rest}
      className={cx('inline-flex items-center justify-center gap-2 rounded-full min-h-12 px-6 font-medium transition active:scale-[0.97] disabled:opacity-60 disabled:active:scale-100', btn[variant], className)}
    />
  )
}
export function LinkButton({ to, variant = 'primary', className, children }: { to: string; variant?: BtnProps['variant']; className?: string; children: ReactNode }) {
  return <Link to={to} className={cx('inline-flex items-center justify-center gap-2 rounded-full min-h-12 px-6 font-medium transition active:scale-[0.97]', btn[variant], className)}>{children}</Link>
}

export const Card = ({ className, children }: { className?: string; children: ReactNode }) =>
  <div className={cx('glass rounded-lg p-5', className)}>{children}</div>

export const Page = ({ title, lead, children, wide }: { title: string; lead?: ReactNode; children: ReactNode; wide?: boolean }) => (
  <main className={cx('mx-auto px-5 py-6', wide ? 'max-w-6xl' : 'max-w-xl')}>
    <h1 className="text-[1.75rem] leading-tight font-semibold mb-2">{title}</h1>
    {lead && <p className="text-muted mb-6">{lead}</p>}
    {children}
  </main>
)

export const Tag = ({ children, tone = 'lilac' }: { children: ReactNode; tone?: 'lilac' | 'apricot' | 'blue' }) => (
  <span className={cx('inline-flex items-center rounded-full px-3 py-0.5 text-sm font-medium',
    tone === 'lilac' && 'bg-secondary-fixed text-on-secondary-container',
    tone === 'apricot' && 'bg-tertiary-fixed text-tertiary',
    tone === 'blue' && 'bg-primary-fixed text-on-primary-fixed')}>{children}</span>
)

export function TextField({ label, hint, value, onChange, multiline, required, ...rest }: {
  label: string; hint?: string; value: string; onChange: (v: string) => void; multiline?: boolean; required?: boolean
} & Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange' | 'value'>) {
  const id = useId()
  const cls = 'w-full rounded-md border border-outline-variant bg-white/80 px-4 py-3 text-base text-ink placeholder:text-muted focus:border-primary'
  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="block font-medium">{label}{required && <span className="text-muted font-normal"> (חובה)</span>}</label>
      {hint && <p id={`${id}-h`} className="text-sm text-muted">{hint}</p>}
      {multiline
        ? <textarea id={id} aria-describedby={hint ? `${id}-h` : undefined} value={value} onChange={e => onChange(e.target.value)} rows={4} className={cls} placeholder={rest.placeholder} />
        : <input id={id} aria-describedby={hint ? `${id}-h` : undefined} value={value} onChange={e => onChange(e.target.value)} className={cls} {...rest} />}
    </div>
  )
}

/** Radio or checkbox chips. Selection is shown by a check mark and a border, never by color alone. */
export function Chips<T extends string>({ legend, options, selected, onToggle, multiple, columns }: {
  legend: string; options: { value: T; label: string }[]; selected: T[]; onToggle: (v: T) => void; multiple?: boolean; columns?: boolean
}) {
  const name = useId()
  return (
    <fieldset className="space-y-2">
      <legend className="font-medium mb-2">{legend}</legend>
      <div className={cx(columns ? 'grid gap-2' : 'flex flex-wrap gap-2')}>
        {options.map(o => {
          const on = selected.includes(o.value)
          return (
            <label key={o.value} className={cx('relative inline-flex items-center gap-2 rounded-full min-h-12 px-4 cursor-pointer border-2 transition has-[:focus-visible]:outline-3 has-[:focus-visible]:outline-primary has-[:focus-visible]:outline-offset-2',
              on ? 'border-primary bg-primary-fixed text-on-primary-fixed font-medium' : 'border-transparent glass')}>
              <input type={multiple ? 'checkbox' : 'radio'} name={name} className="sr-only" checked={on} onChange={() => onToggle(o.value)} />
              {on ? <Check aria-hidden size={18} /> : <span aria-hidden className="inline-block size-[18px] rounded-full border-2 border-outline" />}
              {o.label}
            </label>
          )
        })}
      </div>
    </fieldset>
  )
}

/** 0–100 slider that starts with no value, always shows the number and both end labels (PRD rule). */
export function Slider({ label, value, onChange }: { label: string; value: number | null; onChange: (v: number | null) => void }) {
  const id = useId()
  const set = (el: HTMLInputElement) => onChange(Number(el.value))
  return (
    <div className="space-y-2">
      <div className="flex items-baseline justify-between gap-3">
        <label htmlFor={id} className="font-medium">{label}</label>
        <output htmlFor={id} className={cx('min-w-14 text-center rounded-full px-3 py-0.5 font-semibold tabular-nums', value == null ? 'text-muted bg-white/60' : 'bg-primary-fixed text-on-primary-fixed')}>
          {value ?? copy.notChosen}
        </output>
      </div>
      <input
        id={id} type="range" min={0} max={100} step={1}
        value={value ?? 50}
        aria-valuetext={value == null ? copy.notChosen : String(value)}
        onChange={e => set(e.currentTarget)}
        onPointerUp={e => value == null && set(e.currentTarget)}
        style={{ '--fill': `${value ?? 0}%` } as React.CSSProperties}
        className={cx('yomi-range', value == null && 'is-unset')}
      />
      <div className="flex justify-between text-sm text-muted">
        <span>{copy.sliderMin}</span><span>{copy.sliderMax}</span>
      </div>
      {value != null && <button type="button" onClick={() => onChange(null)} className="text-sm text-primary underline min-h-11">ניקוי הדירוג</button>}
    </div>
  )
}

export const Stepper = ({ step, total }: { step: number; total: number }) => (
  <div className="mb-6">
    <p className="text-sm font-medium text-primary mb-2">שלב {step} מתוך {total}</p>
    <div className="flex gap-2" aria-hidden>
      {Array.from({ length: total }, (_, i) => <span key={i} className={cx('h-1.5 flex-1 rounded-full', i < step ? 'bg-primary' : 'bg-primary-fixed')} />)}
    </div>
  </div>
)

/** Event time (P-09): default "now", can move earlier, never later. Entry time is recorded separately by the server. */
export function EventTimeField({ value, onChange }: { value: string | null; onChange: (v: string | null) => void }) {
  const id = useId()
  const nowLocal = () => { const d = new Date(); d.setSeconds(0, 0); return new Date(d.getTime() - d.getTimezoneOffset() * 60_000).toISOString().slice(0, 16) }
  return (
    <div className="space-y-2">
      <Chips legend="מתי זה היה?" selected={[value == null ? 'now' : 'earlier']} onToggle={v => onChange(v === 'now' ? null : nowLocal())}
        options={[{ value: 'now', label: 'עכשיו' }, { value: 'earlier', label: 'מועד מוקדם יותר' }]} />
      {value != null && (
        <div>
          <label htmlFor={id} className="sr-only">מועד האירוע</label>
          <input id={id} type="datetime-local" value={value} max={nowLocal()} onChange={e => onChange(e.target.value || null)}
            className="rounded-md border border-outline-variant bg-white/80 px-4 py-3" />
        </div>
      )}
    </div>
  )
}
/** Converts the field value to an ISO instant at save time ("now" is resolved when saving). */
export const eventAtIso = (v: string | null) => (v == null ? new Date() : new Date(v)).toISOString()

export const messageFor = (e: unknown) => (e instanceof ApiError && errorText[e.code]) || genericError

export function ErrorNote({ children }: { children: ReactNode }) {
  return <p role="alert" className="rounded-md bg-error-container text-on-error-container px-4 py-3">{children}</p>
}

/** Load data for a screen. */
export function useLoad<T>(fn: () => Promise<T>, deps: unknown[]) {
  const [state, setState] = useState<{ data?: T; error?: unknown }>({})
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const load = useCallback(fn, deps)
  useEffect(() => {
    let live = true
    load().then(data => live && setState({ data }), error => live && setState({ error }))
    return () => { live = false }
  }, [load])
  return state
}

export const Loading = () => <p className="text-muted px-5 py-10 text-center" role="status">טוען…</p>

/**
 * Save flow (P-10): button disabled while saving, confirmation only after success,
 * on failure the form stays filled with a retry. Asks before leaving a form with content (P-11).
 */
export function useSave(dirty: boolean) {
  const [state, setState] = useState<'idle' | 'saving' | 'saved' | 'failed'>('idle')
  const [error, setError] = useState<string | null>(null)
  const guard = dirty && state !== 'saved'
  const blocker = useBlocker(guard)
  useEffect(() => {
    if (blocker.state === 'blocked') {
      if (window.confirm(copy.leaveConfirm)) blocker.proceed()
      else blocker.reset()
    }
  }, [blocker])
  useEffect(() => {
    if (!guard) return
    const h = (e: BeforeUnloadEvent) => e.preventDefault()
    window.addEventListener('beforeunload', h)
    return () => window.removeEventListener('beforeunload', h)
  }, [guard])
  const run = async (fn: () => Promise<unknown>) => {
    if (state === 'saving') return
    setState('saving'); setError(null)
    try { await fn(); setState('saved') } catch (e) { setError(messageFor(e)); setState('failed') }
  }
  return { state, error, run }
}

export function SaveBar({ state, error, onSave, disabled, label = copy.saveReport }: {
  state: ReturnType<typeof useSave>['state']; error: string | null; onSave: () => void; disabled?: boolean; label?: string
}) {
  return (
    <div className="space-y-3 pt-2">
      {state === 'failed' && <ErrorNote>{error === genericError ? copy.saveFailed : error}</ErrorNote>}
      <Button type="button" onClick={onSave} disabled={disabled || state === 'saving'} aria-busy={state === 'saving'} className="w-full">
        {state === 'saving' ? <><Loader2 aria-hidden className="animate-spin" size={20} />{copy.saving}</> : state === 'failed' ? copy.retry : label}
      </Button>
    </div>
  )
}

/** Shown in place of the form, only after the save succeeded. */
export function Saved() {
  return (
    <main className="mx-auto max-w-xl px-5 py-10 text-center">
      <div className="mx-auto mb-6 grid size-28 place-items-center rounded-full glass-strong">
        <Check aria-hidden size={44} className="text-primary" />
      </div>
      <h1 role="status" className="text-2xl font-semibold mb-8">{copy.saveConfirmed}</h1>
      <LinkButton to="/" className="w-full">{copy.backToTasks}</LinkButton>
    </main>
  )
}
