import { lazy, Suspense, useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ConfirmDeleteDialog } from '../components/ConfirmDeleteDialog'
import { PhotoUpload } from '../components/PhotoUpload'
import { IconButton, IconTrash } from '../components/icons'
import { ShareButton } from '../components/ShareButton'
import { NavButton, ui } from '../components/ui'
import {
  deleteContainer,
  getLocationContainers,
  removeContainerPhoto,
  updateContainerContents,
  updateContainerLabel,
  uploadContainerPhoto,
  useContainer,
} from '../hooks/useContainers'
import { useLocation } from '../hooks/useLocations'

const RichTextEditor = lazy(() =>
  import('../components/RichTextEditor').then((m) => ({
    default: m.RichTextEditor,
  })),
)

export function ContainerDetailPage() {
  const { containerId } = useParams<{ containerId: string }>()
  const navigate = useNavigate()
  const { container, loading, setContainer } = useContainer(containerId)
  const { location } = useLocation(container?.locationId)
  const [showDelete, setShowDelete] = useState(false)
  const [label, setLabel] = useState('')
  const labelRef = useRef('')
  const savedLabelRef = useRef('')
  const containerIdRef = useRef<string | undefined>(undefined)

  labelRef.current = label
  containerIdRef.current = container?.id

  useEffect(() => {
    setLabel(container?.label ?? '')
    savedLabelRef.current = container?.label ?? ''
  }, [container?.id])

  const persistLabel = useCallback(
    (nextLabel: string, keepalive = false) => {
      const id = containerIdRef.current
      if (!id) return
      const trimmed = nextLabel.trim()
      if (trimmed === savedLabelRef.current) return
      savedLabelRef.current = trimmed
      void updateContainerLabel(id, trimmed, { keepalive })
      setLabel(trimmed)
      setContainer((current) =>
        current ? { ...current, label: trimmed } : current,
      )
    },
    [setContainer],
  )

  useEffect(() => {
    if (!containerIdRef.current) return
    if (label.trim() === savedLabelRef.current) return
    const timer = window.setTimeout(() => persistLabel(labelRef.current), 400)
    return () => window.clearTimeout(timer)
  }, [label, persistLabel])

  useEffect(() => {
    const flush = () => persistLabel(labelRef.current, true)
    const onVisibility = () => {
      if (document.visibilityState === 'hidden') flush()
    }
    window.addEventListener('pagehide', flush)
    document.addEventListener('visibilitychange', onVisibility)
    return () => {
      flush()
      window.removeEventListener('pagehide', flush)
      document.removeEventListener('visibilitychange', onVisibility)
    }
  }, [persistLabel])

  const handleDelete = async () => {
    if (!container) return
    const siblings = await getLocationContainers(container.locationId)
    await deleteContainer(container, siblings)
    navigate(`/location/${container.locationId}`)
  }

  if (loading || !container) {
    return (
      <div className={ui.page}>
        <NavButton to="/" className={`${ui.btnBack} mb-4`}>
          ← Back
        </NavButton>
        <p className={ui.muted}>Loading container…</p>
      </div>
    )
  }

  return (
    <div className={ui.page}>
      <NavButton
        to={`/location/${container.locationId}`}
        className={`${ui.btnBack} mb-4`}
        onBeforeNavigate={() => persistLabel(labelRef.current, true)}
      >
        ← {location?.name ?? 'Location'}
      </NavButton>

      <div className={`${ui.cardAccent} mb-6`}>
        <div className="flex items-center justify-between gap-2">
          <h1 className="min-w-0 truncate text-2xl font-extrabold text-violet-800">
            Container {container.number}
          </h1>
          <div className="flex shrink-0 items-center">
            <ShareButton containerId={container.id} />
            <IconButton
              title="Delete container"
              variant="danger"
              onClick={() => setShowDelete(true)}
            >
              <IconTrash />
            </IconButton>
          </div>
        </div>
        <label className="mt-4 block">
          <span className={`${ui.sectionTitle} mb-2 block`}>Label</span>
          <input
            type="text"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            onBlur={(e) => persistLabel(e.target.value, true)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault()
                persistLabel(e.currentTarget.value, true)
                e.currentTarget.blur()
              }
            }}
            placeholder="e.g. Winter Coats"
            maxLength={80}
            enterKeyHint="done"
            autoComplete="off"
            className={ui.input}
          />
        </label>
      </div>

      <div className="space-y-5">
        <div className={ui.card}>
          <h2 className={`${ui.sectionTitle} mb-3`}>Contents</h2>
          <Suspense
            fallback={
              <div className="rounded-2xl bg-violet-50 p-4 text-sm text-violet-500">
                Loading editor…
              </div>
            }
          >
            <RichTextEditor
              content={container.contents}
              onChange={(html) => updateContainerContents(container.id, html)}
            />
          </Suspense>
        </div>

        <div className={ui.card}>
          <PhotoUpload
            photos={container.photos}
            onUpload={async (file) => {
              await uploadContainerPhoto(container.id, file, container.photos)
            }}
            onRemove={async (photo) => {
              await removeContainerPhoto(container.id, photo, container.photos)
            }}
          />
        </div>
      </div>

      {showDelete && (
        <ConfirmDeleteDialog
          title="Delete container?"
          message={`This will permanently delete Container ${container.number} and its photos.`}
          onConfirm={handleDelete}
          onCancel={() => setShowDelete(false)}
        />
      )}
    </div>
  )
}
