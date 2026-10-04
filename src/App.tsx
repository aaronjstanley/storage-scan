import { lazy, Suspense } from 'react'
import { HashRouter, Routes, Route } from 'react-router-dom'
import { LocationListPage } from './pages/LocationListPage'
import { ui } from './components/ui'

const LocationGridPage = lazy(() =>
  import('./pages/LocationGridPage').then((m) => ({ default: m.LocationGridPage })),
)
const ContainerDetailPage = lazy(() =>
  import('./pages/ContainerDetailPage').then((m) => ({
    default: m.ContainerDetailPage,
  })),
)
const ShareContainerPage = lazy(() =>
  import('./pages/ShareContainerPage').then((m) => ({
    default: m.ShareContainerPage,
  })),
)
const ContainerUrlListPage = lazy(() =>
  import('./pages/ContainerUrlListPage').then((m) => ({
    default: m.ContainerUrlListPage,
  })),
)

function PageFallback() {
  return (
    <div className={ui.page}>
      <p className={ui.muted}>Loading…</p>
    </div>
  )
}

export default function App() {
  return (
    <HashRouter>
      <Suspense fallback={<PageFallback />}>
        <Routes>
          <Route path="/" element={<LocationListPage />} />
          <Route path="/location/:locationId" element={<LocationGridPage />} />
          <Route path="/container/:containerId" element={<ContainerDetailPage />} />
          <Route path="/share/:containerId" element={<ShareContainerPage />} />
          <Route path="/urls" element={<ContainerUrlListPage />} />
        </Routes>
      </Suspense>
    </HashRouter>
  )
}
