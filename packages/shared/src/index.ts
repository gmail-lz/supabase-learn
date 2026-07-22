export type Todo = {
  id: string
  title: string
  is_complete: boolean
  created_at: string
}

export type ApiHealth = {
  ok: boolean
  service: string
  supabase: {
    configured: boolean
  }
  timestamp: string
}
