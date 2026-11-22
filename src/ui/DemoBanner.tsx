import { copy } from '../copy'

export function DemoBanner() {
  return (
    <div role="note" className="bg-tertiary-fixed text-ink text-center text-sm font-medium py-1.5 px-4">
      {copy.demoBanner}
    </div>
  )
}
