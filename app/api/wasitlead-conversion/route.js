const WASITLEAD_KEY = "75d70860fca1d25d8ed8ac4c533979b62d93e1f6";
const WASITLEAD_YES = "805";
const INZEROVANE = new Set([13, 31, 34, 22]);
const CACHE_TTL = 10 * 60 * 1000;

let cache = { data: null, timestamp: 0 };

async function fetchAllPages(apiToken, status) {
  const deals = [];
  let start = 0;
  while (true) {
    const res = await fetch(
      `https://api.pipedrive.com/v1/deals?api_token=${apiToken}&limit=500&start=${start}&status=${status}&fields=id,title,stage_id,status,owner_id,add_time,${WASITLEAD_KEY}`
    );
    const json = await res.json();
    const items = json.data || [];
    for (const d of items) {
      if (String(d[WASITLEAD_KEY]) !== WASITLEAD_YES) continue;
      const ownerName = d.owner_id?.name || d.owner_name || "Neznámy";
      deals.push({
        id: d.id,
        owner_name: ownerName,
        status: d.status,
        stage_id: d.stage_id,
        add_time: d.add_time, // "2024-03-15 10:30:00"
      });
    }
    if (!json.additional_data?.pagination?.more_items_in_collection) break;
    start = json.additional_data.pagination.next_start;
  }
  return deals;
}

async function fetchData() {
  const apiToken = process.env.PIPEDRIVE_API_TOKEN;

  // Fetch wasItLead=yes deals for all statuses in parallel
  const [openDeals, wonDeals, lostDeals] = await Promise.all([
    fetchAllPages(apiToken, "open"),
    fetchAllPages(apiToken, "won"),
    fetchAllPages(apiToken, "lost"),
  ]);

  const allDeals = [...openDeals, ...wonDeals, ...lostDeals];

  // A deal "reached Inzerované" if:
  // 1. It is currently open and its current stage is one of the Inzerované stages, OR
  // 2. It was won (it must have been listed to be sold), OR
  // 3. It is lost but its last known stage was Inzerované
  function reachedInzerovane(d) {
    if (d.status === "won") return true;
    if (INZEROVANE.has(d.stage_id)) return true;
    return false;
  }

  // Return raw deals — client does filtering & aggregation
  return { deals: allDeals };
}

export async function GET() {
  const now = Date.now();
  if (cache.data && now - cache.timestamp < CACHE_TTL) {
    return Response.json(cache.data, { headers: { "X-Cache": "HIT" } });
  }
  const data = await fetchData();
  cache = { data, timestamp: now };
  return Response.json(data, { headers: { "X-Cache": "MISS" } });
}
