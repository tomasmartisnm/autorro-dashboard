const CACHE_TTL = 10 * 60 * 1000;
let cache = { data: null, timestamp: 0 };

const ZNACKA_KEY = "c5d33ca43498a4e3e0e90dc8e1cfa3944107290d";

/* ── Normalizácia: diakritika + pomlčky → medzery ── */
function norm(s) {
  return (s || "")
    .normalize("NFD").replace(/\p{Diacritic}/gu, "")
    .replace(/[-_/]+/g, " ")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

/* ── Zoznam značiek (normalizované) ── */
const KNOWN_BRANDS = [
  "abarth","acura","alfa romeo","alpina","aston martin","audi","bentley","bmw",
  "buick","cadillac","chevrolet","chrysler","citroen","cupra","dacia","daewoo",
  "dodge","ds","ferrari","fiat","ford","gmc","honda","hummer","hyundai","infiniti",
  "isuzu","iveco","jaguar","jeep","kia","lada","lamborghini","lancia","land rover",
  "lexus","lincoln","lotus","mahindra","man","maserati","mazda","mclaren",
  "mercedes","mg","mini","mitsubishi","nissan","opel","peugeot","pontiac","porsche",
  "renault","rolls royce","rover","saab","seat","skoda","smart","ssangyong",
  "subaru","suzuki","tatra","tesla","toyota","volkswagen","volvo",
].sort((a, b) => b.length - a.length); // dlhšie zhody majú prednosť

const KNOWN_BRANDS_SET = new Set(KNOWN_BRANDS);

/* Rozviň skratky a oprav preklepy pred detekciou značky */
function expandAbbr(t) {
  return t
    // VW skratky a preklepy
    .replace(/\bvw\b/g,           "volkswagen")
    .replace(/\bwv\b/g,           "volkswagen")
    .replace(/\bvolkwagen\b/g,    "volkswagen")
    .replace(/\bvolkswagen\b/g,   "volkswagen")
    .replace(/\bvolskwagen\b/g,   "volkswagen")
    .replace(/\bwolksvagen\b/g,   "volkswagen")
    .replace(/\bvolksvagen\b/g,   "volkswagen")
    .replace(/\bwolkswagen\b/g,   "volkswagen")
    .replace(/\bvolcvagen\b/g,    "volkswagen")
    .replace(/\bvolswagen\b/g,    "volkswagen")
    .replace(/\bwolksflagen\b/g,  "volkswagen")
    .replace(/\bwolksvaden\b/g,   "volkswagen")
    // VW modely (keď titul začína modelom bez značky)
    .replace(/^(golf|passat|pasat|tiguan|touran|touareg|arteon|caddy|multivan|caravelle|scirocco|sharan|amarok|t-roc|t roc|troc|id\.?3|id\.?4|id\.?5|polo|t4|t5|transporter|crafter|phaeton)\b/, "volkswagen $1")
    // Škoda modely (keď titul začína modelom bez značky)
    .replace(/^(octavia|octavie|oktavia|superb|fabia|kodiaq|karoq|rapid|enyaq|roomster|yeti|scala)\b/, "skoda $1")
    // SEAT modely
    .replace(/^(alhambra|ateca)\b/, "seat $1")
    // Mercedes skratky a preklepy
    .replace(/\bmb\b/g,           "mercedes")
    .replace(/\bamg\b/g,          "mercedes")
    .replace(/\bmercedesbenz\b/g, "mercedes")
    .replace(/\bmerdes\b/g,       "mercedes")
    // Land Rover
    .replace(/\blandrover\b/g,    "land rover")
    .replace(/\brange rover\b/g,  "land rover")
    // Ostatné preklepy
    .replace(/\bbmv\b/g,          "bmw")
    .replace(/\bmitsubushi\b/g,   "mitsubishi")
    .replace(/\bmitsubichi\b/g,   "mitsubishi")
    .replace(/\btoyotoa\b/g,      "toyota")
    .replace(/\bnisan\b/g,        "nissan")
    .replace(/\bnissa\b/g,        "nissan")
    .replace(/\bpeugot\b/g,       "peugeot")
    .replace(/\bsuzuky\b/g,       "suzuki")
    .replace(/\bbentli\b/g,       "bentley")
    .replace(/\bhuyndai\b/g,      "hyundai")
    .replace(/\bminicooper\b/g,   "mini cooper");
}

/* Nájdi značku kdekoľvek v titule (celé slovo) */
function brandFromTitle(title) {
  const t = expandAbbr(norm(title));
  for (const b of KNOWN_BRANDS) {
    if (b.includes(" ")) {
      if (t.includes(b)) return b;
    } else {
      // Musí byť celé slovo
      if (new RegExp(`(^|\\s)${b}(\\s|$)`).test(t)) return b;
    }
  }
  return null;
}

/* ── Načítaj ID→label z Pipedrive + auto-oprav premenované možnosti ── */
async function fetchZnackaMap(token, rawDeals) {
  const res  = await fetch(
    `https://api.pipedrive.com/v1/dealFields?api_token=${token}&limit=500`,
    { cache: "no-store" }
  );
  const json = await res.json();
  const field = (json.data || []).find(f => f.key === ZNACKA_KEY);
  const map = {};
  for (const opt of (field?.options || [])) {
    map[String(opt.id)] = opt.label;
  }

  // Zoskup tituly podľa ID
  const idTitles = {};
  for (const d of rawDeals) {
    const raw = String(d[ZNACKA_KEY] || "");
    if (!raw) continue;
    if (!idTitles[raw]) idTitles[raw] = [];
    idTitles[raw].push(d.title || "");
  }

  // Pre každé ID: ak väčšina titulkov hovorí inú značku → oprav
  for (const [id, titles] of Object.entries(idTitles)) {
    if (titles.length < 4) continue;

    const counts = {};
    for (const t of titles) {
      const b = brandFromTitle(t);
      if (b) counts[b] = (counts[b] || 0) + 1;
    }
    if (!Object.keys(counts).length) continue;

    const [[topBrand, topCount]] = Object.entries(counts).sort((a, b) => b[1] - a[1]);
    const confidence = topCount / titles.length;
    if (confidence < 0.60) continue;

    const currentNorm  = norm(map[id] || "");
    const detectedNorm = norm(topBrand);
    if (currentNorm === detectedNorm) continue; // zhoda — nič nerob

    // Oprav label — pekný formát s diakritikou
    const corrected = topBrand
      .split(" ")
      .map(w => w.charAt(0).toUpperCase() + w.slice(1))
      .join(" ")
      .replace(/\bSkoda\b/, "Škoda")
      .replace(/\bCitroen\b/, "Citroën")
      .replace(/\bBmw\b/, "BMW")
      .replace(/\bMg\b/, "MG")
      .replace(/\bDs\b/, "DS")
      .replace(/\bGmc\b/, "GMC")
      .replace(/\bSsangyong\b/, "SsangYong");

    map[id] = corrected;
  }

  return map;
}

/* Normalizovaný label pre úverovú kategóriu */
const CREDIT_NORM = "auto nie je z ponuky uver";

function getZnacka(deal, znackaMap) {
  const raw   = deal[ZNACKA_KEY];
  const label = raw ? (znackaMap[String(raw)] || "Neurčená") : "Neurčená";

  // Pre úverové dealy, dealy bez značky a neznáme/premenované značky — zisti brand z titulu
  const ln = norm(label);
  const isKnownCarBrand = KNOWN_BRANDS_SET.has(ln);
  if (label === "Neurčená" || ln.startsWith("auto nie je z ponuky") || !isKnownCarBrand) {
    const detected = brandFromTitle(deal.title || "");
    if (detected) {
      return detected
        .split(" ").map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(" ")
        .replace(/\bSkoda\b/, "Škoda")
        .replace(/\bCitroen\b/, "Citroën")
        .replace(/\bBmw\b/, "BMW")
        .replace(/\bMg\b/, "MG")
        .replace(/\bDs\b/, "DS")
        .replace(/\bGmc\b/, "GMC")
        .replace(/\bSsangyong\b/, "SsangYong");
    }
    // Ak sa brand z titulu nepodarí zistiť, ponechaj pôvodný label
    return label;
  }

  return label;
}

async function fetchRawDeals(token) {
  const all = [];
  for (const status of ["open", "won", "lost"]) {
    let start = 0;
    while (true) {
      const res  = await fetch(
        `https://api.pipedrive.com/v1/deals?api_token=${token}&status=${status}&limit=500&start=${start}`,
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

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const force = searchParams.get("force") === "1";
  const now   = Date.now();

  if (!force && cache.data && now - cache.timestamp < CACHE_TTL) {
    return Response.json(cache.data, {
      headers: { "X-Cache": "HIT", "X-Cache-Age": String(Math.round((now - cache.timestamp) / 1000)) }
    });
  }

  const token     = process.env.PIPEDRIVE_API_TOKEN;
  const rawDeals  = await fetchRawDeals(token);
  const znackaMap = await fetchZnackaMap(token, rawDeals);

  // Agregácia — kľúčom je normalizovaný názov, čím sa zlúčia napr. "Škoda" + "Skoda"
  const byNorm = {};
  for (const d of rawDeals) {
    const label = getZnacka(d, znackaMap);
    const key   = norm(label);
    if (!byNorm[key]) byNorm[key] = { brand: label, open: 0, won: 0, lost: 0 };
    byNorm[key][d.status]++;
    // Preferuj label s diakritikou (obsahuje Unicode znaky navyše)
    if (label.length > byNorm[key].brand.length) byNorm[key].brand = label;
  }

  const result = Object.values(byNorm)
    .map(b => ({
      brand:   b.brand,
      open:    b.open,
      won:     b.won,
      lost:    b.lost,
      total:   b.open + b.won + b.lost,
      winRate: b.won + b.lost > 0 ? Math.round(b.won / (b.won + b.lost) * 100) : null,
    }))
    .sort((a, z) => z.total - a.total);

  cache = { data: result, timestamp: now };
  return Response.json(result, {
    headers: { "X-Cache": "MISS", "X-Fetched-At": new Date().toISOString() }
  });
}
