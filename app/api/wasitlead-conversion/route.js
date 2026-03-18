import { createClient } from "@supabase/supabase-js";

const WASITLEAD_KEY = "75d70860fca1d25d8ed8ac4c533979b62d93e1f6";
const WASITLEAD_YES = "805";
const INZEROVANE = [13, 31, 34, 22];
const CACHE_TTL = 10 * 60 * 1000;

let cache = { data: null, timestamp: 0 };

async function fetchData() {
  const apiToken = process.env.PIPEDRIVE_API_TOKEN;
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  // 1. Fetch ALL deals with wasItLead=yes (open + won + lost)
  let leadDeals = [];
  for (const status of ["open", "won", "lost"]) {
    let start = 0;
    while (true) {
      const res = await fetch(
        `https://api.pipedrive.com/v1/deals?api_token=${apiToken}&limit=500&start=${start}&status=${status}&fields=id,stage_id,status,owner_id,owner_name,${WASITLEAD_KEY}`
      );
      const json = await res.json();
      const items = (json.data || []).filter(
        d => String(d[WASITLEAD_KEY]) === WASITLEAD_YES
      );
      leadDeals = leadDeals.concat(items);
      if (!json.additional_data?.pagination?.more_items_in_collection) break;
      start = json.additional_data.pagination.next_start;
    }
  }

  const totalLeads = leadDeals.length;

  // 2. Get all deal_ids that ever entered Inzerované (from stage_changes)
  const { data: stageRows } = await supabase
    .from("stage_changes")
    .select("deal_id, owner_name")
    .in("to_stage", INZEROVANE);

  const inzerovaneDealIds = new Set((stageRows || []).map(r => r.deal_id));

  // 3. Of all lead deals, how many ever reached Inzerované?
  const converted = leadDeals.filter(d => inzerovaneDealIds.has(d.id));
  const conversionPct = totalLeads > 0 ? Math.round((converted.length / totalLeads) * 100) : 0;

  // 4. Breakdown by owner_name
  const ownerMap = {};
  for (const d of leadDeals) {
    const name = d.owner_name || "Neznámy";
    if (!ownerMap[name]) ownerMap[name] = { total: 0, converted: 0 };
    ownerMap[name].total++;
    if (inzerovaneDealIds.has(d.id)) ownerMap[name].converted++;
  }

  const byBroker = Object.entries(ownerMap).map(([name, s]) => ({
    name,
    total: s.total,
    converted: s.converted,
    pct: s.total > 0 ? Math.round((s.converted / s.total) * 100) : 0,
  })).sort((a, b) => b.pct - a.pct);

  return {
    totalLeads,
    totalConverted: converted.length,
    conversionPct,
    byBroker,
  };
}

export async function GET() {
  const now = Date.now();
  if (cache.data && now - cache.timestamp < CACHE_TTL) {
    return Response.json(cache.data);
  }
  const data = await fetchData();
  cache = { data, timestamp: now };
  return Response.json(data);
}
