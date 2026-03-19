import { createClient } from "@supabase/supabase-js";

const CACHE_TTL = 5 * 60 * 1000; // 5 min
let cache = { data: null, timestamp: 0 };

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const force = searchParams.get("force") === "1";
  const now   = Date.now();

  if (!force && cache.data && now - cache.timestamp < CACHE_TTL) {
    return Response.json(cache.data, { headers: { "X-Cache": "HIT" } });
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  const { data, error } = await supabase
    .from("stage_changes")
    .select("*")
    .order("changed_at", { ascending: false });

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  cache = { data: data || [], timestamp: now };
  return Response.json(data || [], { headers: { "X-Cache": "MISS" } });
}
