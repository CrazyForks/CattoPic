import { useState, useEffect } from 'react'

export function useTheme() {
  const [isDarkMode, setIsDarkMode] = useState(true)

  useEffect(() => {
    let initialIsDark;
    try {
      const savedTheme = localStorage.getItem('theme')
      if (savedTheme) {
        initialIsDark = savedTheme === 'dark'
      } else {
        initialIsDark = document.documentElement.classList.contains('dark')

      }
    } catch (e) {
      console.warn("无法访问 localStorage 获取主题设置:", e);
      initialIsDark = document.documentElement.classList.contains('dark');
    }

    setIsDarkMode(initialIsDark);
    document.documentElement.classList.toggle('dark', initialIsDark);
  }, [])

  const toggleTheme = () => {
    const newTheme = !isDarkMode
    setIsDarkMode(newTheme)
    localStorage.setItem('theme', newTheme ? 'dark' : 'light')
    document.documentElement.classList.toggle('dark', newTheme)
  }

  return { isDarkMode, toggleTheme }
} 
