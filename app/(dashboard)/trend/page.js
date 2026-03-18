import TrendClient from "./TrendClient";
import { createClient } from '@supabase/supabase-js'

async function getData() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  )
  const { data } = await supabase
    .from('health_snapshots')
    .select('*')
    .order('snapshot_date', { ascending: true })
  return data || []
}

export const dynamic = "force-dynamic";

export default async function TrendPage() {
  const snapshots = await getData()
  return <TrendClient snapshots={snapshots} />
}