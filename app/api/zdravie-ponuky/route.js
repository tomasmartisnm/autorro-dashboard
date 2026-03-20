const INZEROVANE_STAGES = [13, 31, 34, 22];
const CACHE_TTL = 10 * 60 * 1000;
let cache = { data: null, timestamp: 0 };

const ZNACKA_KEY    = "c5d33ca43498a4e3e0e90dc8e1cfa3944107290d";
const ODPORUCANA_KEY = "b4d54b0e06789b713abe1062178c19490259e00a"; // Odporúčaná cena - AUTORRO
const CENA_KEY       = "7bc01b48cc10642c58f19ce14bb33fe8abb7bb97"; // Cena vozidla

const TOP5 = new Set(["skoda", "volkswagen", "bmw", "audi", "mercedes"]);

function norm(s) {
  return (s || "").normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase().trim();
}

/* ── Dynamicky nájdi kľúče pre km / rok / palivo + decode mapy ── */
async function fetchFieldMeta(token) {
  const res  = await fetch(
    `https://api.pipedrive.com/v1/dealFields?api_token=${token}&limit=500`,
    { cache: "no-store" }
  );
  const json = await res.json();
  const fields = json.data || [];

  const meta = {
    kmKey: null, rokKey: null, palivoKey: null,
    znackaOptions: {}, palivoOptions: {},
  };

  for (const f of fields) {
    const label = norm(f.name || "");

    if (["kilometre", "km", "najazdene km", "najazdene kilometre"].includes(label)) {
      meta.kmKey = f.key;
    } else if (["1. evidencia", "1 evidencia", "rok vyroby", "rocnik"].includes(label)) {
      meta.rokKey = f.key;
    } else if (["palivo", "typ paliva"].includes(label)) {
      meta.palivoKey = f.key;
      for (const opt of (f.options || [])) {
        meta.palivoOptions[String(opt.id)] = opt.label;
      }
    } else if (f.key === ZNACKA_KEY) {
      for (const opt of (f.options || [])) {
        meta.znackaOptions[String(opt.id)] = opt.label;
      }
    }
  }
  return meta;
}

/* ── Stiahni všetky open dealy v inzerovaných stagoch ── */
async function fetchDeals(token, meta) {
  const extraKeys = [meta.kmKey, meta.rokKey, meta.palivoKey, ZNACKA_KEY, CENA_KEY, ODPORUCANA_KEY]
    .filter(Boolean);
  const fields = ["id", "title", "owner_id", "owner_name", "stage_id", "value", "currency", "add_time",
    ...extraKeys].join(",");

  const all = [];
  for (const stageId of INZEROVANE_STAGES) {
    let start = 0;
    while (true) {
      const res  = await fetch(
        `https://api.pipedrive.com/v1/deals?api_token=${token}&limit=100&start=${start}&status=open&stage_id=${stageId}&fields=${fields}`,
        { cache: "no-store" }
      );
      const json = await res.json();
      all.push(...(json.data || []));
      if (!json.additional_data?.pagination?.more_items_in_collection) break;
      start = json.additional_data.pagination.next_start;
    }
  }
  return all;
}

/* ── Scoring ── */
function scorePrice(cenaVozidla, odporucana) {
  if (!cenaVozidla || !odporucana || odporucana <= 0)
    return { score: 0, label: "N/A", level: "na" };
  const pct = ((cenaVozidla - odporucana) / odporucana) * 100;
  if (pct <= 0)  return { score: 2,  label: "OK / nižšia",       level: "ok"   };
  if (pct <= 10) return { score: 0,  label: `+${pct.toFixed(1)}% vs trh`, level: "warn" };
                 return { score: -2, label: `+${pct.toFixed(1)}% vs trh`, level: "bad"  };
}

function scoreBrand(brand) {
  const isTop5 = TOP5.has(norm(brand || ""));
  return { score: isTop5 ? 1 : 0, label: brand || "Neurčená", level: isTop5 ? "ok" : "neutral", isTop5 };
}

function scoreDays(addTime) {
  if (!addTime) return { score: 0, days: 0, label: "N/A", level: "na" };
  const days = Math.floor((Date.now() - new Date(addTime)) / 864e5);
  if (days < 45)  return { score: 1,  days, label: `${days} dní`, level: "ok"   };
  if (days <= 90) return { score: -1, days, label: `${days} dní`, level: "warn" };
                  return { score: -2, days, label: `${days} dní`, level: "bad"  };
}

