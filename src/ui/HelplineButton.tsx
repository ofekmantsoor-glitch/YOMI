import { Link } from 'react-router'
import { LifeBuoy } from 'lucide-react'
import { copy } from '../copy'

/** One tap to helplines from every screen (P-12). */
export function HelplineButton() {
  return (
    <Link
      to="/help"
      className="glass inline-flex items-center gap-1.5 rounded-full min-h-11 px-4 text-sm font-medium text-primary"
    >
      <LifeBuoy aria-hidden size={18} />
      {copy.helpTitle}
    </Link>
  )
}
