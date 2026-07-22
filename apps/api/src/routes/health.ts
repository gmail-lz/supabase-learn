import type { RequestHandler } from 'express'
import { isSupabaseConfigured } from '../lib/supabase.js'

export const healthHandler: RequestHandler = (_req, res) => {
  res.json({
    ok: true,
    service: 'supabase-learn-api',
    supabase: {
      configured: isSupabaseConfigured
    },
    timestamp: new Date().toISOString()
  })
}
