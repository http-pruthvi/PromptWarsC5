import { Router } from 'express'
import { z } from 'zod'
import { guestParamSchema, idParamSchema, paginationQuerySchema } from '@soiree/shared'
import { getAuthUserId } from '../../middleware/auth.js'
import { guestsService } from '../../services/guests.service.js'

export const guestsRouter = Router()

const guestCreateSchema = z
  .object({
    name: z.string().trim().min(1, 'String must contain at least 1 character(s)').max(100),
    party: z.number().int().min(1).max(10).default(1),
    status: z.enum(['pending', 'attending', 'declined']).default('pending'),
    dietary: z.enum(['none', 'veg', 'vegan', 'jain', 'halal', 'other']).default('none'),
    notes: z.string().trim().max(500).default(''),
  })
  .strict()

const guestPatchSchema = z
  .object({
    name: z.string().trim().min(1).max(100).optional(),
    party: z.number().int().min(1).max(10).optional(),
    status: z.enum(['pending', 'attending', 'declined']).optional(),
    dietary: z.enum(['none', 'veg', 'vegan', 'jain', 'halal', 'other']).optional(),
    notes: z.string().trim().max(500).optional(),
  })
  .strict()

const guestImportSchema = z
  .object({
    text: z.string().max(100000),
  })
  .strict()

/**
 * GET /api/plans/:id/guests - List all guests with pagination
 */
guestsRouter.get('/:id/guests', (req, res, next) => {
  try {
    const { id } = idParamSchema.parse(req.params)
    const { limit, offset } = paginationQuerySchema.parse(req.query)
    const result = guestsService.listGuests(id, getAuthUserId(req), limit, offset)
    return res.json(result)
  } catch (err) {
    next(err)
  }
})

/**
 * POST /api/plans/:id/guests - Add a guest
 */
guestsRouter.post('/:id/guests', (req, res, next) => {
  try {
    const { id } = idParamSchema.parse(req.params)
    const parsed = guestCreateSchema.parse(req.body)
    const guest = guestsService.addGuest(id, getAuthUserId(req), parsed)
    return res.status(201).json({ guest })
  } catch (err) {
    next(err)
  }
})

/**
 * PATCH /api/plans/:id/guests/:guestId - Update guest
 */
guestsRouter.patch('/:id/guests/:guestId', (req, res, next) => {
  try {
    const { id, guestId } = guestParamSchema.parse(req.params)
    const patch = guestPatchSchema.parse(req.body)
    const guest = guestsService.updateGuest(id, getAuthUserId(req), guestId, patch)
    return res.json({ guest })
  } catch (err) {
    next(err)
  }
})

/**
 * DELETE /api/plans/:id/guests/:guestId - Remove guest
 */
guestsRouter.delete('/:id/guests/:guestId', (req, res, next) => {
  try {
    const { id, guestId } = guestParamSchema.parse(req.params)
    guestsService.deleteGuest(id, getAuthUserId(req), guestId)
    return res.json({ message: 'Guest deleted' })
  } catch (err) {
    next(err)
  }
})

/**
 * POST /api/plans/:id/guests/import - Bulk import pasted list
 */
guestsRouter.post('/:id/guests/import', (req, res, next) => {
  try {
    const { id } = idParamSchema.parse(req.params)
    const { text } = guestImportSchema.parse(req.body)
    const result = guestsService.importPastedGuests(id, getAuthUserId(req), text)
    return res.status(201).json(result)
  } catch (err) {
    next(err)
  }
})

/**
 * GET /api/plans/:id/guests/summary - Summary stats, confirmed headcount, and catering cost per head
 */
guestsRouter.get('/:id/guests/summary', (req, res, next) => {
  try {
    const { id } = idParamSchema.parse(req.params)
    const summary = guestsService.getSummary(id, getAuthUserId(req))
    return res.json({ summary })
  } catch (err) {
    next(err)
  }
})
