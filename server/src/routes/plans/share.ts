import { Router } from 'express'
import { idParamSchema } from '@soiree/shared'
import { getAuthUserId } from '../../middleware/auth.js'
import { shareService } from '../../services/share.service.js'

export const shareRouter = Router()

/**
 * POST /api/plans/:id/share - Enable share link and return random URL-safe token
 */
shareRouter.post('/:id/share', (req, res, next) => {
  try {
    const { id } = idParamSchema.parse(req.params)
    const result = shareService.enableShare(id, getAuthUserId(req))
    return res.json(result)
  } catch (err) {
    next(err)
  }
})

/**
 * DELETE /api/plans/:id/share - Revoke share link
 */
shareRouter.delete('/:id/share', (req, res, next) => {
  try {
    const { id } = idParamSchema.parse(req.params)
    const result = shareService.revokeShare(id, getAuthUserId(req))
    return res.json(result)
  } catch (err) {
    next(err)
  }
})

/**
 * GET /api/plans/:id/share - Get share status
 */
shareRouter.get('/:id/share', (req, res, next) => {
  try {
    const { id } = idParamSchema.parse(req.params)
    const result = shareService.getShareStatus(id, getAuthUserId(req))
    return res.json(result)
  } catch (err) {
    next(err)
  }
})
