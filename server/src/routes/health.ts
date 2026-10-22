import { Router } from 'express'

export const healthRouter = Router()

healthRouter.get('/', (_req, res) => {
  res.json({
    status: 'ok',
    service: 'soiree-api',
    timestamp: Date.now(),
    geminiEnabled: Boolean(process.env.GEMINI_API_KEY?.trim()),
  })
})
