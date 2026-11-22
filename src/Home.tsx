import { backendConfigured } from './data/api'

// Placeholder until stage 2 (join by code / therapist login).
export function Home() {
  return (
    <main className="mx-auto max-w-md px-5 py-10">
      <div className="glass rounded-lg p-6">
        <h1 className="text-2xl font-semibold mb-2">יומי</h1>
        <p className="text-muted">
          {backendConfigured ? 'החיבור לשרת מוגדר.' : <>החיבור לשרת עוד לא מוגדר. חסר הקובץ <bdi dir="ltr">.env.local</bdi></>}
        </p>
      </div>
    </main>
  )
}
