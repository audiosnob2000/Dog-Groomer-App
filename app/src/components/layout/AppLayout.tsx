import { NavLink, Outlet } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { useBusiness } from '../../contexts/BusinessContext'

// Icon paths copied from the design mockup (Main.dc.html's sidebar) for
// exact visual parity — 24x24 viewBox, 1.7 stroke, round caps/joins.
const ICONS = {
  today: 'M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z',
  calendar: 'M3 9.5h18M8 2.5v4M16 2.5v4',
  households: 'M2.5 20a6.5 6.5 0 0 1 13 0',
} as const

// Only nav items whose screen actually exists in this Phase 1 build.
// PLAN.md's mockup also shows Messages, Payments and Settings — those come
// with Phase 2 (messaging) and Phase 4 (billing); a nav link that goes
// nowhere is worse than a shorter sidebar for now.
const NAV_ITEMS = [
  { to: '/', label: 'Today', end: true, icon: ICONS.today },
  { to: '/calendar', label: 'Calendar', end: false, icon: 'calendar-rect' },
  { to: '/households', label: 'Households', end: false, icon: 'households-full' },
]

function NavIcon({ name }: { name: string }) {
  if (name === 'calendar-rect') {
    return (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <rect x="3" y="4.5" width="18" height="16.5" rx="2" />
        <path d={ICONS.calendar} />
      </svg>
    )
  }
  if (name === 'households-full') {
    return (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <circle cx="9" cy="8" r="3.5" />
        <path d={ICONS.households} />
        <path d="M16 4.6a3.5 3.5 0 0 1 0 6.8M18.5 14.2A6.5 6.5 0 0 1 21.5 20" />
      </svg>
    )
  }
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={name} />
    </svg>
  )
}

export default function AppLayout() {
  const { business } = useBusiness()
  const { user, signOutUser } = useAuth()

  const ownerInitial = (user?.email ?? '?').charAt(0).toUpperCase()

  return (
    <div className="flex h-screen overflow-hidden bg-page text-ink font-sans text-sm">
      <nav aria-label="Main" className="flex w-[248px] shrink-0 flex-col gap-[30px] border-r border-border bg-sidebar px-[18px] pb-[22px] pt-[30px]">
        <div className="flex flex-col gap-1 px-3">
          <div className="font-serif text-[32px] leading-none tracking-tight">Slotted</div>
          <div className="text-[12.5px] text-ink-muted">{business?.name ?? '…'}</div>
        </div>

        <div className="flex flex-col gap-[3px]">
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                `flex h-10 items-center gap-3 rounded-[10px] px-3 text-[14.5px] font-medium no-underline ${
                  isActive
                    ? 'bg-white text-ink shadow-[0_1px_2px_rgba(28,26,23,0.06),0_0_0_1px_#E5DFD4]'
                    : 'text-ink-dim'
                }`
              }
            >
              <NavIcon name={item.icon} />
              <span>{item.label}</span>
            </NavLink>
          ))}
        </div>

        <div className="grow" />

        <div className="flex flex-col gap-1.5 rounded-[14px] border border-border bg-white p-3.5">
          <div className="flex items-center gap-2 text-[12.5px] font-medium text-ink-dim">
            <span className="h-[7px] w-[7px] rounded-full bg-border" />
            Texting isn't set up yet
          </div>
          <div className="text-xs leading-snug text-ink-muted">
            Client texting arrives in Phase 2 — see Settings once it's built.
          </div>
        </div>

        <button
          type="button"
          onClick={() => void signOutUser()}
          className="flex items-center gap-2.5 rounded-lg px-1.5 py-1 text-left hover:bg-black/[0.03]"
        >
          <span
            aria-hidden="true"
            className="flex h-[34px] w-[34px] shrink-0 items-center justify-center rounded-full bg-accent-pale font-serif text-[17px] leading-none text-accent"
          >
            {ownerInitial}
          </span>
          <span className="flex flex-col gap-px">
            <span className="text-[13.5px] font-medium">{user?.email}</span>
            <span className="text-xs text-ink-muted">
              Owner{business?.subscriptionStatus === 'trialing' ? ' · Trial' : ''}
            </span>
          </span>
        </button>
      </nav>

      <main className="min-w-0 grow overflow-y-auto px-10 py-8">
        <Outlet />
      </main>
    </div>
  )
}