function scoreAge(rokRaw) {
  if (!rokRaw && rokRaw !== 0) return { score: 0, label: "N/A", level: "na" };
  let year;
  if (typeof rokRaw === "number" && rokRaw > 1900) {
    year = rokRaw;
  } else {
    const m = String(rokRaw).match(/\b(19|20)\d{2}\b/);
    year = m ? parseInt(m[0]) : null;
  }
  if (!year) return { score: 0, label: String(rokRaw), level: "na" };
  const age = new Date().getFullYear() - year;
  if (age <= 10) return { score: 1,  label: `${year} (${age}r)`, level: "ok"   };
  if (age <= 15) return { score: 0,  label: `${year} (${age}r)`, level: "warn" };
                 return { score: -1, label: `${year} (${age}r)`, level: "bad"  };
}

function scoreKm(kmRaw) {
  if (!kmRaw && kmRaw !== 0) return { score: 0, label: "N/A", level: "na" };
  const km = Number(kmRaw);
  if (isNaN(km)) return { score: 0, label: "N/A", level: "na" };
  const label = km >= 1000 ? `${Math.round(km / 1000)}k km` : `${km} km`;
  if (km < 100_000)  return { score: 1,  label, level: "ok"      };
  if (km < 200_000)  return { score: 0,  label, level: "neutral"  };
  if (km < 250_000)  return { score: -1, label, level: "warn"     };
                     return { score: -2, label, level: "bad"      };
}

function scoreFuel(fuelLabel) {
  // Informačný parameter — bez vplyvu na skóre
  if (!fuelLabel) return { label: "N/A", level: "na" };
  return { label: fuelLabel, level: "info" };
}

function getHealth(score) {
  if (score >= 3)  return { label: "Výborné",       level: "excellent" };
  if (score >= 1)  return { label: "Dobré",          level: "good"      };
  if (score >= -1) return { label: "Priemerné",      level: "average"   };
                   return { label: "Problematické",  level: "poor"      };
}

/* ── GET ── */
export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const force = searchParams.get("force") === "1";
  const now   = Date.now();

  if (!force && cache.data && now - cache.timestamp < CACHE_TTL) {
    return Response.json(cache.data, { headers: { "X-Cache": "HIT" } });
  }

  const token = process.env.PIPEDRIVE_API_TOKEN;
  const meta  = await fetchFieldMeta(token);
  const deals = await fetchDeals(token, meta);

  const result = deals.map(d => {
    const cenaVozidla = Number(d[CENA_KEY])     || Number(d.value) || null;
    const odporucana  = Number(d[ODPORUCANA_KEY]) || null;
    const kmRaw       = meta.kmKey     ? d[meta.kmKey]     : null;
    const rokRaw      = meta.rokKey    ? d[meta.rokKey]    : null;
    const palivoId    = meta.palivoKey ? String(d[meta.palivoKey] || "") : "";
    const palivoLabel = palivoId ? (meta.palivoOptions[palivoId] || null) : null;
    const znackaRaw   = d[ZNACKA_KEY];
    const brand       = znackaRaw ? (meta.znackaOptions[String(znackaRaw)] || "Neurčená") : "Neurčená";

    const sPrice = scorePrice(cenaVozidla, odporucana);
    const sBrand = scoreBrand(brand);
    const sDays  = scoreDays(d.add_time);
    const sAge   = scoreAge(rokRaw);
    const sKm    = scoreKm(kmRaw);
    const sFuel  = scoreFuel(palivoLabel);

    const totalScore = sPrice.score + sBrand.score + sDays.score + sAge.score + sKm.score;

    return {
      id:       d.id,
      title:    d.title,
      owner:    d.owner_id?.name || d.owner_name || "",
      addTime:  d.add_time,
      value:    cenaVozidla,
      currency: d.currency || "EUR",
      brand,
      scores: { price: sPrice, brand: sBrand, days: sDays, age: sAge, km: sKm, fuel: sFuel },
      totalScore,
      health: getHealth(totalScore),
    };
  }).sort((a, b) => a.totalScore - b.totalScore); // najhoršie prvé

  cache = { data: result, timestamp: now };
  return Response.json(result, { headers: { "X-Cache": "MISS" } });
}
