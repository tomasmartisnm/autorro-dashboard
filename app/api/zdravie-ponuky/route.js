const INZEROVANE_STAGES = [13, 31, 34, 22];
const CACHE_TTL = 10 * 60 * 1000;

let cache = { data: null, timestamp: 0 };

const FIELDS = [
  "id", "title", "owner_id", "owner_name", "stage_id", "value", "currency",
  "status", "add_time",
  "880011fdbacbc3eee50103ec49001ac8abd56ae1", // Cena je OK
  "b4d54b0e06789b713abe1062178c19490259e00a", // Odporúčaná cena - AUTORRO
  "7bc01b48cc10642c58f19ce14bb33fe8abb7bb97", // Cena vozidla
].join(",");

async function fetchAllDeals() {
  const apiToken = process.env.PIPEDRIVE_API_TOKEN;
  let all = [];

  for (const stageId of INZEROVANE_STAGES) {
    let start = 0;
    while (true) {
      const response = await fetch(
        `https://api.pipedrive.com/v1/deals?api_token=${apiToken}&limit=100&start=${start}&status=open&stage_id=${stageId}&fields=${FIELDS}`
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

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const force = searchParams.get("force") === "1";
  const now = Date.now();

  if (!force && cache.data && now - cache.timestamp < CACHE_TTL) {
    return Response.json(cache.data, {
      headers: { "X-Cache": "HIT", "Cache-Control": "public, max-age=600" },
    });
  }

  const data = await fetchAllDeals();
  cache = { data, timestamp: now };

  return Response.json(data, {
    headers: { "X-Cache": "MISS", "Cache-Control": "no-store" },
  });
}
