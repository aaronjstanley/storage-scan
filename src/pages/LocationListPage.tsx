import { useEffect, useRef, useState } from 'react'
import { ConfirmDeleteDialog } from '../components/ConfirmDeleteDialog'
import { ContainerSearchResults } from '../components/ContainerSearchResults'
import { IconButton, IconPlus, IconSearch, IconTrash } from '../components/icons'
import { NavButton, ui } from '../components/ui'
import {
  searchContainers,
  type ContainerSearchResult,
} from '../hooks/useContainerSearch'
import {
  createLocation,
  deleteLocation,
  prefetchLocation,
  renameLocation,
  sortLocations,
  useLocations,
} from '../hooks/useLocations'
import type { Location } from '../types'

function LocationRow({
  location,
  onRename,
  onDelete,
}: {
  location: Location
  onRename: (id: string, name: string) => void
  onDelete: (location: Location) => void
}) {
  const [editing, setEditing] = useState(false)
  const [name, setName] = useState(location.name)

  const handleSave = async () => {
    const trimmed = name.trim()
    if (trimmed && trimmed !== location.name) {
      await onRename(location.id, trimmed)
    }
    setEditing(false)
  }

  return (
    <div className={ui.card}>
      <div className="flex items-center justify-between gap-2">
        {editing ? (
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onBlur={handleSave}
            onKeyDown={(e) => e.key === 'Enter' && handleSave()}
            autoFocus
            className={`${ui.input} min-w-0 flex-1`}
          />
        ) : (
          <NavButton
            to={`/location/${location.id}`}
            onPrefetch={() => prefetchLocation(location.id)}
            className="min-w-0 flex-1 truncate text-left text-lg font-bold text-violet-800 transition active:scale-[0.98]"
          >
            {location.name}
          </NavButton>
        )}
        <IconButton
          title="Delete location"
          variant="danger"
          onClick={() => onDelete(location)}
        >
          <IconTrash />
        </IconButton>
      </div>

      <div className="mt-2 flex items-center gap-2">
        <span className="rounded-full bg-violet-100 px-3 py-1 text-xs font-bold text-violet-700">
          {location.containerCount}{' '}
          {location.containerCount === 1 ? 'Container' : 'Containers'}
        </span>
        <button type="button" onClick={() => setEditing(true)} className={ui.btnGhost}>
          Rename
        </button>
      </div>
    </div>
  )
}

export function LocationListPage() {
  const { locations, loading, refresh } = useLocations()
  const [newName, setNewName] = useState('')
  const [showAddForm, setShowAddForm] = useState(false)
  const [showSearch, setShowSearch] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<ContainerSearchResult[]>([])
  const [searching, setSearching] = useState(false)
  const [searchError, setSearchError] = useState<string | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Location | null>(null)
  const [saving, setSaving] = useState(false)
  const addInputRef = useRef<HTMLInputElement>(null)
  const searchInputRef = useRef<HTMLInputElement>(null)
  const sorted = sortLocations(locations)

  useEffect(() => {
    if (showAddForm) addInputRef.current?.focus()
  }, [showAddForm])

  useEffect(() => {
    if (showSearch) searchInputRef.current?.focus()
  }, [showSearch])

  useEffect(() => {
    const trimmed = searchQuery.trim()
    if (!showSearch || trimmed.length < 2) {
      setSearchResults([])
      setSearching(false)
      setSearchError(null)
      return
    }

    setSearching(true)
    setSearchError(null)

    const timer = window.setTimeout(() => {
      searchContainers(trimmed)
        .then(setSearchResults)
        .catch(() => {
          setSearchResults([])
          setSearchError('Search failed. Please try again.')
        })
        .finally(() => setSearching(false))
    }, 300)

    return () => window.clearTimeout(timer)
  }, [searchQuery, showSearch])

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault()
    const trimmed = newName.trim()
    if (!trimmed || saving) return
    setSaving(true)
    setNewName('')
    try {
      await createLocation(trimmed)
      await refresh()
      setShowAddForm(false)
    } finally {
      setSaving(false)
    }
  }

  const toggleSearch = () => {
    setShowSearch((open) => {
      if (!open) setShowAddForm(false)
      return !open
    })
  }

  const toggleAddForm = () => {
    setShowAddForm((open) => {
      if (!open) {
        setShowSearch(false)
        setSearchQuery('')
      }
      return !open
    })
  }

  const isSearching = showSearch && searchQuery.trim().length >= 2

  return (
    <div className={ui.page}>
      <div className="mb-6 flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <img
            src={`${import.meta.env.BASE_URL}storage-scanner.png`}
            alt=""
            width={40}
            height={40}
            className="h-10 w-10 shrink-0 rounded-lg"
          />
          <h1 className={ui.title}>StorageScanner</h1>
        </div>
        <div className="flex shrink-0 items-center">
          <IconButton title="Search containers" onClick={toggleSearch}>
            <IconSearch />
          </IconButton>
          <IconButton title="Add location" onClick={toggleAddForm}>
            <IconPlus />
          </IconButton>
        </div>
      </div>

      {showSearch && (
        <div className="mb-6">
          <input
            ref={searchInputRef}
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search container contents…"
            className={ui.input}
          />
        </div>
      )}

      {showAddForm && (
        <form id="add-location-form" onSubmit={handleAdd} className="mb-6">
          <input
            ref={addInputRef}
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="New location (e.g. Garage West Shelf)"
            className={ui.input}
          />
        </form>
      )}

      {showSearch && (
        <ContainerSearchResults
          results={searchResults}
          query={searchQuery}
          searching={searching}
          error={searchError}
        />
      )}

      {!isSearching && (
        <>
          {loading && sorted.length === 0 ? (
            <p className={ui.muted}>Loading locations…</p>
          ) : sorted.length === 0 ? (
            <p className={ui.muted}>No locations yet. Tap + to add one.</p>
          ) : (
            <div className="space-y-3">
              {sorted.map((location) => (
                <LocationRow
                  key={location.id}
                  location={location}
                  onRename={async (id, name) => {
                    await renameLocation(id, name)
                    await refresh()
                  }}
                  onDelete={setDeleteTarget}
                />
              ))}
            </div>
          )}
        </>
      )}

      {deleteTarget && (
        <ConfirmDeleteDialog
          title="Delete location?"
          message={`This will permanently delete "${deleteTarget.name}" and all its rows and containers.`}
          onConfirm={async () => {
            await deleteLocation(deleteTarget.id)
            await refresh()
            setDeleteTarget(null)
          }}
          onCancel={() => setDeleteTarget(null)}
        />
      )}
    </div>
  )
}
