import type { RequestHandler } from 'express'
import { supabaseAdmin } from '../lib/supabase.js'

const requireDb = () => {
  if (!supabaseAdmin) {
    throw new Error('Supabase service role is not configured. Set SUPABASE_SERVICE_ROLE_KEY in root .env.')
  }
  return supabaseAdmin
}

interface OrderLite {
  id: string
  order_no: string
  status: string
  total_amount: number | string
  created_at: string
  demo_users?: { nickname?: string } | null
  demo_order_items?: { product_title?: string }[]
}

export const dashboardSummaryHandler: RequestHandler = async (_req, res, next) => {
  try {
    const db = requireDb()

    const [productCountRes, userCountRes, orderRes, featuredRes] = await Promise.all([
      db.from('demo_products').select('id', { count: 'exact', head: true }).eq('status', 'on_sale'),
      db.from('demo_users').select('id', { count: 'exact', head: true }),
      db
        .from('demo_orders')
        .select('id, order_no, status, total_amount, created_at, demo_users(nickname), demo_order_items(product_title)')
        .order('created_at', { ascending: false })
        .limit(20),
      db
        .from('demo_products')
        .select('id, title, subtitle, cover_url, demo_skus(price, status)')
        .eq('status', 'on_sale')
        .order('sort_order', { ascending: true })
        .limit(6)
    ])

    if (productCountRes.error) throw productCountRes.error
    if (userCountRes.error) throw userCountRes.error
    if (orderRes.error) throw orderRes.error
    if (featuredRes.error) throw featuredRes.error

    const latestOrders = (orderRes.data ?? []) as OrderLite[]
    const statusStats = latestOrders.reduce<Record<string, number>>((acc, order) => {
      acc[order.status] = (acc[order.status] ?? 0) + 1
      return acc
    }, {})

    const featuredProducts = (featuredRes.data ?? []).map((product: any) => {
      const activePrices = (product.demo_skus ?? [])
        .filter((sku: any) => sku.status === 'active')
        .map((sku: any) => Number(sku.price))
      const minPrice = activePrices.length ? Math.min(...activePrices) : 0
      return {
        id: product.id,
        title: product.title,
        subtitle: product.subtitle,
        cover_url: product.cover_url,
        minPrice
      }
    })

    res.json({
      data: {
        stats: {
          onSaleProducts: productCountRes.count ?? 0,
          users: userCountRes.count ?? 0,
          orders: latestOrders.length,
          pendingPayment: statusStats.pending_payment ?? 0,
          paid: statusStats.paid ?? 0,
          refunded: (statusStats.refund_requested ?? 0) + (statusStats.refunded ?? 0) + (statusStats.returned ?? 0)
        },
        latestOrders: latestOrders.slice(0, 8),
        featuredProducts
      }
    })
  } catch (error) {
    next(error)
  }
}
