import { Outlet } from 'react-router'
import { DemoBanner } from './ui/DemoBanner'
import { HelplineButton } from './ui/HelplineButton'

export function Layout() {
  return (
    <>
      <DemoBanner />
      <header className="flex items-center justify-between px-5 pt-3">
        <span className="text-xl font-semibold text-primary">יומי</span>
        <HelplineButton />
      </header>
      <Outlet />
    </>
  )
}
