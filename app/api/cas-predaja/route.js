import { createClient } from "@supabase/supabase-js";

const INZEROVANE = [13, 31, 34, 22];

export async function GET() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  const { data, error } = await supabase
    .from("stage_changes")
    .select("deal_id, deal_title, owner_name, from_stage, to_stage, changed_at")
    .or(
      `to_stage.in.(${INZEROVANE.join(",")}),from_stage.in.(${INZEROVANE.join(",")})`
    )
    .order("changed_at", { ascending: true });

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  // Group events by deal_id
  const dealMap = {};
  for (const row of data) {
    if (!dealMap[row.deal_id]) {
      dealMap[row.deal_id] = {
        owner_name: row.owner_name,
        deal_title: row.deal_title,
        entries: [],
        exits: [],
      };
    }
    if (INZEROVANE.includes(row.to_stage)) {
      dealMap[row.deal_id].entries.push(new Date(row.changed_at));
    }
    if (INZEROVANE.includes(row.from_stage)) {
      dealMap[row.deal_id].exits.push(new Date(row.changed_at));
    }
  }

  // Calculate duration per deal
  const now = new Date();
  const dealDurations = [];

  for (const deal of Object.values(dealMap)) {
    if (deal.entries.length === 0) continue;

    const entry = deal.entries[0];
    const exit = deal.exits.find((e) => e > entry) || null;
    const end = exit || now;
    const days = (end - entry) / (1000 * 60 * 60 * 24);

    dealDurations.push({
      owner_name: deal.owner_name,
      deal_title: deal.deal_title,
      days: Math.round(days * 10) / 10,
      completed: !!exit,
    });
  }

  // Aggregate by owner_name
  const ownerMap = {};
  for (const deal of dealDurations) {
    const name = deal.owner_name || "Neznámy";
    if (!ownerMap[name]) ownerMap[name] = [];
    ownerMap[name].push(deal.days);
  }

  const result = Object.entries(ownerMap).map(([owner_name, days]) => ({
    owner_name,
    count: days.length,
    avg: Math.round((days.reduce((a, b) => a + b, 0) / days.length) * 10) / 10,
    min: Math.round(Math.min(...days) * 10) / 10,
    max: Math.round(Math.max(...days) * 10) / 10,
  }));

  return Response.json(result);
}
