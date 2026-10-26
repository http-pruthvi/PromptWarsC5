import { useCallback, useEffect, useState } from 'react'
import { api } from '../lib/api'

interface ShareState {
  shareToken: string | null
  shareEnabled: boolean
}

interface UseShareModalReturn {
  showShareModal: boolean
  shareData: ShareState | null
  busyShare: boolean
  openShareModal: (planId: string) => Promise<void>
  closeShareModal: () => void
  toggleShareEnabled: (planId: string, toast: (m: string) => void) => Promise<void>
  copyShareLink: (toast: (m: string) => void) => void
}

/**
 * Encapsulates share-modal state and API interactions for a plan.
 *
 * Manages the open/close lifecycle, share link toggle, and clipboard copy,
 * keeping PlanView's cyclomatic complexity under the lint threshold.
 */
export function useShareModal(): UseShareModalReturn {
  const [showShareModal, setShowShareModal] = useState(false)
  const [shareData, setShareData] = useState<ShareState | null>(null)
  const [busyShare, setBusyShare] = useState(false)

  const openShareModal = useCallback(async (planId: string) => {
    setShowShareModal(true)
    setBusyShare(true)
    try {
      const res = await api.plans.getShare(planId)
      setShareData(res)
    } catch {
      setShareData({ shareToken: null, shareEnabled: false })
    } finally {
      setBusyShare(false)
    }
  }, [])

  const closeShareModal = useCallback(() => {
    setShowShareModal(false)
  }, [])

  const toggleShareEnabled = useCallback(
    async (planId: string, toast: (m: string) => void) => {
      setBusyShare(true)
      try {
        if (shareData?.shareEnabled) {
          await api.plans.revokeShare(planId)
          setShareData((s) => (s ? { ...s, shareEnabled: false } : { shareToken: null, shareEnabled: false }))
          toast('Share link revoked')
        } else {
          const res = await api.plans.enableShare(planId)
          setShareData(res)
          toast('Shareable public link enabled!')
        }
      } catch {
        toast('Failed to update share link settings')
      } finally {
        setBusyShare(false)
      }
    },
    [shareData?.shareEnabled],
  )

  const copyShareLink = useCallback(
    (toast: (m: string) => void) => {
      if (!shareData?.shareToken) return
      const url = `${window.location.origin}/#/share/${shareData.shareToken}`
      if (navigator.clipboard) {
        navigator.clipboard.writeText(url).catch(() => {
          /* clipboard not available */
        })
      }
      toast('Share link copied to clipboard!')
    },
    [shareData?.shareToken],
  )

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && showShareModal) {
        setShowShareModal(false)
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [showShareModal])

  return {
    showShareModal,
    shareData,
    busyShare,
    openShareModal,
    closeShareModal,
    toggleShareEnabled,
    copyShareLink,
  }
}
