import type { ContainerPhoto } from '../types'
import type { DbContainer, DbLocation, DbRow } from './supabase'

export function toTimestamp(iso: string): number {
  return new Date(iso).getTime()
}

export function mapLocation(row: DbLocation) {
  return {
    id: row.id,
    name: row.name,
    sortOrder: row.sort_order,
    containerCount: row.container_count,
    createdAt: toTimestamp(row.created_at),
    updatedAt: toTimestamp(row.updated_at),
  }
}

export function mapRow(row: DbRow) {
  return {
    id: row.id,
    locationId: row.location_id,
    number: row.number,
    createdAt: toTimestamp(row.created_at),
    updatedAt: toTimestamp(row.updated_at),
  }
}

export function mapPhotos(value: unknown): ContainerPhoto[] {
  if (!Array.isArray(value)) return []
  return value as ContainerPhoto[]
}

export function containerHasContents(
  contents: string,
  photos: ContainerPhoto[],
): boolean {
  if (photos.length > 0) return true
  const text = contents
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .trim()
  return text.length > 0
}

export function mapContainerSummary(row: {
  id: string
  location_id: string
  row_id: string | null
  number: number
  created_at: string
  updated_at: string
  label?: string | null
  contents?: string
  photos?: unknown
}) {
  const photos = mapPhotos(row.photos)
  const contents = row.contents ?? ''
  return {
    id: row.id,
    locationId: row.location_id,
    rowId: row.row_id,
    number: row.number,
    label: (row.label ?? '').trim(),
    hasContents: containerHasContents(contents, photos),
    createdAt: toTimestamp(row.created_at),
    updatedAt: toTimestamp(row.updated_at),
  }
}

export function mapContainer(row: DbContainer) {
  const photos = mapPhotos(row.photos)
  const contents = row.contents ?? ''
  return {
    ...mapContainerSummary(row),
    contents,
    photos,
    hasContents: containerHasContents(contents, photos),
  }
}
