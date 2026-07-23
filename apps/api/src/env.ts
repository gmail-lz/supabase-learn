import { resolve } from 'node:path'
import { config } from 'dotenv'
import { z } from 'zod'

config({ path: resolve(process.cwd(), '.env') })

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(4000),
  // 允许多个域名，逗号分隔；支持 *.vercel.app 通配。
  CORS_ORIGIN: z.string().default('http://localhost:3000,*.vercel.app'),
  SUPABASE_URL: z.string().url().optional(),
  SUPABASE_ANON_KEY: z.string().optional(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().optional()
})

export const env = envSchema.parse(process.env)
