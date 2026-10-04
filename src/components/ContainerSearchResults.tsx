import { lazy, Suspense } from 'react'
import { PhotoUpload } from './PhotoUpload'
import { NavButton, ui } from './ui'
import { prefetchContainer } from '../hooks/useContainers'
import type { ContainerSearchResult } from '../hooks/useContainerSearch'

const RichTextDisplay = lazy(() =>
  import('./RichTextEditor').then((m) => ({
    default: m.RichTextDisplay,
  })),
)

function SearchResultCard({ result }: { result: ContainerSearchResult }) {
  return (
    <div className={ui.card}>
      <NavButton
        to={`/container/${result.id}`}
        onPrefetch={() => prefetchContainer(result.id)}
        className="mb-3 block text-left"
      >
        <p className={ui.subtitle}>{result.locationName}</p>
        <p className="text-lg font-bold text-violet-800">
          Container {result.number}
        </p>
        {result.label ? (
          <p className="text-sm font-semibold text-fuchsia-700">{result.label}</p>
        ) : null}
      </NavButton>

      <Suspense fallback={<p className={ui.muted}>Loading contents…</p>}>
        <RichTextDisplay content={result.contents} />
      </Suspense>

      {result.photos.length > 0 && (
        <div className="mt-4 border-t border-violet-100 pt-4">
          <PhotoUpload
            photos={result.photos}
            onUpload={async () => {}}
            onRemove={async () => {}}
            readOnly
          />
        </div>
      )}
    </div>
  )
}

export function ContainerSearchResults({
  results,
  query,
  searching,
  error,
}: {
  results: ContainerSearchResult[]
  query: string
  searching: boolean
  error: string | null
}) {
  if (query.trim().length < 2) {
    return (
      <p className={`${ui.muted} mb-6`}>
        Enter at least 2 characters to search container contents.
      </p>
    )
  }

  if (searching) {
    return <p className={`${ui.muted} mb-6`}>Searching…</p>
  }

  if (error) {
    return <p className="mb-6 text-center text-sm text-rose-600">{error}</p>
  }

  if (results.length === 0) {
    return (
      <p className={`${ui.muted} mb-6`}>
        No containers match &ldquo;{query.trim()}&rdquo;.
      </p>
    )
  }

  return (
    <div className="mb-6 space-y-3">
      <p className="text-sm font-semibold text-violet-600">
        {results.length} result{results.length !== 1 ? 's' : ''}
      </p>
      {results.map((result) => (
        <SearchResultCard key={result.id} result={result} />
      ))}
    </div>
  )
}
