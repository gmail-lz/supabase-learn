import type { RequestHandler } from 'express'
import { z } from 'zod'
import { supabaseAdmin } from '../lib/supabase.js'

const requireDb = () => {
  if (!supabaseAdmin) {
    throw new Error('Supabase service role is not configured. Set SUPABASE_SERVICE_ROLE_KEY in root .env.')
  }
  return supabaseAdmin
}

const createOrderSchema = z.object({
  userId: z.string().uuid(),
  skuId: z.string().uuid(),
  quantity: z.coerce.number().int().positive().default(1),
  paymentAction: z.enum(['pay_now', 'pay_later']).default('pay_now')
})

const orderActionSchema = z.object({
  userId: z.string().uuid()
})

function routeId(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : String(value ?? '')
}

function makeOrderNo() {
  const now = new Date()
  const stamp = now.toISOString().replace(/[-:TZ.]/g, '').slice(0, 14)
  const rand = Math.random().toString(36).slice(2, 8).toUpperCase()
  return `DEMO${stamp}${rand}`
}

async function loadOrder(db: ReturnType<typeof requireDb>, orderId: string) {
  const { data, error } = await db
    .from('demo_orders')
    .select('*, demo_users(*), demo_order_items(*)')
    .eq('id', orderId)
    .single()

  if (error) throw error
  return data
}

async function ensureOwner(db: ReturnType<typeof requireDb>, orderId: string, userId: string) {
  const order = await loadOrder(db, orderId)
  if (order.user_id !== userId) {
    throw new Error('无权操作该订单')
  }
  return order
}

export const listOrdersHandler: RequestHandler = async (req, res, next) => {
  try {
    const db = requireDb()
    const userId = String(req.query.userId ?? '')
    if (!userId) {
      res.status(401).json({ error: '请先登录后再查看订单' })
      return
    }

    const { data, error } = await db
      .from('demo_orders')
      .select('*, demo_order_items(*)')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })

    if (error) throw error
    res.json({ data })
  } catch (error) {
    next(error)
  }
}

export const getOrderHandler: RequestHandler = async (req, res, next) => {
  try {
    const db = requireDb()
    const userId = String(req.query.userId ?? '')
    if (!userId) {
      res.status(401).json({ error: '请先登录后再查看订单详情' })
      return
    }

    const order = await loadOrder(db, routeId(req.params.id))
    if (order.user_id !== userId) {
      res.status(403).json({ error: '无权访问该订单' })
      return
    }

    res.json({ data: order })
  } catch (error) {
    next(error)
  }
}

