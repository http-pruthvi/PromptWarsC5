import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useShareModal } from '../hooks/useShareModal.js'
import { useAppState, readRoute } from '../hooks/useAppState.js'
import { useMotionControl } from '../hooks/useMotionControl.js'
import { api } from '../lib/api.js'

describe('Custom Hooks: useShareModal and useAppState Suite', () => {
  beforeEach(() => {
    window.location.hash = '#/'
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ user: { id: 'u1', email: 'test@example.com', isGuest: false } }),
      }),
    )
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('verifies readRoute parses hashes accurately', () => {
    window.location.hash = '#/share/tok123'
    expect(readRoute()).toEqual({ route: 'share', token: 'tok123' })

    window.location.hash = '#/planner'
    expect(readRoute()).toEqual({ route: 'planner' })

    window.location.hash = '#/unknown'
    expect(readRoute()).toEqual({ route: 'home' })
  })

  it('manages share modal lifecycle, toggle, and clipboard copy', async () => {
    vi.spyOn(api.plans, 'getShare').mockResolvedValue({ shareToken: 'tok', shareEnabled: false })
    vi.spyOn(api.plans, 'enableShare').mockResolvedValue({ shareToken: 'tok', shareEnabled: true })
    vi.spyOn(api.plans, 'revokeShare').mockResolvedValue({ message: 'revoked', shareEnabled: false })

    const { result } = renderHook(() => useShareModal())
    expect(result.current.showShareModal).toBe(false)

    await act(async () => {
      await result.current.openShareModal('plan1')
    })
    expect(result.current.showShareModal).toBe(true)
    expect(result.current.shareData?.shareEnabled).toBe(false)

    const mockToast = vi.fn()
    await act(async () => {
      await result.current.toggleShareEnabled('plan1', mockToast)
    })
    expect(mockToast).toHaveBeenCalledWith('Shareable public link enabled!')
    expect(result.current.shareData?.shareEnabled).toBe(true)

    // Revoke share
    await act(async () => {
      await result.current.toggleShareEnabled('plan1', mockToast)
    })
    expect(mockToast).toHaveBeenCalledWith('Share link revoked')
    expect(result.current.shareData?.shareEnabled).toBe(false)

    // Copy share link
    act(() => {
      result.current.copyShareLink(mockToast)
    })
    expect(mockToast).toHaveBeenCalledWith('Share link copied to clipboard!')

    // Error handling on toggle failure
    vi.spyOn(api.plans, 'enableShare').mockRejectedValueOnce(new Error('fail'))
    await act(async () => {
      await result.current.toggleShareEnabled('plan1', mockToast)
    })
    expect(mockToast).toHaveBeenCalledWith('Failed to update share link settings')

    // Escape key closes modal
    act(() => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))
    })
    expect(result.current.showShareModal).toBe(false)
  })

  it('manages useAppState navigation, presets, and auth session', async () => {
    const { result } = renderHook(() => useAppState())

    act(() => {
      result.current.start('wedding')
      window.dispatchEvent(new Event('hashchange'))
    })
    expect(result.current.preset).toBe('wedding')
    expect(result.current.route).toBe('planner')

    act(() => {
      result.current.go('home')
      window.dispatchEvent(new Event('hashchange'))
    })
    expect(result.current.route).toBe('home')

    act(() => {
      result.current.toast('Celebration saved')
    })
    expect(result.current.toastMsg).toBe('Celebration saved')

    act(() => {
      result.current.handleAuthSuccess({ id: 'u2', email: 'guest@soiree.com', isGuest: true, createdAt: 1 })
    })
    expect(result.current.user?.isGuest).toBe(true)

    await act(async () => {
      await result.current.handleLogout()
    })
    expect(result.current.user).toBeNull()
  })

  it('manages useMotionControl state, localStorage persistence, and DOM classes', () => {
    localStorage.clear()
    const { result } = renderHook(() => useMotionControl())
    expect(result.current.motionPaused).toBe(false)
    expect(document.documentElement.classList.contains('animations-paused')).toBe(false)

    act(() => {
      result.current.toggleMotion()
    })
    expect(result.current.motionPaused).toBe(true)
    expect(document.documentElement.classList.contains('animations-paused')).toBe(true)
    expect(localStorage.getItem('soiree_motion_paused')).toBe('true')

    act(() => {
      result.current.toggleMotion()
    })
    expect(result.current.motionPaused).toBe(false)
    expect(document.documentElement.classList.contains('animations-paused')).toBe(false)
  })
})
