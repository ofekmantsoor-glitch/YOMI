import { Link, Outlet, useLocation, useNavigate } from 'react-router'
import { useState } from 'react'
import { Info, LogOut } from 'lucide-react'
import { DemoBanner } from './ui/DemoBanner'
import { HelplineButton } from './ui/HelplineButton'
import { api, demo, isLocalMode } from './data/api'

export function PatientLayout() {
  return (
    <>
      <DemoBanner />
      <header className="mx-auto max-w-xl flex items-center justify-between gap-2 px-5 pt-3">
        <Link to="/" className="text-xl font-semibold text-primary min-h-11 inline-flex items-center">יומי</Link>
        <nav className="flex items-center gap-1">
          <Link to="/about" className="inline-flex items-center gap-1.5 rounded-full min-h-11 px-3 text-sm font-medium text-primary">
            <Info aria-hidden size={18} />מה המטפל רואה
          </Link>
          <HelplineButton />
        </nav>
      </header>
      <Outlet />
      <DevBar />
    </>
  )
}

export function TherapistLayout() {
  const navigate = useNavigate()
  useLocation() // re-render on navigation so the header reflects login/logout
  const t = api.currentTherapist()
  return (
    <>
      <DemoBanner />
      <header className="mx-auto max-w-6xl flex items-center justify-between gap-2 px-5 pt-3">
        <Link to="/therapist" className="text-xl font-semibold text-primary min-h-11 inline-flex items-center">YOMI · מרחב המטפל</Link>
        {t && (
          <div className="flex items-center gap-2 text-sm">
            <span className="text-muted hidden sm:inline">{t.display_name}</span>
            <button onClick={() => { api.therapistLogout(); navigate('/therapist/login') }}
              className="inline-flex items-center gap-1.5 rounded-full min-h-11 px-3 font-medium text-primary">
              <LogOut aria-hidden size={18} />יציאה
            </button>
          </div>
        )}
      </header>
      <Outlet />
      <DevBar />
    </>
  )
}

/** Local demo controls. Gone once the app runs against Supabase. */
function DevBar() {
  const [fail, setFail] = useState(demo.failSaves)
  if (!isLocalMode) return null
  return (
    <details className="mx-auto max-w-xl px-5 pb-6 pt-10 text-sm text-muted">
      <summary className="cursor-pointer min-h-11 inline-flex items-center">כלי הדגמה (מצב מקומי)</summary>
      <div className="glass rounded-md p-4 mt-2 space-y-3">
        <p>הנתונים נשמרים רק בזיכרון של הדפדפן ונמחקים ברענון הדף. כדאי לעבור בין המסכים רק בקישורים.</p>
        <div className="flex flex-wrap gap-2">
          <Link className="underline text-primary min-h-11 inline-flex items-center" to="/therapist">למסך המטפל</Link>
          <Link className="underline text-primary min-h-11 inline-flex items-center" to="/">למסך המטופל</Link>
          <Link className="underline text-primary min-h-11 inline-flex items-center" to="/" onClick={() => api.demoEnterAsPatient()}>כניסה כמטופל/ת ד׳</Link>
          <Link className="underline text-primary min-h-11 inline-flex items-center" to="/join" onClick={() => api.demoPatientLogout()}>יציאה מהטלפון (הצטרפות מחדש)</Link>
        </div>
        <label className="flex items-center gap-2 min-h-11">
          <input type="checkbox" checked={fail} onChange={e => { demo.failSaves = e.target.checked; setFail(e.target.checked) }} />
          לדמות כשל בשמירה (כל עוד מסומן)
        </label>
      </div>
    </details>
  )
}
