import { useCallback, useEffect, useState } from 'react'
import {
  cache,
  invalidateContainer,
  invalidateLocation,
  patchCachedContainer,
} from '../lib/dataCache'
import {
  mapContainer,
  mapContainerSummary,
  containerHasContents,
} from '../lib/mappers'
import {
  getNextNumber,
  renumberUpdates,
  sortByNumber,
} from '../lib/numbering'
import { supabase, keepalivePatch } from '../lib/supabase'
import type {
  Container,
  ContainerPhoto,
  ContainerSummary,
} from '../types'

const SUMMARY_COLUMNS =
  'id, location_id, row_id, number, label, contents, photos, created_at, updated_at'

const inflightContainers = new Map<string, Promise<ContainerSummary[]>>()
const inflightContainer = new Map<string, Promise<Container | null>>()

async function fetchContainers(locationId: string): Promise<ContainerSummary[]> {
  const pending = inflightContainers.get(locationId)
  if (pending) return pending

  const request = (async () => {
    const { data, error } = await supabase
      .from('containers')
      .select(SUMMARY_COLUMNS)
      .eq('location_id', locationId)
      .order('number')
    if (error) throw error
    return (data ?? []).map((row) => {
      const full = mapContainer(row)
      cache.containerById.set(full.id, full)
      return mapContainerSummary(row)
    })
  })()

  inflightContainers.set(locationId, request)
  try {
    return await request
  } finally {
    inflightContainers.delete(locationId)
  }
}

async function fetchContainer(containerId: string): Promise<Container | null> {
  const pending = inflightContainer.get(containerId)
  if (pending) return pending

  const request = (async () => {
    const { data, error } = await supabase
      .from('containers')
      .select('*')
      .eq('id', containerId)
      .maybeSingle()
    if (error) throw error
    return data ? mapContainer(data) : null
  })()

  inflightContainer.set(containerId, request)
  try {
    return await request
  } finally {
    inflightContainer.delete(containerId)
  }
}

export function useContainers(locationId: string | undefined) {
  const cached = locationId ? cache.containersByLocation.get(locationId) : undefined
  const [containers, setContainers] = useState<ContainerSummary[]>(cached ?? [])
  const [loading, setLoading] = useState(Boolean(locationId && !cached))

  const refresh = useCallback(async () => {
    if (!locationId) {
      setContainers([])
      setLoading(false)
      return []
    }
    const data = await fetchContainers(locationId)
    cache.containersByLocation.set(locationId, data)
    setContainers(data)
    setLoading(false)
    return data
  }, [locationId])

  useEffect(() => {
    if (!locationId) {
      setContainers([])
      setLoading(false)
      return
    }
    const hit = cache.containersByLocation.get(locationId)
    if (hit) {
      setContainers(hit)
      setLoading(false)
      return
    }
    refresh()
  }, [locationId, refresh])

  return { containers, loading, refresh, setContainers }
}

export function useContainer(containerId: string | undefined) {
  const cached = containerId ? cache.containerById.get(containerId) : undefined
  const [container, setContainer] = useState<Container | null>(cached ?? null)
  const [loading, setLoading] = useState(Boolean(containerId && !cached))

  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    if (!containerId) {
      setContainer(null)
      setError(null)
      setLoading(false)
      return null
    }
    try {
      const data = await fetchContainer(containerId)
      if (data) cache.containerById.set(containerId, data)
      else cache.containerById.delete(containerId)
      setContainer(data)
      setError(null)
      return data
    } catch (err) {
      setContainer(null)
      setError(err instanceof Error ? err.message : 'Failed to load container')
      return null
    } finally {
      setLoading(false)
    }
  }, [containerId])

  useEffect(() => {
    if (!containerId) {
      setContainer(null)
      setError(null)
      setLoading(false)
      return
    }
    const hit = cache.containerById.get(containerId)
    if (hit) {
      setContainer(hit)
      setError(null)
      setLoading(false)
      return
    }
    setContainer(null)
    setError(null)
    setLoading(true)
    void refresh()
  }, [containerId, refresh])

  return { container, loading, error, refresh, setContainer }
}

export async function createContainer(
  locationId: string,
  rowId: string | null,
  existingContainers: ContainerSummary[],
) {
  const now = new Date().toISOString()
  const { error } = await supabase.from('containers').insert({
    location_id: locationId,
    row_id: rowId,
    number: getNextNumber(existingContainers),
    contents: '',
    photos: [],
    updated_at: now,
  })
  if (error) throw error
  invalidateLocation(locationId)
  invalidateLocationsList()
}

function invalidateLocationsList() {
  cache.locations = null
}

