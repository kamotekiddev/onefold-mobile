import type { Exercise, ExerciseSearchPage } from "@/types/domain"

export function flattenExercisePages(pages: ExerciseSearchPage[]) {
  const seen = new Set<string>()
  return pages
    .flatMap((page) => page.items)
    .filter((exercise) => {
      if (seen.has(exercise.id)) return false
      seen.add(exercise.id)
      return true
    })
}

export function exerciseSearchState(input: {
  remote: boolean
  name: string
  debouncedName: string
  online: boolean
  fetching: boolean
  error: unknown
  pages?: ExerciseSearchPage[]
  local: Exercise[]
}) {
  const name = input.name.trim()
  const invalid = name.length > 255
  const searching = input.remote && !!name && !invalid
  const settling = searching && name !== input.debouncedName
  const pages = settling ? undefined : input.pages
  const remoteItems = pages ? flattenExercisePages(pages) : undefined
  const items = invalid
    ? []
    : searching && input.online
      ? (remoteItems ?? [])
      : input.local
  const loading =
    searching && input.online && (settling || (!pages && input.fetching))
  const error = !settling && searching && input.online ? input.error : null
  const offline = searching && !input.online
  return {
    items,
    loading,
    error,
    offline,
    invalid,
    totalCount:
      searching && input.online && pages ? pages[0]?.totalCount : undefined,
    canCreate:
      !invalid &&
      !items.length &&
      (!searching ||
        (!!pages &&
          !loading &&
          !input.fetching &&
          !error &&
          !offline &&
          pages[0]?.totalCount === 0)),
  }
}
