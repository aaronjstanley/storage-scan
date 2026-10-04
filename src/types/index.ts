export interface Location {
  id: string
  name: string
  sortOrder: number
  containerCount: number
  createdAt: number
  updatedAt: number
}

export interface Row {
  id: string
  locationId: string
  number: number
  createdAt: number
  updatedAt: number
}

export interface ContainerPhoto {
  id: string
  url: string
  storagePath: string
  caption?: string
}

export interface ContainerSummary {
  id: string
  locationId: string
  rowId: string | null
  number: number
  label: string
  hasContents: boolean
  createdAt: number
  updatedAt: number
}

export interface Container extends ContainerSummary {
  contents: string
  photos: ContainerPhoto[]
}

export interface ContainerDetails {
  contents: string
  photos: ContainerPhoto[]
}
