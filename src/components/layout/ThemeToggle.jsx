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
      className="flex w-full items-center justify-between rounded-md px-3 py-2 text-sm text-slate-300 hover:bg-white/5"
    >
      <span>{theme === 'light' ? 'Light mode' : 'Dark mode'}</span>
      <span
        className="relative inline-flex h-5 w-9 items-center rounded-full transition-colors"
        style={{ backgroundColor: theme === 'dark' ? '#4f6ef7' : '#475569' }}
      >
        <span
          className="absolute h-4 w-4 rounded-full bg-white transition-transform"
          style={{ transform: theme === 'dark' ? 'translateX(18px)' : 'translateX(2px)' }}
        />
      </span>
    </button>
  )
}
