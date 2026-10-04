const scrollByLocation = new Map<string, number>()

export function getScrollY() {
  return window.scrollY || document.documentElement.scrollTop || 0
}

export function setScrollY(y: number) {
  window.scrollTo(0, y)
  document.documentElement.scrollTop = y
}

export function rememberLocationScroll(locationId: string, y = getScrollY()) {
  scrollByLocation.set(locationId, y)
}

export function recalledLocationScroll(locationId: string) {
  return scrollByLocation.get(locationId)
}
