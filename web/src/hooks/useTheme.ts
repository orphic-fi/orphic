import { useCallback, useEffect, useState } from 'react'

export type Theme = 'light' | 'dark'

function read(): Theme {
  if (typeof document === 'undefined') return 'light'
  return document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light'
}

/** Light by default; dark when the person picks it (remembered per browser) or their system prefers it. */
export function useTheme(): [Theme, () => void] {
  const [theme, setTheme] = useState<Theme>(read)
  useEffect(() => {
    if (theme === 'dark') document.documentElement.dataset.theme = 'dark'
    else delete document.documentElement.dataset.theme
    try {
      localStorage.setItem('orphic-theme', theme)
    } catch {
      /* private mode or storage blocked: the choice lasts this page view */
    }
  }, [theme])
  const toggle = useCallback(() => setTheme((t) => (t === 'dark' ? 'light' : 'dark')), [])
  return [theme, toggle]
}
