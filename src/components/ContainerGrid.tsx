import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { useNavigate } from 'react-router-dom'
import { ContainerTile } from './ContainerTile'
import { rememberLocationScroll, getScrollY } from '../lib/scrollMemory'
import type { ContainerSummary } from '../types'

interface SortableContainerTileProps {
  container: ContainerSummary
  onNavigate: () => void
}

function SortableContainerTile({
  container,
  onNavigate,
}: SortableContainerTileProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: container.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  return (
    <ContainerTile
      container={container}
      onNavigate={onNavigate}
      drag={{ setNodeRef, style, attributes, listeners }}
    />
  )
}

interface ContainerGridProps {
  containers: ContainerSummary[]
  onReorder?: (activeId: string, overId: string) => void
  sortable?: boolean
}

export function ContainerGrid({
  containers,
  onReorder,
  sortable = false,
}: ContainerGridProps) {
  const navigate = useNavigate()

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  )

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    if (over && active.id !== over.id && onReorder) {
      onReorder(String(active.id), String(over.id))
    }
  }

  if (containers.length === 0) {
    return (
      <p className="text-sm italic text-violet-500/70">No containers yet.</p>
    )
  }

  const goTo = (id: string) => () => {
    const locationId = containers[0]?.locationId
    if (locationId) rememberLocationScroll(locationId, getScrollY())
    navigate(`/container/${id}`, { preventScrollReset: true })
  }

  const list = (
    <div className="flex flex-col gap-2">
      {containers.map((c) =>
        sortable ? (
          <SortableContainerTile
            key={c.id}
            container={c}
            onNavigate={goTo(c.id)}
          />
        ) : (
          <ContainerTile
            key={c.id}
            container={c}
            onNavigate={goTo(c.id)}
          />
        ),
      )}
    </div>
  )

  if (!sortable || !onReorder) return list

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={handleDragEnd}
    >
      <SortableContext
        items={containers.map((c) => c.id)}
        strategy={verticalListSortingStrategy}
      >
        {list}
      </SortableContext>
    </DndContext>
  )
}
