export function formatDateTime(value: string | null | undefined): string {
  if (!value) {
    return 'Never'
  }

  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value))
}

export function truncate(value: string | null | undefined, length = 96): string {
  if (!value) {
    return ''
  }

  return value.length > length ? `${value.slice(0, length - 1)}...` : value
}
