import { useEffect, useState, useCallback } from 'react'

const STORAGE_KEY = 'soiree_motion_paused'

export interface MotionControl {
  motionPaused: boolean
  toggleMotion: () => void
}

/**
 * Manages WCAG 2.2.2 animation pause toggle with localStorage persistence.
 */
export function useMotionControl(): MotionControl {
  const [motionPaused, setMotionPaused] = useState<boolean>(() => {
    try {
      return localStorage.getItem(STORAGE_KEY) === 'true'
    } catch {
      return false
    }
  })

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, String(motionPaused))
    } catch {
      /* ignore storage quota/security errors */
    }

    if (motionPaused) {
      document.documentElement.classList.add('animations-paused')
      document.body.classList.add('animations-paused')
    } else {
      document.documentElement.classList.remove('animations-paused')
      document.body.classList.remove('animations-paused')
    }
  }, [motionPaused])

  const toggleMotion = useCallback(() => {
    setMotionPaused((prev) => !prev)
  }, [])

  return { motionPaused, toggleMotion }
}
