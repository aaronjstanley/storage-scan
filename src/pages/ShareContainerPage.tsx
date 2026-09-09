import { lazy, Suspense, useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { PhotoUpload } from '../components/PhotoUpload'
import { NavButton, ui } from '../components/ui'
import { getContainerLocationName, useContainer } from '../hooks/useContainers'
import { useLocation } from '../hooks/useLocations'

const RichTextDisplay = lazy(() =>
  import('../components/RichTextEditor').then((m) => ({
    default: m.RichTextDisplay,
  })),
)

export function ShareContainerPage() {
  const { containerId } = useParams<{ containerId: string }>()
  const { container, loading, error } = useContainer(containerId)
  const { location } = useLocation(container?.locationId)
  const [locationName, setLocationName] = useState<string | null>(null)

  useEffect(() => {
    if (location?.name) {
      setLocationName(location.name)
    } else if (container) {
      getContainerLocationName(container.locationId).then(setLocationName)
    }
  }, [container, location])

  if (loading) {
    return (
      <div className={ui.page}>
        <p className={ui.muted}>Loading container…</p>
      </div>
    )
  }

  if (error || !container) {
    return (
      <div className={ui.page}>
        <p className={ui.muted}>
          {error ? `Could not load container: ${error}` : 'Container not found.'}
        </p>
        <div className="mt-8 text-center">
          <NavButton to="/" className={ui.btnSecondary}>
            Open StorageScanner
          </NavButton>
        </div>
      </div>
    )
  }

  return (
    <div className={ui.page}>
      <p className={`${ui.subtitle} mb-2`}>
        {locationName ?? 'StorageScanner'}
      </p>
      <h1 className="mb-6 text-2xl font-extrabold text-violet-800">
        Container {container.number}
      </h1>

      <div className="space-y-5">
        <div className={ui.card}>
          <h2 className={`${ui.sectionTitle} mb-3`}>Contents</h2>
          <Suspense fallback={<p className={ui.muted}>Loading…</p>}>
            <RichTextDisplay content={container.contents} />
          </Suspense>
        </div>

        {container.photos.length > 0 && (
          <div className={ui.card}>
            <PhotoUpload
              photos={container.photos}
              onUpload={async () => {}}
              onRemove={async () => {}}
              readOnly
            />
          </div>
        )}
      </div>

      <div className="mt-8 text-center">
        <NavButton to="/" className={ui.btnSecondary}>
          Open StorageScanner
        </NavButton>
      </div>
    </div>
  )
}
