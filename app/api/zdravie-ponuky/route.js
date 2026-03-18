const INZEROVANE_STAGES = [13, 31, 34, 22];
const CACHE_TTL = 10 * 60 * 1000; // 10 minút

let cache = { data: null, timestamp: 0 };

async function fetchAllDeals() {
  const apiToken = process.env.PIPEDRIVE_API_TOKEN;
  let all = [];

  for (const stageId of INZEROVANE_STAGES) {
    let start = 0;
    while (true) {
      const response = await fetch(
        `https://api.pipedrive.com/v1/deals?api_token=${apiToken}&limit=100&start=${start}&status=open&stage_id=${stageId}&fields=id,title,owner_id,stage_id,value,currency,status,880011fdbacbc3eee50103ec49001ac8abd56ae1`
      );
      const data = await response.json();
      all = all.concat(data.data || []);
      const more = data.additional_data?.pagination?.more_items_in_collection;
      if (!more) break;
      start = data.additional_data.pagination.next_start;
    }
  }
  return all;
}

export async function GET() {
  const now = Date.now();
  if (cache.data && now - cache.timestamp < CACHE_TTL) {
    return Response.json(cache.data, {
      headers: { "X-Cache": "HIT", "Cache-Control": "public, max-age=600" },
    });
  }

  const data = await fetchAllDeals();
  cache = { data, timestamp: now };

  return Response.json(data, {
    headers: { "X-Cache": "MISS", "Cache-Control": "public, max-age=600" },
  });
}
