'use client'

import { useEffect, useState } from 'react'

export function useTheme() {
  // Initialize with false to match SSR, will sync with DOM after mount
  const [mounted, setMounted] = useState(false)
  const [isDark, setIsDark] = useState(false)

  useEffect(() => {
    // Sync with DOM on mount - legitimate use case for reading external state
    const isDarkMode = document.documentElement.classList.contains('dark')
     
    setIsDark(isDarkMode)
    setMounted(true)
     
  }, [])

  const toggleTheme = () => {
    const newValue = !isDark
    setIsDark(newValue)
    
    if (newValue) {
      document.documentElement.classList.add('dark')
      localStorage.setItem('theme', 'dark')
    } else {
      document.documentElement.classList.remove('dark')
      localStorage.setItem('theme', 'light')
    }
  }

  return { isDark: mounted ? isDark : false, toggleTheme }
}
