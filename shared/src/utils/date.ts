/**
 * Milliseconds per standard calendar day.
 */
export const MS_PER_DAY = 86_400_000

/**
 * Milliseconds per standard week.
 */
export const MS_PER_WEEK = 7 * MS_PER_DAY

/**
 * Calculate the number of full calendar days remaining until an event date.
 *
 * @param eventDateString - ISO date string (YYYY-MM-DD)
 * @param relativeToMs - Reference timestamp in milliseconds (defaults to Date.now())
 * @returns Number of days until event (can be negative for past events)
 */
export function daysUntil(eventDateString: string, relativeToMs: number = Date.now()): number {
  const target = new Date(eventDateString).getTime()
  if (Number.isNaN(target)) return 0
  const diff = target - relativeToMs
  return Math.ceil(diff / MS_PER_DAY)
}

/**
 * Calculate the target calendar date for a milestone given event date and weeks before.
 *
 * @param eventDateString - ISO date string (YYYY-MM-DD)
 * @param weeksBefore - Number of weeks prior to the event date
 * @returns ISO date string (YYYY-MM-DD)
 */
export function getMilestoneTargetDate(eventDateString: string, weeksBefore: number): string {
  const eventTime = new Date(eventDateString).getTime()
  if (Number.isNaN(eventTime)) return eventDateString
  const targetMs = eventTime - weeksBefore * MS_PER_WEEK
  return new Date(targetMs).toISOString().split('T')[0] ?? eventDateString
}

/**
 * Format an ISO date string into human-friendly format (e.g., '14 Nov 2026').
 *
 * @param dateString - ISO date string
 * @param locale - BCP-47 language tag (default: 'en-US')
 * @returns Formatted date string
 */
export function formatDate(dateString: string, locale: string = 'en-US'): string {
  const parsed = new Date(dateString)
  if (Number.isNaN(parsed.getTime())) return dateString
  return new Intl.DateTimeFormat(locale, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(parsed)
}
