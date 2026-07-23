import { useRuntimeConfig } from 'nuxt/app'

export function useApiBase() {
  const config = useRuntimeConfig()
  const base = (config.public.apiBase || '').trim()

  return base.endsWith('/') ? base.slice(0, -1) : base
}
