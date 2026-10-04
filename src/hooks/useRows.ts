import { useCallback, useEffect, useState } from 'react'
import { cache, invalidateLocation } from '../lib/dataCache'
import { mapRow } from '../lib/mappers'
import { getNextNumber, renumberUpdates, sortByNumber } from '../lib/numbering'
import { supabase } from '../lib/supabase'
import type { Row } from '../types'

const inflightRows = new Map<string, Promise<Row[]>>()

async function fetchRows(locationId: string): Promise<Row[]> {
  const pending = inflightRows.get(locationId)
  if (pending) return pending

  const request = (async () => {
    const { data, error } = await supabase
      .from('rows')
      .select('*')
      .eq('location_id', locationId)
      .order('number')
    if (error) throw error
    return (data ?? []).map(mapRow)
  })()

  inflightRows.set(locationId, request)
  try {
    return await request
  } finally {
    inflightRows.delete(locationId)
  }
}

export function useRows(locationId: string | undefined) {
  const cached = locationId ? cache.rowsByLocation.get(locationId) : undefined
  const [rows, setRows] = useState<Row[]>(cached ?? [])
  const [loading, setLoading] = useState(Boolean(locationId && !cached))

  const refresh = useCallback(async () => {
    if (!locationId) {
      setRows([])
      setLoading(false)
      return []
    }
    const data = await fetchRows(locationId)
    cache.rowsByLocation.set(locationId, data)
    setRows(data)
    setLoading(false)
    return data
  }, [locationId])

  useEffect(() => {
    if (!locationId) {
      setRows([])
      setLoading(false)
      return
    }
    const hit = cache.rowsByLocation.get(locationId)
    if (hit) {
      setRows(hit)
      setLoading(false)
      return
    }
    refresh()
  }, [locationId, refresh])

  return { rows, loading, refresh, setRows }
}

export async function createRow(locationId: string, existingRows: Row[]) {
  const now = new Date().toISOString()
  const { error } = await supabase.from('rows').insert({
    location_id: locationId,
    number: getNextNumber(existingRows),
    updated_at: now,
  })
  if (error) throw error
  invalidateLocation(locationId)
}

export async function deleteRow(row: Row, allRows: Row[]) {
  const { error: deleteError } = await supabase
    .from('rows')
    .delete()
    .eq('id', row.id)
  if (deleteError) throw deleteError

  const remaining = sortByNumber(allRows.filter((r) => r.id !== row.id))
  await Promise.all(
    renumberUpdates(remaining).map(({ id, number }) =>
      supabase
        .from('rows')
        .update({ number, updated_at: new Date().toISOString() })
        .eq('id', id),
    ),
  )
  invalidateLocation(row.locationId)
}

export async function reorderRows(
  allRows: Row[],
  activeId: string,
  overId: string,
) {
  const sorted = sortByNumber(allRows)
  const oldIndex = sorted.findIndex((r) => r.id === activeId)
  const newIndex = sorted.findIndex((r) => r.id === overId)
  if (oldIndex === -1 || newIndex === -1 || oldIndex === newIndex) return

  const reordered = [...sorted]
  const [moved] = reordered.splice(oldIndex, 1)
  reordered.splice(newIndex, 0, moved)

  await Promise.all(
    reordered.map((row, index) =>
      supabase
        .from('rows')
        .update({
          number: index + 1,
          updated_at: new Date().toISOString(),
        })
        .eq('id', row.id),
    ),
  )
  if (allRows[0]) invalidateLocation(allRows[0].locationId)
}

export async function getLocationRows(locationId: string): Promise<Row[]> {
  return fetchRows(locationId)
}

export { sortByNumber }
