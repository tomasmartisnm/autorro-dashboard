import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

export async function POST(request) {
  try {
    const body = await request.json()
    
    console.log('Webhook body:', JSON.stringify(body).substring(0, 500))
    
    const event = body.event
    const current = body.current
    const previous = body.previous
    
    console.log('Event:', event)
    console.log('From stage:', previous?.stage_id)
    console.log('To stage:', current?.stage_id)
    
    if (event !== 'updated.deal') return Response.json({ ok: true })
    if (!previous || current?.stage_id === previous?.stage_id) {
      return Response.json({ ok: true })
    }
    
    const { error } = await supabase.from('stage_changes').insert({
      deal_id: current.id,
      deal_title: current.title,
      owner_name: current.owner_name,
      owner_id: current.user_id,
      from_stage: previous.stage_id,
      to_stage: current.stage_id,
      changed_at: new Date().toISOString()
    })
    
    if (error) console.log('Supabase error:', error.message)
    
    return Response.json({ ok: true })
  } catch (err) {
    console.log('Error:', err.message)
    return Response.json({ error: err.message }, { status: 500 })
  }
}