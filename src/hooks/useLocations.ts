import { useCallback, useEffect, useState } from 'react'
import { cache, invalidateLocation, invalidateLocations } from '../lib/dataCache'
import { mapLocation, mapRow, mapContainerSummary } from '../lib/mappers'
import { supabase } from '../lib/supabase'
import type { Location } from '../types'

async function fetchLocations(): Promise<Location[]> {
  const { data, error } = await supabase
    .from('locations')
    .select('*')
    .order('name')
  if (error) throw error
  return (data ?? []).map(mapLocation)
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
    const { data, error } = await supabase
      .from('locations')
      .select('*')
      .eq('id', locationId)
      .maybeSingle()
    if (error) throw error
    const mapped = data ? mapLocation(data) : null
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
  if (
    cache.locationById.has(locationId) &&
    cache.rowsByLocation.has(locationId) &&
    cache.containersByLocation.has(locationId)
  ) {
    return
  }

  const [locationRes, rowsRes, containersRes] = await Promise.all([
    supabase.from('locations').select('*').eq('id', locationId).maybeSingle(),
    supabase
      .from('rows')
      .select('*')
      .eq('location_id', locationId)
      .order('number'),
    supabase
      .from('containers')
      .select('id, location_id, row_id, number, label, contents, photos, created_at, updated_at')
      .eq('location_id', locationId)
      .order('number'),
  ])

  if (locationRes.data) {
    cache.locationById.set(locationId, mapLocation(locationRes.data))
  }
  cache.rowsByLocation.set(
    locationId,
    (rowsRes.data ?? []).map(mapRow),
  )
  cache.containersByLocation.set(
    locationId,
    (containersRes.data ?? []).map(mapContainerSummary),
  )
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