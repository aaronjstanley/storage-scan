import { lazy, Suspense, useEffect, useState } from 'react'
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

  useEffect(() => {
    setLabel(container?.label ?? '')
  }, [container?.id, container?.label])

  const handleDelete = async () => {
    if (!container) return
    const siblings = await getLocationContainers(container.locationId)
    await deleteContainer(container, siblings)
    navigate(`/location/${container.locationId}`)
  }

  const saveLabel = async (nextLabel = label) => {
    if (!container) return
    const trimmed = nextLabel.trim()
    if (trimmed === container.label) return
    await updateContainerLabel(container.id, trimmed)
    setLabel(trimmed)
    setContainer({ ...container, label: trimmed })
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
            onBlur={(e) => void saveLabel(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && (e.currentTarget.blur())}
            placeholder="e.g. Winter Coats"
            maxLength={80}
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
