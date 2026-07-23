import cors from 'cors'
import express from 'express'
import helmet from 'helmet'
import morgan from 'morgan'
import { env } from './env.js'
import {
  adminCreateProductHandler,
  adminCreateSkuHandler,
  adminCreateUserHandler,
  adminDeleteOrderHandler,
  adminDeleteProductHandler,
  adminDeleteSkuHandler,
  adminDeleteUserHandler,
  adminListOrdersHandler,
  adminListProductsHandler,
  adminListUsersHandler,
  adminUpdateOrderHandler,
  adminUpdateProductHandler,
  adminUpdateSkuHandler,
  adminUpdateUserHandler
} from './routes/admin.js'
import { dashboardSummaryHandler } from './routes/dashboard.js'
import { healthHandler } from './routes/health.js'
import {
  createOrderHandler,
  getOrderHandler,
  listOrdersHandler,
  payOrderHandler,
  refundOrderHandler,
  remindOrderHandler
} from './routes/orders.js'
import { getProductHandler, listProductsHandler } from './routes/products.js'
import { getUserHandler, loginUserHandler, registerUserHandler } from './routes/users.js'

function parseAllowedOrigins(raw: string) {
  return raw
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean)
}

function isOriginAllowed(origin: string, allowedOrigins: string[]) {
  return allowedOrigins.some((rule) => {
    if (rule === '*') return true
    if (rule === origin) return true

    if (rule.startsWith('*.')) {
      try {
        const hostname = new URL(origin).hostname
        return hostname === rule.slice(2) || hostname.endsWith(rule.slice(1))
      } catch {
        return false
      }
    }

    return false
  })
}

export function createApp() {
  const app = express()
  const allowedOrigins = parseAllowedOrigins(env.CORS_ORIGIN)

  app.use(helmet())
  app.use(
    cors({
      credentials: true,
      origin: (origin, callback) => {
        // 非浏览器请求（例如 curl / server-to-server）没有 origin，默认放行。
        if (!origin) return callback(null, true)

        if (isOriginAllowed(origin, allowedOrigins)) {
          return callback(null, true)
        }

        return callback(new Error(`CORS blocked: ${origin}`))
      }
    })
  )
  app.use(express.json())
  app.use(morgan(env.NODE_ENV === 'production' ? 'combined' : 'dev'))

  app.get('/health', healthHandler)
  app.get('/api/dashboard', dashboardSummaryHandler)

  app.get('/api/products', listProductsHandler)
  app.get('/api/products/:id', getProductHandler)

  app.post('/api/users/register', registerUserHandler)
  app.post('/api/users/login', loginUserHandler)
  app.get('/api/users/:id', getUserHandler)

  app.get('/api/orders', listOrdersHandler)
  app.post('/api/orders', createOrderHandler)
  app.get('/api/orders/:id', getOrderHandler)
  app.post('/api/orders/:id/pay', payOrderHandler)
  app.post('/api/orders/:id/remind', remindOrderHandler)
  app.post('/api/orders/:id/refund', refundOrderHandler)

  app.get('/api/admin/users', adminListUsersHandler)
  app.post('/api/admin/users', adminCreateUserHandler)
  app.patch('/api/admin/users/:id', adminUpdateUserHandler)
  app.delete('/api/admin/users/:id', adminDeleteUserHandler)

  app.get('/api/admin/products', adminListProductsHandler)
  app.post('/api/admin/products', adminCreateProductHandler)
  app.patch('/api/admin/products/:id', adminUpdateProductHandler)
  app.delete('/api/admin/products/:id', adminDeleteProductHandler)

  app.post('/api/admin/products/:id/skus', adminCreateSkuHandler)
  app.patch('/api/admin/skus/:id', adminUpdateSkuHandler)
  app.delete('/api/admin/skus/:id', adminDeleteSkuHandler)

  app.get('/api/admin/orders', adminListOrdersHandler)
  app.patch('/api/admin/orders/:id', adminUpdateOrderHandler)
  app.delete('/api/admin/orders/:id', adminDeleteOrderHandler)

  app.use((_req, res) => {
    res.status(404).json({ error: 'Not found' })
  })

  app.use((error: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    const message = error instanceof Error ? error.message : 'Internal server error'
    res.status(500).json({ error: message })
  })

  return app
}
