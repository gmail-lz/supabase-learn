import { useRuntimeConfig } from 'nuxt/app'

export function useApiBase() {
  const config = useRuntimeConfig()
  return config.public.apiBase
}
