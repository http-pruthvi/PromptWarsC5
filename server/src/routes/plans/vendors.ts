import { Router } from 'express'
import {
  idParamSchema,
  paginationQuerySchema,
  vendorCreateSchema,
  vendorParamSchema,
  vendorUpdateSchema,
} from '@soiree/shared'
import { getAuthUserId } from '../../middleware/auth.js'
import { vendorsService } from '../../services/vendors.service.js'

export const vendorsRouter = Router()

/**
 * GET /api/plans/:id/vendors - List vendors with pagination
 */
vendorsRouter.get('/:id/vendors', (req, res, next) => {
  try {
    const { id } = idParamSchema.parse(req.params)
    const { limit, offset } = paginationQuerySchema.parse(req.query)
    const result = vendorsService.listVendors(id, getAuthUserId(req), limit, offset)
    return res.json(result)
  } catch (err) {
    next(err)
  }
})

/**
 * POST /api/plans/:id/vendors - Add vendor
 */
vendorsRouter.post('/:id/vendors', (req, res, next) => {
  try {
    const { id } = idParamSchema.parse(req.params)
    const raw = vendorCreateSchema.parse(req.body)
    const vendor = vendorsService.addVendor(id, getAuthUserId(req), raw)
    return res.status(201).json({ vendor })
  } catch (err) {
    next(err)
  }
})

/**
 * PATCH /api/plans/:id/vendors/:vendorId - Update vendor
 */
vendorsRouter.patch('/:id/vendors/:vendorId', (req, res, next) => {
  try {
    const { id, vendorId } = vendorParamSchema.parse(req.params)
    const patch = vendorUpdateSchema.parse(req.body)
    const vendor = vendorsService.updateVendor(id, getAuthUserId(req), vendorId, patch)
    return res.json({ vendor })
  } catch (err) {
    next(err)
  }
})

/**
 * DELETE /api/plans/:id/vendors/:vendorId - Delete vendor
 */
vendorsRouter.delete('/:id/vendors/:vendorId', (req, res, next) => {
  try {
    const { id, vendorId } = vendorParamSchema.parse(req.params)
    vendorsService.deleteVendor(id, getAuthUserId(req), vendorId)
    return res.json({ message: 'Vendor removed successfully' })
  } catch (err) {
    next(err)
  }
})
