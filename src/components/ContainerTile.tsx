import type { CSSProperties, HTMLAttributes } from 'react'
import { prefetchContainer } from '../hooks/useContainers'
import type { ContainerSummary } from '../types'

interface ContainerTileProps {
  container: ContainerSummary
  onNavigate: () => void
  className?: string
  drag?: {
    setNodeRef: (node: HTMLElement | null) => void
    style?: CSSProperties
    attributes: HTMLAttributes<HTMLElement>
    listeners?: HTMLAttributes<HTMLElement>
  }
}

function numberBadgeClass(hasContents: boolean) {
  return hasContents
    ? 'flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-cyan-500 via-violet-500 to-fuchsia-500 text-lg font-extrabold text-white shadow-md shadow-violet-500/30'
    : 'flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border-2 border-dashed border-slate-300 bg-slate-100/80 text-lg font-extrabold text-slate-400'
}

function rowClass(hasContents: boolean) {
  return hasContents
    ? 'flex w-full items-center gap-3 rounded-2xl bg-gradient-to-r from-violet-50 to-fuchsia-50 px-3 py-2 text-left shadow-sm shadow-violet-500/10 transition active:scale-[0.99]'
    : 'flex w-full items-center gap-3 rounded-2xl border-2 border-dashed border-slate-200 bg-white/70 px-3 py-2 text-left transition active:scale-[0.99]'
}

export function ContainerTile({
  container,
  onNavigate,
  className = '',
  drag,
}: ContainerTileProps) {
  return (
    <button
      type="button"
      ref={drag?.setNodeRef}
      style={drag?.style}
      {...(drag?.attributes ?? {})}
      {...(drag?.listeners ?? {})}
      aria-label={
        container.label
          ? `Container ${container.number}: ${container.label}`
          : `Container ${container.number}`
      }
      onClick={onNavigate}
      onTouchStart={() => prefetchContainer(container.id)}
      onMouseEnter={() => prefetchContainer(container.id)}
      className={`${rowClass(container.hasContents)} ${className}`}
    >
      <span className={numberBadgeClass(container.hasContents)}>
        {container.number}
      </span>
      {container.label ? (
        <span className="min-w-0 truncate text-base font-bold text-violet-900">
          {container.label}
        </span>
      ) : null}
    </button>
  )
}
