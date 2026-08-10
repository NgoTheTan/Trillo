/**
 * Các hàm tiện ích ngày & giờ để định dạng và kiểm tra.
 */

/**
 * Định dạng chuỗi ngày ISO hoặc ngày-giờ thô thành dạng hiển thị dễ đọc cho thẻ giao diện.
 *
 * Ví dụ:
 * - "2026-08-10T14:30:00" -> "10 Thg8, 14:30"
 * - "2026-08-10T00:00:00" -> "10 Thg8, 2026"
 * - "10/08/2026"          -> "10 Thg8, 2026"
 */
export const formatDeadlineDisplay = (dateStr?: string | null): string => {
  if (!dateStr || !dateStr.trim()) return 'Không có hạn chót'

  try {
    let cleanStr = dateStr.trim()
    // Xử lý định dạng DD/MM/YYYY
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

    const monthNames = ['Thg1', 'Thg2', 'Thg3', 'Thg4', 'Thg5', 'Thg6', 'Thg7', 'Thg8', 'Thg9', 'Thg10', 'Thg11', 'Thg12']
    const month = monthNames[d.getMonth()]
    const day = d.getDate()

    if (hasTime) {
      const hours = d.getHours().toString().padStart(2, '0')
      const minutes = d.getMinutes().toString().padStart(2, '0')
      return `${day} ${month}, ${hours}:${minutes}`
    }

    if (isSameYear) {
      return `${day} ${month}`
    }

    return `${day} ${month}, ${d.getFullYear()}`
  } catch (err) {
    return dateStr
  }
}
