import { useLayoutEffect, useEffect } from 'react'
import {
  getScrollY,
  recalledLocationScroll,
  rememberLocationScroll,
  setScrollY,
} from '../lib/scrollMemory'

export function useRestoreLocationScroll(
  locationId: string | undefined,
  ready: boolean,
) {
  useEffect(() => {
    if (!locationId) return
    const save = () => {
      const y = getScrollY()
      if (y > 0) rememberLocationScroll(locationId, y)
    }
    window.addEventListener('pointerdown', save, { capture: true })
    window.addEventListener('touchstart', save, { capture: true, passive: true })
    return () => {
      save()
      window.removeEventListener('pointerdown', save, { capture: true })
      window.removeEventListener('touchstart', save, { capture: true })
    }
  }, [locationId])

  useLayoutEffect(() => {
    if (!locationId || !ready) return
    const y = recalledLocationScroll(locationId)
    if (y == null || y === 0) return

    let cancelled = false
    const restore = () => {
      if (!cancelled) setScrollY(y)
    }
    restore()
    const timers = [0, 50, 100, 200, 400].map((ms) => window.setTimeout(restore, ms))
    window.addEventListener('hashchange', restore)
    return () => {
      cancelled = true
      for (const timer of timers) window.clearTimeout(timer)
      window.removeEventListener('hashchange', restore)
    }
  }, [locationId, ready])
}
