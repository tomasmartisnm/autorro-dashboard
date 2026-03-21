import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

const CENA_KEY          = '880011fdbacbc3eee50103ec49001ac8abd56ae1'
const INZEROVANE_STAGES = [13, 31, 34, 22]
const EXCLUDE           = ['Development', 'Tomáš Martiš', 'Miroslav Hrehor', 'Peter Hudec', 'Jaroslav Kováč']

/**
 * Vercel Cron automaticky posiela: Authorization: Bearer <CRON_SECRET>
 * Nastav CRON_SECRET v Vercel Project Settings → Environment Variables.
 * Vercel.json cron path = "/api/snapshot" (bez tokenu v URL).
 */
function isAuthorized(request) {
  const cronSecret = process.env.CRON_SECRET
  if (!cronSecret) {
    console.warn('[snapshot] CRON_SECRET nie je nastavený!')
    return false
  }
  const authHeader = request.headers.get('authorization') || ''
  return authHeader === `Bearer ${cronSecret}`
}

export async function GET(request) {
  if (!isAuthorized(request)) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const apiToken = process.env.PIPEDRIVE_API_TOKEN
    let all = []

    for (const stageId of INZEROVANE_STAGES) {
      let start = 0
      while (true) {
        const r = await fetch(
          `https://api.pipedrive.com/v1/deals?api_token=${apiToken}` +
          `&limit=100&start=${start}&status=open&stage_id=${stageId}` +
          `&fields=id,owner_id,owner_name,${CENA_KEY}`
        )
        const data = await r.json()
        all = all.concat(data.data || [])
        if (!data.additional_data?.pagination?.more_items_in_collection) break
        start = data.additional_data.pagination.next_start
      }
    }

    // Grupuj podľa maklérov
    const brokers = {}
    all.forEach(deal => {
      const name = deal.owner_name || String(deal.owner_id)
      if (!name || EXCLUDE.includes(name)) return
      if (!brokers[name]) brokers[name] = { total: 0, ok: 0 }
      brokers[name].total++
      if (deal[CENA_KEY] == 100) brokers[name].ok++
    })

    const today = new Date().toISOString().split('T')[0]
    const rows  = Object.entries(brokers).map(([owner_name, s]) => ({
      snapshot_date: today,
      owner_name,
      total:         s.total,
      cena_ok:       s.ok,
      health_pct:    s.total > 0 ? Math.round((s.ok / s.total) * 10000) / 100 : 0,
    }))

    const { error } = await supabase
      .from('health_snapshots')
      .upsert(rows, { onConflict: 'snapshot_date,owner_name' })

    if (error) {
      console.error('[snapshot] Supabase upsert error:', error.code)
      return Response.json({ error: 'Database error' }, { status: 500 })
    }

    return Response.json({ ok: true, date: today, brokers: rows.length })
  } catch {
    return Response.json({ error: 'Internal error' }, { status: 500 })
  }
}
