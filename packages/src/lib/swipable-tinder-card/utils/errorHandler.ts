export function handleError(error: unknown, context?: string) {
  const message = error instanceof Error ? error.message : 'Unknown error'
  console.error(`[SwipableCard${context ? ` - ${context}` : ''}]:`, message)
}