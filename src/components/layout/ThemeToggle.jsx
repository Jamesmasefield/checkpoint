import { useEffect, useState } from 'react'

function getInitialTheme() {
  const stored = localStorage.getItem('checkpoint-theme')
  if (stored === 'light' || stored === 'dark') return stored
  return 'light'
}

export default function ThemeToggle() {
  const [theme, setTheme] = useState(getInitialTheme)

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark')
    localStorage.setItem('checkpoint-theme', theme)
  }, [theme])

  const toggle = () => setTheme((t) => (t === 'light' ? 'dark' : 'light'))

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label="Toggle light and dark mode"
      className="relative ml-auto h-5 w-[34px] shrink-0 rounded-full transition-colors duration-200"
      style={{ background: theme === 'dark' ? 'var(--primary)' : 'rgba(255,255,255,0.12)' }}
    >
      <span
        className="absolute top-0.5 h-4 w-4 rounded-full bg-white transition-transform duration-200"
        style={{ left: 0, transform: theme === 'dark' ? 'translateX(16px)' : 'translateX(2px)' }}
      />
    </button>
  )
}
