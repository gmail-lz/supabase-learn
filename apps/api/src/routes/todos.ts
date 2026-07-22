import type { RequestHandler } from 'express'
import { supabase } from '../lib/supabase.js'

export const listTodosHandler: RequestHandler = async (_req, res, next) => {
  if (!supabase) {
    res.status(503).json({
      error: 'Supabase is not configured. Set SUPABASE_URL and SUPABASE_ANON_KEY in apps/api/.env.'
    })
    return
  }

  try {
    const { data, error } = await supabase
      .from('todos')
      .select('id,title,is_complete,created_at')
      .order('created_at', { ascending: false })
      .limit(20)

    if (error) throw error

    res.json({ data })
  } catch (error) {
    next(error)
  }
}
