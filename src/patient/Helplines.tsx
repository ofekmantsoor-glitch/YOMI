import { useNavigate } from 'react-router'
import { Phone, MessageCircle } from 'lucide-react'
import { copy } from '../copy'

const lines = [
  { name: 'ער״ן: עזרה ראשונה נפשית', detail: '1201 · כל שעות היממה', href: 'tel:1201', Icon: Phone },
  { name: 'סה״ר: סיוע והקשבה ברשת', detail: 'צ׳אט באתר sahar.org.il', href: 'https://sahar.org.il', Icon: MessageCircle },
  { name: 'מד״א: מוקד חירום', detail: '101', href: 'tel:101', Icon: Phone },
]

export function Helplines() {
  const navigate = useNavigate()
  return (
    <main className="mx-auto max-w-md px-5 py-6">
      <h1 className="text-2xl font-semibold mb-2">{copy.helpTitle}</h1>
      <p className="text-muted mb-6">{copy.helpNotMonitored}</p>
      <ul className="space-y-3">
        {lines.map(({ name, detail, href, Icon }) => (
          <li key={href}>
            <a
              href={href}
              rel="noreferrer noopener"
              target={href.startsWith('http') ? '_blank' : undefined}
              className="glass flex items-center gap-4 rounded-md p-4 min-h-16"
            >
              <Icon aria-hidden className="text-primary shrink-0" />
              <span>
                <span className="block font-medium">{name}</span>
                <span className="block text-muted text-sm">{detail}</span>
              </span>
            </a>
          </li>
        ))}
      </ul>
      <button onClick={() => navigate(-1)} className="mt-8 min-h-11 px-5 rounded-full text-primary font-medium">
        חזרה
      </button>
    </main>
  )
}
