/**
 * Convert array of objects to CSV string
 */
export function arrayToCSV(data: Record<string, unknown>[], headers: string[]): string {
  const headerRow = headers.join(',')
  
  const rows = data.map(row => {
    return headers.map(header => {
      const value = row[header]
      
      if (value === null || value === undefined) return ''
      
      // Handle strings with commas, quotes, or newlines
      const stringValue = String(value)
      if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
        return `"${stringValue.replace(/"/g, '""')}"`
      }
      
      return stringValue
    }).join(',')
  })
  
  return [headerRow, ...rows].join('\n')
}

/**
 * Trigger CSV download in browser
 */
export function downloadCSV(filename: string, csvContent: string) {
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
  const link = document.createElement('a')
  
  if (link.download !== undefined) {
    const url = URL.createObjectURL(blob)
    link.setAttribute('href', url)
    link.setAttribute('download', filename)
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }
}

/**
 * Format date for CSV
 */
export function formatDateForCSV(date: string | Date): string {
  const d = typeof date === 'string' ? new Date(date) : date
  return d.toISOString().split('T')[0]
}

/**
 * Format currency for CSV (without symbol)
 */
export function formatPriceForCSV(price: number): string {
  return price.toString()
}
