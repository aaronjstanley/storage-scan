import type { Container, ContainerSummary, Location, Row } from '../types'

export const cache = {
  locations: null as Location[] | null,
  locationById: new Map<string, Location>(),
  rowsByLocation: new Map<string, Row[]>(),
  containersByLocation: new Map<string, ContainerSummary[]>(),
  containerById: new Map<string, Container>(),
}

export function invalidateLocations() {
  cache.locations = null
}

export function invalidateLocation(locationId: string) {
  cache.locationById.delete(locationId)
  cache.rowsByLocation.delete(locationId)
  cache.containersByLocation.delete(locationId)
}

export function invalidateContainer(containerId: string) {
  cache.containerById.delete(containerId)
}

export function patchCachedContainer(
  containerId: string,
  patch: Partial<Container>,
) {
  const cached = cache.containerById.get(containerId)
  if (cached) {
    const next = { ...cached, ...patch }
    cache.containerById.set(containerId, next)
    const list = cache.containersByLocation.get(cached.locationId)
    if (list) {
      cache.containersByLocation.set(
        cached.locationId,
        list.map((item) =>
          item.id === containerId
            ? {
                ...item,
                label: next.label,
                hasContents: next.hasContents,
                updatedAt: next.updatedAt,
              }
            : item,
        ),
      )
    }
    return next
  }

  for (const [locationId, list] of cache.containersByLocation) {
    const index = list.findIndex((item) => item.id === containerId)
    if (index === -1) continue
    const current = list[index]
    const next = { ...current, ...patch }
    const updated = [...list]
    updated[index] = {
      ...current,
      label: next.label ?? current.label,
      hasContents: next.hasContents ?? current.hasContents,
      updatedAt: next.updatedAt ?? current.updatedAt,
    }
    cache.containersByLocation.set(locationId, updated)
    break
  }
}

export function invalidateAll() {
  cache.locations = null
  cache.locationById.clear()
  cache.rowsByLocation.clear()
  cache.containersByLocation.clear()
  cache.containerById.clear()
}
