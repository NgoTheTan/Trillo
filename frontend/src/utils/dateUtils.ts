/**
 * Date & Time utility functions for formatting and validation.
 */

/**
 * Formats a raw ISO date string or date-time into a readable display format for UI cards.
 *
 * Examples:
 * - "2026-08-10T14:30:00" -> "Aug 10, 14:30"
 * - "2026-08-10T00:00:00" -> "Aug 10, 2026"
 * - "10/08/2026"          -> "Aug 10, 2026"
 */
export const formatDeadlineDisplay = (dateStr?: string | null): string => {
  if (!dateStr || !dateStr.trim()) return 'No deadline'

  try {
    let cleanStr = dateStr.trim()
    // Handle DD/MM/YYYY format
    if (cleanStr.includes('/') && !cleanStr.includes('T')) {
      const parts = cleanStr.split('/')
      if (parts.length === 3) {
        cleanStr = `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`
      }
    }

    const d = new Date(cleanStr)
    if (isNaN(d.getTime())) return dateStr

    const now = new Date()
    const isSameYear = d.getFullYear() === now.getFullYear()
    const hasTime = cleanStr.includes('T') && !cleanStr.endsWith('T00:00:00') && !cleanStr.endsWith('T00:00')

    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
    const month = monthNames[d.getMonth()]
    const day = d.getDate()

    if (hasTime) {
      const hours = d.getHours().toString().padStart(2, '0')
      const minutes = d.getMinutes().toString().padStart(2, '0')
      return `${month} ${day}, ${hours}:${minutes}`
    }

    if (isSameYear) {
      return `${month} ${day}`
    }

    return `${month} ${day}, ${d.getFullYear()}`
  } catch (err) {
    return dateStr
  }
}
