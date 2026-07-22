import type { RequestHandler } from 'express'
import { z } from 'zod'
import { supabaseAdmin } from '../lib/supabase.js'

const requireDb = () => {
  if (!supabaseAdmin) {
    throw new Error('Supabase service role is not configured. Set SUPABASE_SERVICE_ROLE_KEY in root .env.')
  }
  return supabaseAdmin
}

function normalizeOptionalText(value?: string): string | undefined {
  const trimmed = value?.trim()
  return trimmed ? trimmed : undefined
}

function isTruthyQuery(value: unknown): boolean {
  if (Array.isArray(value)) {
    return value.some((item) => isTruthyQuery(item))
  }
  return value === '1' || value === 'true' || value === true
}

export const adminListUsersHandler: RequestHandler = async (_req, res, next) => {
  try {
    const db = requireDb()
    const { data, error } = await db.from('demo_users').select('*').order('created_at', { ascending: false })
    if (error) throw error
    res.json({ data })
  } catch (error) {
    next(error)
  }
}

export const adminCreateUserHandler: RequestHandler = async (req, res, next) => {
  try {
    const db = requireDb()
    const raw = z.object({
      nickname: z.string().trim().min(1, '昵称不能为空').default('Demo 用户'),
      phone: z.string().trim().optional(),
      email: z.string().trim().optional(),
      status: z.enum(['active', 'disabled']).default('active')
    }).parse(req.body)

    const phone = normalizeOptionalText(raw.phone)
    const email = normalizeOptionalText(raw.email)

    if (!phone && !email) {
      res.status(400).json({ error: '手机号和邮箱至少填写一个' })
      return
    }

    if (email) {
      z.string().email('邮箱格式不正确').parse(email)
    }

    const filters = [phone ? `phone.eq.${phone}` : '', email ? `email.eq.${email}` : ''].filter(Boolean).join(',')
    if (filters) {
      const { data: existing, error: existingError } = await db
        .from('demo_users')
        .select('id')
        .or(filters)
        .maybeSingle()

      if (existingError) throw existingError
      if (existing) {
        res.status(409).json({ error: '手机号或邮箱已存在' })
        return
      }
    }

    const payload: Record<string, unknown> = {
      nickname: raw.nickname,
      status: raw.status,
      phone: phone ?? null,
      email: email ?? null
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

export const adminUpdateUserHandler: RequestHandler = async (req, res, next) => {
  try {
    const db = requireDb()
    const raw = z.object({
      nickname: z.string().trim().min(1).optional(),
      phone: z.string().trim().optional(),
      email: z.string().trim().optional(),
      status: z.enum(['active', 'disabled']).optional()
    }).parse(req.body)

    const payload: Record<string, unknown> = {
      nickname: normalizeOptionalText(raw.nickname),
      phone: normalizeOptionalText(raw.phone),
      status: raw.status
    }

    const email = normalizeOptionalText(raw.email)
    if (email !== undefined) {
      payload.email = z.string().email('邮箱格式不正确').parse(email)
    } else if (raw.email !== undefined) {
      payload.email = null
    }

    const { data, error } = await db.from('demo_users').update(payload).eq('id', req.params.id).select('*').single()
    if (error) throw error
    res.json({ data })
  } catch (error) {
    next(error)
  }
}

export const adminDeleteUserHandler: RequestHandler = async (req, res, next) => {
  try {
    const db = requireDb()
    const hardDelete = isTruthyQuery(req.query.hardDelete)

    const { data: user, error: userError } = await db
      .from('demo_users')
      .select('*')
      .eq('id', req.params.id)
      .maybeSingle()

    if (userError) throw userError
    if (!user) {
      res.status(404).json({ error: '用户不存在' })
      return
    }

    const { count: orderCount, error: orderCountError } = await db
      .from('demo_orders')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', req.params.id)

    if (orderCountError) throw orderCountError

    if (hardDelete) {
      if ((orderCount ?? 0) > 0) {
        res.status(400).json({ error: '该用户存在订单，无法彻底删除，请使用普通删除（禁用）' })
        return
      }

      const { data, error } = await db
        .from('demo_users')
        .delete()
        .eq('id', req.params.id)
        .select('*')
        .maybeSingle()

      if (error) throw error
      res.json({ data, deleted: true, softDeleted: false, message: '用户已彻底删除' })
      return
    }

    const { data, error } = await db
      .from('demo_users')
      .update({ status: 'disabled' })
      .eq('id', req.params.id)
      .select('*')
      .single()

    if (error) throw error
    res.json({ data, deleted: false, softDeleted: true, message: '用户已禁用（逻辑删除）' })
  } catch (error) {
    next(error)
  }
}

export const adminListProductsHandler: RequestHandler = async (_req, res, next) => {
  try {
    const db = requireDb()
    const { data, error } = await db
      .from('demo_products')
      .select('*, demo_skus(*)')
      .order('sort_order', { ascending: true })
    if (error) throw error
    res.json({ data })
  } catch (error) {
    next(error)
  }
}

export const adminCreateProductHandler: RequestHandler = async (req, res, next) => {
  try {
    const db = requireDb()
    const payload = z.object({
      title: z.string().trim().min(1),
      subtitle: z.string().trim().optional(),
      description: z.string().trim().optional(),
      cover_url: z.string().trim().optional(),
      status: z.enum(['on_sale', 'off_sale']).default('on_sale'),
      sort_order: z.coerce.number().int().default(0),
      sku_name: z.string().trim().min(1).default('标准版'),
      price: z.coerce.number().nonnegative().default(0),
      stock: z.coerce.number().int().nonnegative().default(0)
    }).parse(req.body)

    const { sku_name, price, stock, ...productPayload } = payload
    const { data: product, error: productError } = await db.from('demo_products').insert(productPayload).select('*').single()
    if (productError) throw productError

    const { data: sku, error: skuError } = await db
      .from('demo_skus')
      .insert({ product_id: product.id, sku_name, price, stock })
      .select('*')
      .single()
    if (skuError) throw skuError

    res.status(201).json({ data: { ...product, demo_skus: [sku] } })
  } catch (error) {
    next(error)
  }
}

export const adminUpdateProductHandler: RequestHandler = async (req, res, next) => {
  try {
    const db = requireDb()
    const payload = z.object({
      title: z.string().trim().min(1).optional(),
      subtitle: z.string().trim().optional(),
      description: z.string().trim().optional(),
      cover_url: z.string().trim().optional(),
      status: z.enum(['on_sale', 'off_sale']).optional(),
      sort_order: z.coerce.number().int().optional()
    }).parse(req.body)

    const { data, error } = await db.from('demo_products').update(payload).eq('id', req.params.id).select('*').single()
    if (error) throw error
    res.json({ data })
  } catch (error) {
    next(error)
  }
}

export const adminDeleteProductHandler: RequestHandler = async (req, res, next) => {
  try {
    const db = requireDb()
    const productId = req.params.id

    const { data: product, error: productError } = await db
      .from('demo_products')
      .select('*')
      .eq('id', productId)
      .maybeSingle()

    if (productError) throw productError
    if (!product) {
      res.status(404).json({ error: '商品不存在' })
      return
    }

    const { count: orderItemCount, error: orderItemCountError } = await db
      .from('demo_order_items')
      .select('id', { count: 'exact', head: true })
      .eq('product_id', productId)

    if (orderItemCountError) throw orderItemCountError

    if ((orderItemCount ?? 0) > 0) {
      const { data: updated, error: updateProductError } = await db
        .from('demo_products')
        .update({ status: 'off_sale' })
        .eq('id', productId)
        .select('*')
        .single()
      if (updateProductError) throw updateProductError

      const { error: updateSkuError } = await db
        .from('demo_skus')
        .update({ status: 'disabled', stock: 0 })
        .eq('product_id', productId)
      if (updateSkuError) throw updateSkuError

      res.json({
        data: updated,
        deleted: false,
        softDeleted: true,
        message: '商品存在历史订单，已下架并禁用全部 SKU（逻辑删除）'
      })
      return
    }

    const { data, error } = await db
      .from('demo_products')
      .delete()
      .eq('id', productId)
      .select('*')
      .maybeSingle()

    if (error) throw error
    res.json({ data, deleted: true, softDeleted: false, message: '商品已删除' })
  } catch (error) {
    next(error)
  }
}

export const adminCreateSkuHandler: RequestHandler = async (req, res, next) => {
  try {
    const db = requireDb()
    const productId = req.params.id

    const { data: product, error: productError } = await db
      .from('demo_products')
      .select('id')
      .eq('id', productId)
      .maybeSingle()

    if (productError) throw productError
    if (!product) {
      res.status(404).json({ error: '商品不存在' })
      return
    }

    const payload = z.object({
      sku_name: z.string().trim().min(1),
      price: z.coerce.number().nonnegative().default(0),
      stock: z.coerce.number().int().nonnegative().default(0),
      status: z.enum(['active', 'disabled']).default('active')
    }).parse(req.body)

    const { data, error } = await db
      .from('demo_skus')
      .insert({ ...payload, product_id: productId })
      .select('*')
      .single()

    if (error) throw error
    res.status(201).json({ data })
  } catch (error) {
    next(error)
  }
}

export const adminUpdateSkuHandler: RequestHandler = async (req, res, next) => {
  try {
    const db = requireDb()
    const payload = z.object({
      sku_name: z.string().trim().min(1).optional(),
      price: z.coerce.number().nonnegative().optional(),
      stock: z.coerce.number().int().nonnegative().optional(),
      status: z.enum(['active', 'disabled']).optional()
    }).parse(req.body)

    const { data, error } = await db.from('demo_skus').update(payload).eq('id', req.params.id).select('*').single()
    if (error) throw error
    res.json({ data })
  } catch (error) {
    next(error)
  }
}

export const adminDeleteSkuHandler: RequestHandler = async (req, res, next) => {
  try {
    const db = requireDb()
    const skuId = req.params.id

    const { data: sku, error: skuError } = await db
      .from('demo_skus')
      .select('*')
      .eq('id', skuId)
      .maybeSingle()

    if (skuError) throw skuError
    if (!sku) {
      res.status(404).json({ error: 'SKU 不存在' })
      return
    }

    const { count: orderItemCount, error: orderItemCountError } = await db
      .from('demo_order_items')
      .select('id', { count: 'exact', head: true })
      .eq('sku_id', skuId)

    if (orderItemCountError) throw orderItemCountError

    if ((orderItemCount ?? 0) > 0) {
      const { data, error } = await db
        .from('demo_skus')
        .update({ status: 'disabled', stock: 0 })
        .eq('id', skuId)
        .select('*')
        .single()

      if (error) throw error
      res.json({ data, deleted: false, softDeleted: true, message: 'SKU 存在历史订单，已禁用并清空库存（逻辑删除）' })
      return
    }

    const { data, error } = await db
      .from('demo_skus')
      .delete()
      .eq('id', skuId)
      .select('*')
      .maybeSingle()

    if (error) throw error
    res.json({ data, deleted: true, softDeleted: false, message: 'SKU 已删除' })
  } catch (error) {
    next(error)
  }
}

export const adminListOrdersHandler: RequestHandler = async (_req, res, next) => {
  try {
    const db = requireDb()
    const { data, error } = await db
      .from('demo_orders')
      .select('*, demo_users(*), demo_order_items(*)')
      .order('created_at', { ascending: false })
    if (error) throw error
    res.json({ data })
  } catch (error) {
    next(error)
  }
}

export const adminUpdateOrderHandler: RequestHandler = async (req, res, next) => {
  try {
    const db = requireDb()
    const payload = z.object({
      status: z.enum(['pending_payment', 'paid', 'shipped', 'completed', 'refund_requested', 'refunded', 'returned', 'cancelled']).optional(),
      remark: z.string().trim().optional()
    }).parse(req.body)

    const { data, error } = await db.from('demo_orders').update(payload).eq('id', req.params.id).select('*, demo_users(*), demo_order_items(*)').single()
    if (error) throw error
    res.json({ data })
  } catch (error) {
    next(error)
  }
}

export const adminDeleteOrderHandler: RequestHandler = async (req, res, next) => {
  try {
    const db = requireDb()

    const { data, error } = await db
      .from('demo_orders')
      .delete()
      .eq('id', req.params.id)
      .select('id, order_no')
      .maybeSingle()

    if (error) throw error
    if (!data) {
      res.status(404).json({ error: '订单不存在' })
      return
    }

    res.json({ data, deleted: true, message: '订单已删除' })
  } catch (error) {
    next(error)
  }
}
