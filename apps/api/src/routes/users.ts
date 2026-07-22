import type { RequestHandler } from 'express'
import { z } from 'zod'
import { supabaseAdmin } from '../lib/supabase.js'

const userPayloadSchema = z.object({
  nickname: z.string().trim().min(1, '昵称不能为空').default('Demo 用户'),
  phone: z.string().trim().min(5, '手机号格式不正确').optional(),
  email: z.string().trim().email('邮箱格式不正确').optional()
})

const requireDb = () => {
  if (!supabaseAdmin) {
    throw new Error('Supabase service role is not configured. Set SUPABASE_SERVICE_ROLE_KEY in root .env.')
  }
  return supabaseAdmin
}

export const registerUserHandler: RequestHandler = async (req, res, next) => {
  try {
    const db = requireDb()
    const payload = userPayloadSchema.parse(req.body)

    if (!payload.phone && !payload.email) {
      res.status(400).json({ error: '手机号和邮箱至少填写一个' })
      return
    }

    const filters = [payload.phone ? `phone.eq.${payload.phone}` : '', payload.email ? `email.eq.${payload.email}` : ''].filter(Boolean).join(',')
    const { data: existing, error: existingError } = await db
      .from('demo_users')
      .select('*')
      .or(filters)
      .maybeSingle()

    if (existingError) throw existingError
    if (existing) {
      res.json({ data: existing, reused: true })
      return
    }

    const { data, error } = await db
      .from('demo_users')
      .insert(payload)
      .select('*')
      .single()

    if (error) throw error
    res.status(201).json({ data })
  } catch (error) {
    next(error)
  }
}

export const loginUserHandler: RequestHandler = async (req, res, next) => {
  try {
    const db = requireDb()
    const schema = z.object({ phone: z.string().trim().min(5, '手机号格式不正确') })
    const { phone } = schema.parse(req.body)

    const { data, error } = await db
      .from('demo_users')
      .select('*')
      .eq('phone', phone)
      .maybeSingle()

    if (error) throw error
    if (!data) {
      res.status(404).json({ error: '没有找到该手机号对应的用户' })
      return
    }

    res.json({ data })
  } catch (error) {
    next(error)
  }
}

export const getUserHandler: RequestHandler = async (req, res, next) => {
  try {
    const db = requireDb()
    const { data, error } = await db
      .from('demo_users')
      .select('*')
      .eq('id', req.params.id)
      .single()

    if (error) throw error
    res.json({ data })
  } catch (error) {
    next(error)
  }
}
