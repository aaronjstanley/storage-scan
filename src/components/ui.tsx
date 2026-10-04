import { useNavigate } from 'react-router-dom'

interface NavButtonProps {
  to: string
  children: React.ReactNode
  className?: string
  onPrefetch?: () => void
  onBeforeNavigate?: () => void
  preventScrollReset?: boolean
  disabled?: boolean
}

export function NavButton({
  to,
  children,
  className = '',
  onPrefetch,
  onBeforeNavigate,
  preventScrollReset,
  disabled,
}: NavButtonProps) {
  const navigate = useNavigate()

  return (
    <button
      type="button"
      disabled={disabled}
      onClick={() => {
        onBeforeNavigate?.()
        navigate(to, preventScrollReset ? { preventScrollReset: true } : undefined)
      }}
      onTouchStart={onPrefetch}
      onMouseEnter={onPrefetch}
      className={className}
    >
      {children}
    </button>
  )
}

export const ui = {
  page: 'mx-auto min-h-dvh max-w-lg px-4 py-5 pb-8',
  card: 'rounded-2xl border border-white/60 bg-white/90 p-4 shadow-lg shadow-violet-500/10 backdrop-blur-sm',
  cardAccent:
    'rounded-2xl border border-white/60 bg-white/90 p-4 shadow-lg shadow-fuchsia-500/10 backdrop-blur-sm',
  title: 'bg-gradient-to-r from-violet-700 via-fuchsia-600 to-orange-500 bg-clip-text text-3xl font-extrabold text-transparent',
  subtitle: 'text-sm font-semibold uppercase tracking-wide text-violet-600/80',
  sectionTitle: 'text-sm font-bold uppercase tracking-wide text-fuchsia-700',
  input:
    'w-full rounded-2xl border-2 border-violet-200 bg-white px-4 py-3 text-base text-violet-950 placeholder:text-violet-400 focus:border-fuchsia-400 focus:outline-none focus:ring-2 focus:ring-fuchsia-300/50',
  btnPrimary:
    'inline-flex min-h-11 items-center justify-center rounded-2xl bg-gradient-to-r from-violet-600 to-fuchsia-500 px-5 py-3 text-sm font-bold text-white shadow-lg shadow-violet-500/30 transition active:scale-[0.98] disabled:opacity-50',
  btnSecondary:
    'inline-flex min-h-11 items-center justify-center rounded-2xl border-2 border-violet-200 bg-white px-4 py-3 text-sm font-bold text-violet-700 transition active:scale-[0.98] hover:bg-violet-50 disabled:opacity-50',
  btnTeal:
    'inline-flex min-h-11 items-center justify-center rounded-2xl bg-gradient-to-r from-teal-500 to-cyan-500 px-4 py-3 text-sm font-bold text-white shadow-md shadow-teal-500/25 transition active:scale-[0.98] disabled:opacity-50',
  btnDanger:
    'inline-flex min-h-11 items-center justify-center rounded-2xl bg-gradient-to-r from-rose-500 to-red-500 px-4 py-3 text-sm font-bold text-white shadow-md shadow-rose-500/25 transition active:scale-[0.98]',
  btnDangerGhost:
    'inline-flex min-h-11 items-center justify-center rounded-2xl px-3 py-2 text-sm font-bold text-rose-600 transition active:scale-[0.98] hover:bg-rose-50',
  btnBack:
    'inline-flex min-h-10 items-center justify-center rounded-full bg-white/80 px-4 py-2 text-sm font-bold text-violet-700 shadow-md backdrop-blur-sm transition active:scale-[0.98] hover:bg-white',
  btnGhost:
    'inline-flex min-h-10 items-center justify-center rounded-xl px-3 py-2 text-sm font-semibold text-violet-600 transition active:scale-[0.98] hover:bg-violet-100',
  muted: 'text-center text-violet-600/70',
}
