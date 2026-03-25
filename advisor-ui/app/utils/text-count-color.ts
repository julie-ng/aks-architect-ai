export function textCountColor (answered: number, total: number): string {
  if (answered === 0) return 'text-error'
  if (answered !== total) return 'text-warning'
  return 'text-success'
}
