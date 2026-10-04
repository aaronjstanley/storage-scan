import { mapContainer, mapPhotos } from '../lib/mappers'
import { cache } from '../lib/dataCache'
import { supabase } from '../lib/supabase'
import type { ContainerPhoto } from '../types'

export interface ContainerSearchResult {
  id: string
  locationId: string
  locationName: string
  number: number
  label: string
  contents: string
  photos: ContainerPhoto[]
}

function escapeIlike(value: string) {
  return value.replace(/[%_\\]/g, '\\$&')
}

function getLocationName(locations: unknown): string {
  if (Array.isArray(locations)) {
    return (locations[0] as { name?: string } | undefined)?.name ?? 'Unknown location'
  }
  if (locations && typeof locations === 'object' && 'name' in locations) {
    return String((locations as { name: string }).name)
  }
  return 'Unknown location'
}

export async function searchContainers(
  query: string,
): Promise<ContainerSearchResult[]> {
  const trimmed = query.trim()
  if (trimmed.length < 2) return []

  const pattern = `%${escapeIlike(trimmed.replace(/"/g, ''))}%`
  const { data, error } = await supabase
    .from('containers')
    .select(
      'id, location_id, row_id, number, label, contents, photos, created_at, updated_at, locations(name)',
    )
    .or(`contents.ilike."${pattern}",label.ilike."${pattern}"`)
    .order('number')

  if (error) throw error

  const results = (data ?? []).map((row) => {
    const locationName = getLocationName(row.locations)
    const contents = row.contents ?? ''
    const photos = mapPhotos(row.photos)
    const label = (row.label ?? '').trim()

    cache.containerById.set(
      row.id,
      mapContainer({
        id: row.id,
        location_id: row.location_id,
        row_id: row.row_id,
        number: row.number,
        label,
        contents,
        photos,
        created_at: row.created_at,
        updated_at: row.updated_at,
      }),
    )

    return {
      id: row.id,
      locationId: row.location_id,
      locationName,
      number: row.number,
      label,
      contents,
      photos,
    }
  })

  return results.sort((a, b) => {
    const byLocation = a.locationName.localeCompare(b.locationName, undefined, {
      sensitivity: 'base',
    })
    if (byLocation !== 0) return byLocation
    return a.number - b.number
  })
}
