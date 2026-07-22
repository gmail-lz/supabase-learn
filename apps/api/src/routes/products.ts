import type { RequestHandler } from 'express'
import { supabaseAdmin } from '../lib/supabase.js'

const requireDb = () => {
  if (!supabaseAdmin) {
    throw new Error('Supabase service role is not configured. Set SUPABASE_SERVICE_ROLE_KEY in root .env.')
  }
  return supabaseAdmin
}

export const listProductsHandler: RequestHandler = async (_req, res, next) => {
  try {
    const db = requireDb()
    const { data, error } = await db
      .from('demo_products')
      .select('*, demo_skus(*)')
      .eq('status', 'on_sale')
      .order('sort_order', { ascending: true })

    if (error) throw error

    const products = (data ?? []).map((product: any) => {
      const skus = (product.demo_skus ?? []).filter((sku: any) => sku.status === 'active')
      const minPrice = skus.length ? Math.min(...skus.map((sku: any) => Number(sku.price))) : 0
      return { ...product, skus, minPrice }
    })

    res.json({ data: products })
  } catch (error) {
    next(error)
  }
}

export const getProductHandler: RequestHandler = async (req, res, next) => {
  try {
    const db = requireDb()
    const { data, error } = await db
      .from('demo_products')
      .select('*, demo_skus(*)')
      .eq('id', req.params.id)
      .single()

    if (error) throw error
    const skus = (data.demo_skus ?? []).filter((sku: any) => sku.status === 'active')
    res.json({ data: { ...data, skus } })
  } catch (error) {
    next(error)
  }
}
