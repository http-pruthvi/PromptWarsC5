import { z } from 'zod'

/**
 * Supported event categories for planning.
 */
export const EVENT_TYPES = ['wedding', 'birthday', 'community'] as const

/**
 * Supported international currency codes.
 */
export const CURRENCIES = ['INR', 'USD', 'EUR'] as const

/**
 * Lifecycle statuses for vendor tracking.
 */
export const VENDOR_STATUSES = ['todo', 'contacted', 'booked'] as const

/**
 * RSVP status options for guests.
 */
export const GUEST_STATUSES = ['pending', 'attending', 'declined'] as const

/**
 * Dietary requirement options for catering coordination.
 */
export const DIETARY_OPTIONS = ['none', 'veg', 'vegan', 'jain', 'halal', 'other'] as const

/**
 * Validation schema for the core event brief submitted to create a plan.
 */
export const briefSchema = z
  .object({
    type: z.enum(EVENT_TYPES),
    title: z.string().trim().max(200).optional().default(''),
    date: z.string().trim().min(10).max(20),
    guests: z.number().int().positive().max(100000),
    budget: z.number().positive().max(1000000000),
    currency: z.enum(CURRENCIES).default('INR'),
    city: z.string().trim().max(100).optional().default(''),
    vibe: z.string().trim().max(200).optional().default(''),
    notes: z.string().trim().max(2000).optional().default(''),
  })
  .strict()

export type BriefInput = z.infer<typeof briefSchema>

/**
 * Validation schema for updating a budget category allocation or expenditure.
 */
export const budgetItemSchema = z
  .object({
    category: z.string().trim().min(1).max(100),
    allocated: z.number().min(0).max(1000000000),
    spent: z.number().min(0).max(1000000000).optional().default(0),
    note: z.string().trim().max(500).optional().default(''),
  })
  .strict()

export type BudgetItemInput = z.infer<typeof budgetItemSchema>

/**
 * Validation schema for rebalancing budget items across categories.
 */
export const budgetRebalanceItemSchema = z
  .object({
    itemId: z.string().trim().min(1).max(64),
    category: z.string().trim().min(1).max(100),
    to: z.number().min(0).max(1000000000),
    reason: z.string().trim().max(500).optional().default(''),
  })
  .strict()

export const budgetRebalanceSchema = z
  .object({
    changes: z.array(budgetRebalanceItemSchema).min(1).max(50),
    summary: z.string().trim().max(1000).optional().default(''),
  })
  .strict()

/**
 * Validation schema for updating milestones in the timeline.
 */
export const milestoneUpdateSchema = z
  .object({
    done: z.boolean(),
  })
  .strict()

export const vendorSchema = z
  .object({
    category: z.string().trim().min(1).max(100),
    name: z.string().trim().min(1).max(200),
    status: z.enum(VENDOR_STATUSES),
    estimate: z.number().min(0).max(1000000000).optional().default(0),
    tips: z.string().trim().max(1000).optional().default(''),
  })
  .strict()

export const vendorCreateSchema = z
  .object({
    category: z.string().trim().min(1).max(100),
    name: z.string().trim().max(100).optional().default(''),
    status: z.enum(VENDOR_STATUSES).optional().default('todo'),
    estimate: z.number().min(0).max(1000000000).optional().default(0),
    tips: z.string().trim().max(1000).optional().default(''),
  })
  .strict()

export const vendorUpdateSchema = z
  .object({
    category: z.string().trim().min(1).max(100).optional(),
    name: z.string().trim().max(100).optional(),
    status: z.enum(VENDOR_STATUSES).optional(),
    estimate: z.number().min(0).max(1000000000).optional(),
    tips: z.string().trim().max(1000).optional(),
  })
  .strict()

export type VendorInput = z.infer<typeof vendorSchema>
export type VendorCreateInput = z.infer<typeof vendorCreateSchema>
export type VendorUpdateInput = z.infer<typeof vendorUpdateSchema>

/**
 * Validation schema for a single guest RSVP entry.
 */
export const guestSchema = z
  .object({
    name: z.string().trim().min(1).max(150),
    party: z.number().int().min(1).max(100).default(1),
    status: z.enum(GUEST_STATUSES).default('pending'),
    dietary: z.enum(DIETARY_OPTIONS).default('none'),
    notes: z.string().trim().max(500).optional().default(''),
  })
  .strict()

export type GuestInput = z.infer<typeof guestSchema>

/**
 * Validation schema for batch importing guest records.
 */
export const guestBatchSchema = z
  .object({
    guests: z.array(guestSchema).min(1).max(500),
  })
  .strict()

/**
 * Validation schema for interactive planner chat messages.
 */
export const chatMessageSchema = z
  .object({
    text: z.string().trim().min(1).max(2000),
  })
  .strict()

/**
 * Validation schema for toggling public plan sharing.
 */
export const shareToggleSchema = z
  .object({
    enabled: z.boolean(),
  })
  .strict()

/**
 * Generic route identifier parameter schema.
 */
export const idParamSchema = z
  .object({
    id: z.string().trim().min(1).max(64),
  })
  .strict()

export const budgetItemParamSchema = z
  .object({
    id: z.string().trim().min(1).max(64),
    itemId: z.string().trim().min(1).max(64),
  })
  .strict()

export const milestoneParamSchema = z
  .object({
    id: z.string().trim().min(1).max(64),
    milestoneId: z.string().trim().min(1).max(64),
  })
  .strict()

export const vendorParamSchema = z
  .object({
    id: z.string().trim().min(1).max(64),
    vendorId: z.string().trim().min(1).max(64),
  })
  .strict()

export const guestParamSchema = z
  .object({
    id: z.string().trim().min(1).max(64),
    guestId: z.string().trim().min(1).max(64),
  })
  .strict()

/**
 * Standard query pagination schema.
 */
export const paginationQuerySchema = z
  .object({
    limit: z.coerce.number().int().min(1).max(500).optional().default(50),
    offset: z.coerce.number().int().min(0).optional().default(0),
  })
  .strict()
