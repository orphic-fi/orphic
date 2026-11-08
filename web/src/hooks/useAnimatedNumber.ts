import { useEffect, useRef, useState } from 'react'

function reducedMotion(): boolean {
  return typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

/**
 * Animates from the previously shown value to `target` over `duration` ms, linear.
 * The first non-null value is shown at once (no animation on first paint).
 * null passes through unchanged so callers can keep showing n/a.
 */
export function useAnimatedNumber(target: number | null | undefined, duration = 240): number | null {
  const [shown, setShown] = useState<number | null>(target ?? null)
  const shownRef = useRef<number | null>(target ?? null)
  const frame = useRef<number | null>(null)

  useEffect(() => {
    const from = shownRef.current
    const snap = target === null || target === undefined || from === null || from === target || reducedMotion() || duration <= 0
    if (snap) {
      // Snap on the next frame so the effect itself stays free of synchronous state updates.
      frame.current = requestAnimationFrame(() => {
        shownRef.current = target ?? null
        setShown(target ?? null)
      })
      return () => {
        if (frame.current !== null) cancelAnimationFrame(frame.current)
      }
    }
    const start = performance.now()
    const step = (now: number) => {
      const t = Math.min(1, (now - start) / duration)
      const value = from + (target - from) * t
      shownRef.current = value
      setShown(value)
      if (t < 1) frame.current = requestAnimationFrame(step)
    }
    frame.current = requestAnimationFrame(step)
    return () => {
      if (frame.current !== null) cancelAnimationFrame(frame.current)
    }
  }, [target, duration])

  return shown
}