export async function deleteContainer(
  container: ContainerSummary,
  allContainers: ContainerSummary[],
) {
  const full = cache.containerById.get(container.id) ?? (await fetchContainer(container.id))
  if (full) {
    for (const photo of full.photos) {
      await supabase.storage.from('photos').remove([photo.storagePath])
    }
  }

  const { error } = await supabase
    .from('containers')
    .delete()
    .eq('id', container.id)
  if (error) throw error

  const remaining = sortByNumber(allContainers.filter((c) => c.id !== container.id))
  await Promise.all(
    renumberUpdates(remaining).map(({ id, number }) =>
      supabase
        .from('containers')
        .update({ number, updated_at: new Date().toISOString() })
        .eq('id', id),
    ),
  )

  invalidateLocation(container.locationId)
  invalidateContainer(container.id)
  invalidateLocationsList()
}

export async function reorderContainers(
  allContainers: ContainerSummary[],
  activeId: string,
  overId: string,
) {
  const sorted = sortByNumber(allContainers)
  const oldIndex = sorted.findIndex((c) => c.id === activeId)
  const newIndex = sorted.findIndex((c) => c.id === overId)
  if (oldIndex === -1 || newIndex === -1 || oldIndex === newIndex) return

  const reordered = [...sorted]
  const [moved] = reordered.splice(oldIndex, 1)
  reordered.splice(newIndex, 0, moved)

  await Promise.all(
    reordered.map((item, index) =>
      supabase
        .from('containers')
        .update({
          number: index + 1,
          updated_at: new Date().toISOString(),
        })
        .eq('id', item.id),
    ),
  )
  if (allContainers[0]) invalidateLocation(allContainers[0].locationId)
}

export async function updateContainerLabel(
  containerId: string,
  label: string,
  options?: { keepalive?: boolean },
) {
  const trimmed = label.trim()
  const payload = { label: trimmed, updated_at: new Date().toISOString() }

  if (options?.keepalive) {
    void keepalivePatch('containers', containerId, payload)
  } else {
    const { error } = await supabase
      .from('containers')
      .update(payload)
      .eq('id', containerId)
    if (error) throw error
  }

  patchCachedContainer(containerId, {
    label: trimmed,
    updatedAt: Date.now(),
  })
}

export async function updateContainerContents(
  containerId: string,
  contents: string,
) {
  const { error } = await supabase
    .from('containers')
    .update({ contents, updated_at: new Date().toISOString() })
    .eq('id', containerId)
  if (error) throw error

  const cached = cache.containerById.get(containerId)
  patchCachedContainer(containerId, {
    contents,
    hasContents: containerHasContents(contents, cached?.photos ?? []),
    updatedAt: Date.now(),
  })
}

export async function uploadContainerPhoto(
  containerId: string,
  file: File,
  existingPhotos: ContainerPhoto[],
): Promise<ContainerPhoto[]> {
  const photoId = crypto.randomUUID()
  const ext = file.name.split('.').pop() ?? 'jpg'
  const path = `${containerId}/${photoId}.${ext}`

  const { error: uploadError } = await supabase.storage
    .from('photos')
    .upload(path, file)
  if (uploadError) throw uploadError

  const { data: urlData } = supabase.storage.from('photos').getPublicUrl(path)
  const newPhoto: ContainerPhoto = {
    id: photoId,
    url: urlData.publicUrl,
    storagePath: path,
  }
  const photos = [...existingPhotos, newPhoto]

  const { error } = await supabase
    .from('containers')
    .update({ photos, updated_at: new Date().toISOString() })
    .eq('id', containerId)
  if (error) throw error

  const cached = cache.containerById.get(containerId)
  patchCachedContainer(containerId, {
    photos,
    hasContents: containerHasContents(cached?.contents ?? '', photos),
    updatedAt: Date.now(),
  })

  return photos
}

export async function removeContainerPhoto(
  containerId: string,
  photo: ContainerPhoto,
  existingPhotos: ContainerPhoto[],
): Promise<ContainerPhoto[]> {
  await supabase.storage.from('photos').remove([photo.storagePath])

  const photos = existingPhotos.filter((p) => p.id !== photo.id)
  const { error } = await supabase
    .from('containers')
    .update({ photos, updated_at: new Date().toISOString() })
    .eq('id', containerId)
  if (error) throw error

  const cached = cache.containerById.get(containerId)
  patchCachedContainer(containerId, {
    photos,
    hasContents: containerHasContents(cached?.contents ?? '', photos),
    updatedAt: Date.now(),
  })

  return photos
}

export async function getLocationContainers(
  locationId: string,
): Promise<ContainerSummary[]> {
  return fetchContainers(locationId)
}

export async function getContainerLocationName(
  locationId: string,
): Promise<string | null> {
  const cached = cache.locationById.get(locationId)
  if (cached) return cached.name

  const { data, error } = await supabase
    .from('locations')
    .select('name')
    .eq('id', locationId)
    .maybeSingle()
  if (error) throw error
  return data?.name ?? null
}

export async function prefetchContainer(containerId: string) {
  if (cache.containerById.has(containerId)) return
  const data = await fetchContainer(containerId)
  if (data) cache.containerById.set(containerId, data)
}

export { sortByNumber }
