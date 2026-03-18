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

  // 1. Fetch all deals with wasItLead=yes (open + won + lost)
  const allLeadDeals = [];
  for (const status of ["open", "won", "lost"]) {
    let start = 0;
    while (true) {
      const res = await fetch(
        `https://api.pipedrive.com/v1/deals?api_token=${apiToken}&limit=500&start=${start}&status=${status}&fields=id,title,stage_id,status,owner_id,owner_name,${WASITLEAD_KEY}`
      );
      const json = await res.json();
      const items = (json.data || []).filter(
        d => String(d[WASITLEAD_KEY]) === WASITLEAD_YES
      );
      for (const d of items) {
        allLeadDeals.push({
          id: d.id,
          owner_name: d.owner_name || "Neznámy",
          status: d.status, // "open", "won", "lost"
          stage_id: d.stage_id,
        });
      }
      if (!json.additional_data?.pagination?.more_items_in_collection) break;
      start = json.additional_data.pagination.next_start;
    }
  }

  // 2. Get all deal_ids that ever entered Inzerované (from stage_changes)
  const { data: stageRows } = await supabase
    .from("stage_changes")
    .select("deal_id")
    .in("to_stage", INZEROVANE);

  const inzerovaneDealIds = new Set((stageRows || []).map(r => r.deal_id));

  // 3. Aggregate per broker
  const ownerMap = {};
  for (const d of allLeadDeals) {
    const name = d.owner_name;
    if (!ownerMap[name]) ownerMap[name] = { total: 0, inzerovane: 0, won: 0, lost: 0 };
    ownerMap[name].total++;

    const reachedInzerovane = inzerovaneDealIds.has(d.id);
    if (reachedInzerovane) {
      ownerMap[name].inzerovane++;
      if (d.status === "won") ownerMap[name].won++;
      if (d.status === "lost") ownerMap[name].lost++;
    }
  }

  const byBroker = Object.entries(ownerMap).map(([name, s]) => ({
    name,
    total: s.total,
    inzerovane: s.inzerovane,
    won: s.won,
    lost: s.lost,
    pct: s.total > 0 ? Math.round((s.inzerovane / s.total) * 100) : 0,
  })).sort((a, b) => b.pct - a.pct);

  // 4. Overall totals
  const totalLeads = allLeadDeals.length;
  const totalInzerovane = allLeadDeals.filter(d => inzerovaneDealIds.has(d.id)).length;
  const totalWon = allLeadDeals.filter(d => inzerovaneDealIds.has(d.id) && d.status === "won").length;
  const totalLost = allLeadDeals.filter(d => inzerovaneDealIds.has(d.id) && d.status === "lost").length;

  return {
    totalLeads,
    totalInzerovane,
    totalWon,
    totalLost,
    conversionPct: totalLeads > 0 ? Math.round((totalInzerovane / totalLeads) * 100) : 0,
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
