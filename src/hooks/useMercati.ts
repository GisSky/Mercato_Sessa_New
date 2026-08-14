import { useCallback, useEffect, useState } from 'react'
import { supabase, isSupabaseConfigured } from '../lib/supabaseClient'
import type { Mercato } from '../types'

export function useMercati() {
  const [mercati, setMercati] = useState<Mercato[]>([])
  const [loading, setLoading] = useState(true)

  const reload = useCallback(async () => {
    if (!isSupabaseConfigured) {
      setLoading(false)
      return
    }
    setLoading(true)
    const { data } = await supabase.from('mercati').select('*').order('nome')
    setMercati((data as Mercato[]) ?? [])
    setLoading(false)
  }, [])

  useEffect(() => {
    reload()
  }, [reload])

  async function creaMercato(nome: string): Promise<Mercato | null> {
    const { data, error } = await supabase.from('mercati').insert({ nome }).select().single()
    if (error || !data) return null
    await reload()
    return data as Mercato
  }

  return { mercati, loading, reload, creaMercato }
}