export const createOrderHandler: RequestHandler = async (req, res, next) => {
  try {
    const db = requireDb()
    const payload = createOrderSchema.parse(req.body)

    const { data: user, error: userError } = await db
      .from('demo_users')
      .select('id, nickname, status')
      .eq('id', payload.userId)
      .single()

    if (userError) throw userError
    if (!user || user.status !== 'active') {
      res.status(403).json({ error: '用户不存在或已被禁用' })
      return
    }

    const { data: sku, error: skuError } = await db
      .from('demo_skus')
      .select('*, demo_products(*)')
      .eq('id', payload.skuId)
      .eq('status', 'active')
      .single()

    if (skuError) throw skuError
    if (!sku || !sku.demo_products || sku.demo_products.status !== 'on_sale') {
      res.status(404).json({ error: '商品 SKU 不存在或已下架' })
      return
    }
    if (Number(sku.stock) < payload.quantity) {
      res.status(400).json({ error: '库存不足' })
      return
    }

    const { data: pendingOrders, error: pendingError } = await db
      .from('demo_orders')
      .select('*, demo_order_items(*)')
      .eq('user_id', payload.userId)
      .eq('status', 'pending_payment')
      .order('created_at', { ascending: false })

    if (pendingError) throw pendingError
    const pending = (pendingOrders ?? []).find((order: any) =>
      (order.demo_order_items ?? []).some((item: any) => item.sku_id === payload.skuId)
    )

    if (pending) {
      if (payload.paymentAction === 'pay_now') {
        const { error: payError } = await db
          .from('demo_orders')
          .update({ status: 'paid', paid_at: new Date().toISOString(), remark: '复用待付款订单并完成付款' })
          .eq('id', pending.id)
        if (payError) throw payError
        res.json({ data: await loadOrder(db, pending.id), reusedPending: true, paid: true })
        return
      }

      res.json({ data: pending, reusedPending: true, paid: false })
      return
    }

    const price = Number(sku.price)
    const amount = Number((price * payload.quantity).toFixed(2))
    const status = payload.paymentAction === 'pay_now' ? 'paid' : 'pending_payment'

    const { data: updatedStock, error: stockError } = await db
      .from('demo_skus')
      .update({ stock: Number(sku.stock) - payload.quantity })
      .eq('id', payload.skuId)
      .gte('stock', payload.quantity)
      .select('id, stock')
      .single()

    if (stockError) throw stockError
    if (!updatedStock) {
      res.status(400).json({ error: '库存不足，请刷新后重试' })
      return
    }

    const { data: order, error: orderError } = await db
      .from('demo_orders')
      .insert({
        order_no: makeOrderNo(),
        user_id: payload.userId,
        status,
        total_amount: amount,
        receiver_name: user.nickname || 'Demo 用户',
        receiver_phone: '13800000000',
        receiver_address: 'Demo 省 Demo 市 100 号',
        remark: status === 'paid' ? '模拟支付成功' : '用户选择稍后付款，等待继续支付',
        paid_at: status === 'paid' ? new Date().toISOString() : null
      })
      .select('*')
      .single()

    if (orderError) throw orderError

    const { error: itemError } = await db.from('demo_order_items').insert({
      order_id: order.id,
      product_id: sku.product_id,
      sku_id: sku.id,
      product_title: sku.demo_products.title,
      sku_name: sku.sku_name,
      price,
      quantity: payload.quantity,
      amount
    })

    if (itemError) throw itemError
    res.status(201).json({ data: await loadOrder(db, order.id), reusedPending: false, paid: status === 'paid' })
  } catch (error) {
    next(error)
  }
}

export const payOrderHandler: RequestHandler = async (req, res, next) => {
  try {
    const db = requireDb()
    const { userId } = orderActionSchema.parse(req.body)
    const id = routeId(req.params.id)

    const order = await ensureOwner(db, id, userId)
    if (order.status !== 'pending_payment') {
      res.status(400).json({ error: '当前订单状态不可支付' })
      return
    }

    const { error } = await db
      .from('demo_orders')
      .update({ status: 'paid', paid_at: new Date().toISOString(), remark: '模拟支付成功' })
      .eq('id', id)
    if (error) throw error
    res.json({ data: await loadOrder(db, id) })
  } catch (error) {
    next(error)
  }
}

export const remindOrderHandler: RequestHandler = async (req, res, next) => {
  try {
    const db = requireDb()
    const { userId } = orderActionSchema.parse(req.body)
    const id = routeId(req.params.id)
    await ensureOwner(db, id, userId)
    const order = await loadOrder(db, id)
    res.json({ data: order, message: '已提醒商家尽快发货' })
  } catch (error) {
    next(error)
  }
}

export const refundOrderHandler: RequestHandler = async (req, res, next) => {
  try {
    const db = requireDb()
    const { userId } = orderActionSchema.parse(req.body)
    const id = routeId(req.params.id)

    const order = await ensureOwner(db, id, userId)
    if (!['paid', 'shipped', 'completed'].includes(order.status)) {
      res.status(400).json({ error: '当前订单状态不可申请退款' })
      return
    }

    const { error } = await db
      .from('demo_orders')
      .update({ status: 'refund_requested', remark: '用户提交退款申请' })
      .eq('id', id)
    if (error) throw error
    res.json({ data: await loadOrder(db, id), message: '退款申请已提交' })
  } catch (error) {
    next(error)
  }
}
