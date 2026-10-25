import crypto from 'crypto'
import { Router } from 'express'
import { getDb } from '../../db/index.js'
import { idParamSchema, verifyPlanOwnership } from './common.js'

export const shareRouter = Router()

// POST /api/plans/:id/share - Enable share link and return random 24-char URL-safe token
shareRouter.post('/:id/share', (req, res, next) => {
  try {
    const { id } = idParamSchema.parse(req.params)
    const plan = verifyPlanOwnership(id, req.user!.id)
    if (!plan) return res.status(404).json({ error: 'Plan not found' })

    const db = getDb()
    const existing = db.prepare(`SELECT share_token FROM plans WHERE id = ?`).get(plan.id) as
      { share_token?: string | null } | undefined
    const shareToken = existing?.share_token || crypto.randomBytes(18).toString('base64url')

    db.prepare(
      `
      UPDATE plans SET share_token = ?, share_enabled = 1 WHERE id = ?
    `,
    ).run(shareToken, plan.id)

    return res.json({
      shareToken,
      shareEnabled: true,
    })
  } catch (err) {
    next(err)
  }
})

// DELETE /api/plans/:id/share - Revoke share link
shareRouter.delete('/:id/share', (req, res, next) => {
  try {
    const { id } = idParamSchema.parse(req.params)
    const plan = verifyPlanOwnership(id, req.user!.id)
    if (!plan) return res.status(404).json({ error: 'Plan not found' })

    const db = getDb()
    db.prepare(
      `
      UPDATE plans SET share_enabled = 0 WHERE id = ?
    `,
    ).run(plan.id)

    return res.json({
      message: 'Share link revoked',
      shareEnabled: false,
    })
  } catch (err) {
    next(err)
  }
})

// GET /api/plans/:id/share - Get share status
shareRouter.get('/:id/share', (req, res, next) => {
  try {
    const { id } = idParamSchema.parse(req.params)
    const plan = verifyPlanOwnership(id, req.user!.id)
    if (!plan) return res.status(404).json({ error: 'Plan not found' })

    const db = getDb()
    const row = db.prepare(`SELECT share_token, share_enabled FROM plans WHERE id = ?`).get(plan.id) as
      { share_token: string | null; share_enabled: number } | undefined

    return res.json({
      shareToken: row?.share_token || null,
      shareEnabled: Boolean(row?.share_enabled),
    })
  } catch (err) {
    next(err)
  }
})
