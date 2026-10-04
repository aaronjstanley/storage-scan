import { useCallback, useEffect, useState } from 'react'
import { cache, invalidateLocation, invalidateLocations } from '../lib/dataCache'
import { mapLocation } from '../lib/mappers'
import { supabase } from '../lib/supabase'
import { getLocationContainers } from './useContainers'
import { getLocationRows } from './useRows'
import type { Location } from '../types'

const inflightLocations = new Map<string, Promise<Location | null>>()

async function fetchLocations(): Promise<Location[]> {
  const { data, error } = await supabase
    .from('locations')
    .select('*')
    .order('name')
  if (error) throw error
  return (data ?? []).map(mapLocation)
}

async function fetchLocation(locationId: string): Promise<Location | null> {
  const pending = inflightLocations.get(locationId)
  if (pending) return pending

  const request = (async () => {
    const { data, error } = await supabase
      .from('locations')
      .select('*')
      .eq('id', locationId)
      .maybeSingle()
    if (error) throw error
    return data ? mapLocation(data) : null
  })()

  inflightLocations.set(locationId, request)
  try {
    return await request
  } finally {
    inflightLocations.delete(locationId)
  }
}

export function useLocations() {
  const [locations, setLocations] = useState<Location[]>(cache.locations ?? [])
  const [loading, setLoading] = useState(cache.locations === null)

  const refresh = useCallback(async () => {
    const data = await fetchLocations()
    cache.locations = data
    data.forEach((loc) => cache.locationById.set(loc.id, loc))
    setLocations(data)
    setLoading(false)
    return data
  }, [])

  useEffect(() => {
    if (cache.locations) {
      setLocations(cache.locations)
      setLoading(false)
      return
    }
    refresh()
  }, [refresh])

  return { locations, loading, refresh }
}

export function useLocation(locationId: string | undefined) {
  const cached = locationId ? cache.locationById.get(locationId) : undefined
  const [location, setLocation] = useState<Location | null>(cached ?? null)
  const [loading, setLoading] = useState(Boolean(locationId && !cached))

  const refresh = useCallback(async () => {
    if (!locationId) {
      setLocation(null)
      setLoading(false)
      return null
    }
    const mapped = await fetchLocation(locationId)
    if (mapped) cache.locationById.set(locationId, mapped)
    else cache.locationById.delete(locationId)
    setLocation(mapped)
    setLoading(false)
    return mapped
  }, [locationId])

  useEffect(() => {
    if (!locationId) {
      setLocation(null)
      setLoading(false)
      return
    }
    const hit = cache.locationById.get(locationId)
    if (hit) {
      setLocation(hit)
      setLoading(false)
      return
    }
    refresh()
  }, [locationId, refresh])

  return { location, loading, refresh }
}

export async function prefetchLocation(locationId: string) {
  const tasks: Promise<unknown>[] = []

  if (!cache.locationById.has(locationId)) {
    tasks.push(
      fetchLocation(locationId).then((mapped) => {
        if (mapped) cache.locationById.set(locationId, mapped)
      }),
    )
  }

  if (!cache.rowsByLocation.has(locationId)) {
    tasks.push(
      getLocationRows(locationId).then((rows) => {
        cache.rowsByLocation.set(locationId, rows)
      }),
    )
  }

  if (!cache.containersByLocation.has(locationId)) {
    tasks.push(
      getLocationContainers(locationId).then((containers) => {
        cache.containersByLocation.set(locationId, containers)
      }),
    )
  }

  if (tasks.length > 0) await Promise.all(tasks)
}

export async function createLocation(name: string): Promise<string> {
  const now = Date.now()
  const { data, error } = await supabase
    .from('locations')
    .insert({
      name,
      sort_order: now,
      container_count: 0,
      updated_at: new Date(now).toISOString(),
    })
    .select('id')
    .single()
  if (error) throw error
  invalidateLocations()
  return data.id
}

export async function renameLocation(id: string, name: string) {
  const { error } = await supabase
    .from('locations')
    .update({ name, updated_at: new Date().toISOString() })
    .eq('id', id)
  if (error) throw error
  invalidateLocations()
  invalidateLocation(id)
}

export async function deleteLocation(id: string) {
  const { error } = await supabase.from('locations').delete().eq('id', id)
  if (error) throw error
  invalidateLocations()
  invalidateLocation(id)
}

export function sortLocations(locations: Location[]): Location[] {
  return [...locations].sort((a, b) =>
    a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }),
  )
}