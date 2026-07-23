// https://nuxt.com/docs/api/configuration/nuxt-config
const isDev = process.env.NODE_ENV !== 'production'

export default defineNuxtConfig({
  compatibilityDate: '2026-07-21',
  srcDir: 'apps/web',
  css: ['~/assets/css/main.css'],
  devtools: { enabled: true },
  runtimeConfig: {
    public: {
      // Dev 默认走本地 API；生产默认走同域 /api（即空 base + '/api/*' 路径）。
      apiBase: process.env.NUXT_PUBLIC_API_BASE || (isDev ? 'http://localhost:4000' : '')
    }
  },
  typescript: {
    typeCheck: false,
    strict: true
  }
})
