import { motion, AnimatePresence } from 'framer-motion'
import React, { Suspense, useEffect, useState } from 'react'
import type { EventType, Plan, PlanSummary, User } from '@soiree/shared'
import { api } from '../lib/api'
import { VectorScene } from './VectorScene'
import { LoopingLotus } from './Vectors'

const Dashboard = React.lazy(() => import('./Dashboard'))
const Wizard = React.lazy(() => import('./Wizard'))
const PlanView = React.lazy(() => import('./PlanView'))

interface Props {
  presetType?: EventType
  user: User | null
  onRequireAuth: () => void
  toast: (m: string) => void
}

type PlannerMode = 'dashboard' | 'wizard' | 'plan'

export default function Planner({ presetType, user, onRequireAuth: _onRequireAuth, toast }: Props) {
  const [mode, setMode] = useState<PlannerMode>(presetType ? 'wizard' : 'dashboard')
  const [plans, setPlans] = useState<PlanSummary[]>([])
  const [loadingList, setLoadingList] = useState(false)
  const [activePlan, setActivePlan] = useState<Plan | null>(null)
  const [loadingPlan, setLoadingPlan] = useState(false)

  // Fetch plans list with AbortController on unmount
  useEffect(() => {
    const controller = new AbortController()
    setLoadingList(true)

    api.plans
      .list({ signal: controller.signal })
      .then((res) => {
        setPlans(res.plans)
        if (!presetType && res.plans.length === 0 && !activePlan) {
          setMode('wizard')
        }
      })
      .catch((err: unknown) => {
        if ((err as { name?: string })?.name === 'AbortError') return
        setPlans([])
      })
      .finally(() => {
        setLoadingList(false)
      })

    return () => {
      controller.abort()
    }
  }, [user, presetType, activePlan])

  // Open an existing plan
  const handleOpenPlan = async (planId: string) => {
    setLoadingPlan(true)
    try {
      const res = await api.plans.get(planId)
      setActivePlan(res.plan)
      setMode('plan')
    } catch {
      toast('Failed to load plan details')
    } finally {
      setLoadingPlan(false)
    }
  }

  // Delete an existing plan
  const handleDeletePlan = async (planId: string) => {
    try {
      await api.plans.delete(planId)
      setPlans((prev) => prev.filter((p) => p.id !== planId))
      if (activePlan?.id === planId) {
        setActivePlan(null)
        setMode('dashboard')
      }
      toast('Plan deleted')
    } catch {
      toast('Failed to delete plan')
    }
  }

  // Plan mutation helper for optimistic updates in PlanView
  const setPlan = (fn: (p: Plan) => Plan) => {
    setActivePlan((p) => (p ? fn(p) : p))
  }

  return (
    <div className="planner">
      <div className="planner-bg" aria-hidden>
        <VectorScene />
      </div>
      <div className="wrap">
        {loadingPlan ? (
          <div
            style={{ display: 'grid', placeItems: 'center', minHeight: 320, padding: '80px 0' }}
            role="status"
            aria-label="Loading event plan"
          >
            <LoopingLotus />
            <p style={{ color: 'var(--muted)', marginTop: 14, fontSize: 14 }}>Loading your event portfolio…</p>
          </div>
        ) : (
          <Suspense
            fallback={
              <div
                style={{ display: 'grid', placeItems: 'center', minHeight: 320, padding: '80px 0' }}
                role="status"
                aria-label="Loading section"
              >
                <LoopingLotus />
                <p style={{ color: 'var(--muted)', marginTop: 14, fontSize: 14 }}>Preparing celebration…</p>
              </div>
            }
          >
            <AnimatePresence mode="wait">
              {mode === 'wizard' && (
                <motion.div
                  key="wizard"
                  initial={{ opacity: 0, y: 24 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -16 }}
                  transition={{ duration: 0.5 }}
                >
                  <Wizard
                    initialType={presetType}
                    onDone={(p) => {
                      setActivePlan(p)
                      setMode('plan')
                      api.plans
                        .list()
                        .then((r) => setPlans(r.plans))
                        .catch(() => {})
                      toast('Your plan is ready ✨')
                    }}
                  />
                  {plans.length > 0 && (
                    <p style={{ textAlign: 'center', marginTop: 18 }}>
                      <button className="btn btn-ghost btn-sm" onClick={() => setMode('dashboard')}>
                        Cancel and return to My Plans
                      </button>
                    </p>
                  )}
                </motion.div>
              )}

              {mode === 'dashboard' && (
                <motion.div
                  key="dashboard"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -16 }}
                  transition={{ duration: 0.4 }}
                >
                  <Dashboard
                    plans={plans}
                    loading={loadingList}
                    onOpen={handleOpenPlan}
                    onDelete={handleDeletePlan}
                    onNew={() => setMode('wizard')}
                  />
                </motion.div>
              )}

              {mode === 'plan' && activePlan && (
                <motion.div
                  key={`plan-${activePlan.id}`}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -16 }}
                  transition={{ duration: 0.4 }}
                >
                  <PlanView
                    plan={activePlan}
                    setPlan={setPlan}
                    onNew={() => setMode('wizard')}
                    onBackToDashboard={() => setMode('dashboard')}
                    toast={toast}
                  />
                </motion.div>
              )}
            </AnimatePresence>
          </Suspense>
        )}
      </div>
    </div>
  )
}
