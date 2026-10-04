import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ConfirmDeleteDialog } from '../components/ConfirmDeleteDialog'
import {
  IconAddRow,
  IconButton,
  IconPlus,
  IconTrash,
} from '../components/icons'
import { RowList, UnassignedSection } from '../components/RowSection'
import { NavButton, ui } from '../components/ui'
import {
  createContainer,
  deleteContainer,
  reorderContainers,
  useContainers,
} from '../hooks/useContainers'
import { useRestoreLocationScroll } from '../hooks/useRestoreLocationScroll'
import { useLocation, renameLocation, deleteLocation } from '../hooks/useLocations'
import { createRow, deleteRow, reorderRows, useRows } from '../hooks/useRows'
import type { Row } from '../types'

export function LocationGridPage() {
  const { locationId } = useParams<{ locationId: string }>()
  const navigate = useNavigate()
  const { location, refresh: refreshLocation } = useLocation(locationId)
  const { rows, loading: rowsLoading, refresh: refreshRows } = useRows(locationId)
  const { containers, loading: containersLoading, refresh: refreshContainers } =
    useContainers(locationId)

  const [editingName, setEditingName] = useState(false)
  const [name, setName] = useState('')
  const [deleteRowTarget, setDeleteRowTarget] = useState<Row | null>(null)
  const [showDeleteLocation, setShowDeleteLocation] = useState(false)
  const [busy, setBusy] = useState(false)

  const unassigned = containers.filter((c) => c.rowId === null)
  const listReady = !(
    (containersLoading || rowsLoading) &&
    containers.length === 0 &&
    rows.length === 0
  )

  useRestoreLocationScroll(locationId, Boolean(location) && listReady)

  const refreshAll = async () => {
    await Promise.all([refreshLocation(), refreshRows(), refreshContainers()])
  }

  const startEditing = () => {
    if (location) {
      setName(location.name)
      setEditingName(true)
    }
  }

  const saveName = async () => {
    if (locationId && name.trim()) {
      await renameLocation(locationId, name.trim())
      await refreshLocation()
    }
    setEditingName(false)
  }

  const handleAddRow = async () => {
    if (!locationId || busy) return
    setBusy(true)
    try {
      await createRow(locationId, rows)
      await refreshRows()
    } finally {
      setBusy(false)
    }
  }

  const handleAddContainer = async (rowId: string | null = null) => {
    if (!locationId || busy) return
    setBusy(true)
    try {
      await createContainer(locationId, rowId, containers)
      await Promise.all([refreshContainers(), refreshLocation()])
    } finally {
      setBusy(false)
    }
  }

  const handleDeleteRow = async (row: Row) => {
    if (busy) return
    setBusy(true)
    try {
      const rowContainers = containers.filter((c) => c.rowId === row.id)
      let remaining = [...containers]
      for (const c of rowContainers) {
        await deleteContainer(c, remaining)
        remaining = remaining.filter((x) => x.id !== c.id)
      }
      await deleteRow(row, rows)
      await refreshAll()
      setDeleteRowTarget(null)
    } finally {
      setBusy(false)
    }
  }

  const handleDeleteLocation = async () => {
    if (!locationId) return
    await deleteLocation(locationId)
    navigate('/')
  }

  if (!location) {
    return (
      <div className={ui.page}>
        <NavButton to="/" className={`${ui.btnBack} mb-4`}>
          ← All locations
        </NavButton>
        <p className={ui.muted}>
          {locationId ? 'Loading location…' : 'Location not found.'}
        </p>
      </div>
    )
  }

  return (
    <div className={ui.page}>
      <NavButton to="/" className={`${ui.btnBack} mb-4`}>
        ← All locations
      </NavButton>

      <div className={`${ui.cardAccent} mb-6`}>
        <div className="flex items-center justify-between gap-2">
          {editingName ? (
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onBlur={saveName}
              onKeyDown={(e) => e.key === 'Enter' && saveName()}
              autoFocus
              className={`${ui.input} min-w-0 flex-1`}
            />
          ) : (
            <button
              type="button"
              onClick={startEditing}
              className="min-w-0 flex-1 truncate text-left text-2xl font-extrabold text-violet-800"
              title="Tap to rename"
            >
              {location.name}
            </button>
          )}
          <div className="flex shrink-0 items-center">
            <IconButton
              title="Add row"
              onClick={handleAddRow}
              disabled={busy}
            >
              <IconAddRow />
            </IconButton>
            <IconButton
              title="Add container"
              variant="teal"
              onClick={() => handleAddContainer(null)}
              disabled={busy}
            >
              <IconPlus />
            </IconButton>
            <IconButton
              title="Delete location"
              variant="danger"
              onClick={() => setShowDeleteLocation(true)}
            >
              <IconTrash />
            </IconButton>
          </div>
        </div>
      </div>

      {(containersLoading || rowsLoading) &&
      containers.length === 0 &&
      rows.length === 0 ? (
        <p className={ui.muted}>Loading containers…</p>
      ) : (
      <div className="space-y-4">
        <RowList
          rows={rows}
          containers={containers}
          onDeleteRow={setDeleteRowTarget}
          onReorderRows={async (activeId, overId) => {
            await reorderRows(rows, activeId, overId)
            await refreshRows()
          }}
          onReorderContainers={async (activeId, overId) => {
            await reorderContainers(containers, activeId, overId)
            await refreshContainers()
          }}
          onAddContainer={(rowId) => handleAddContainer(rowId)}
        />

        {(rows.length === 0 || unassigned.length > 0) && (
          <UnassignedSection
            containers={rows.length === 0 ? containers : unassigned}
            onReorderContainers={async (activeId, overId) => {
              await reorderContainers(containers, activeId, overId)
              await refreshContainers()
            }}
            onAddContainer={() => handleAddContainer(null)}
          />
        )}
      </div>
      )}

      {deleteRowTarget && (
        <ConfirmDeleteDialog
          title="Delete row?"
          message={`This will delete Row ${deleteRowTarget.number} and all containers in it.`}
          onConfirm={() => handleDeleteRow(deleteRowTarget)}
          onCancel={() => setDeleteRowTarget(null)}
        />
      )}

      {showDeleteLocation && (
        <ConfirmDeleteDialog
          title="Delete location?"
          message={`This will permanently delete "${location.name}" and all its rows and containers.`}
          onConfirm={handleDeleteLocation}
          onCancel={() => setShowDeleteLocation(false)}
        />
      )}
    </div>
  )
}
