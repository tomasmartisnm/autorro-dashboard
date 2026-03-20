const CACHE_TTL = 10 * 60 * 1000;
let cache = { data: null, timestamp: 0 };

/* ── Značka field key ── */
const ZNACKA_KEY = "c5d33ca43498a4e3e0e90dc8e1cfa3944107290d";

/* ── Enum ID → label mapa (z Pipedrive dealFields) ── */
const ZNACKA_MAP = {
  120:"Abarth",121:"Acura",205:"ADRIA",122:"Alfa Romeo",123:"Alpina",
  199:"Aprilia",124:"Aro",125:"Aston Martin",126:"Audi",127:"Austin",
  128:"Avia",129:"Bentley",222:"BRP",130:"BMW",131:"Bugatti",132:"Buic",
  133:"Cadillac",207:"Case",134:"Chevrolet",976:"Cheval Liberte",135:"Chrysler",
  136:"Citroen",137:"Cupra",138:"Daewoo",972:"Dacia",139:"Daf",140:"Daihatsu",
  141:"Dodge",211:"DONG FENG",142:"DS",143:"Ferrari",144:"Fiat",145:"Fisker",
  146:"Ford",147:"Gaz",148:"GMC",200:"Harley Davidson",996:"Hobby",149:"Honda",
  216:"Humbaur",150:"Hummer",151:"Hyundai",217:"Indian Motorcycle",152:"Infiniti",
  153:"Isuzu",154:"Iveco",155:"Jaguar",201:"JAWA PERAK",214:"JCB",156:"Jeep",
  208:"JPM Trailers",157:"K1",158:"Kaipan",218:"Karosa",215:"Kawasaki",159:"Kia",
  202:"Kingway minihydraulic",209:"Komatsu",973:"KTM",160:"Lada",161:"Lamborghini",
  162:"Lancia",163:"Land Rover",164:"Lexus",165:"Lincoln",220:"LMC",166:"Lotus",
  212:"MAC Trailers",167:"Mahindra",168:"MAN",204:"MAN-TEC",169:"Maserati",
  170:"Mazda",171:"McLaren",172:"Mercedes",173:"MG",174:"Mini",175:"Mitsubishi",
  176:"Nissan",177:"Opel",178:"Peugeot",213:"Piaggio",995:"Polestar",179:"Pontiac",
  180:"Porsche",181:"Renault",182:"Rolls-Royce",183:"Rover",983:"Royal Enfield",
  184:"Saap",185:"Seat",186:"Škoda",187:"Smart",188:"SsangYong",189:"Subaru",
  190:"Suzuki",191:"Tatra",203:"TEMARED",192:"Tesla",193:"Toyota",194:"Trabant",
  219:"Unikol",195:"Volga",196:"Volkswagen",197:"Volvo",221:"Yamaha",
  206:"ZHIDOU",198:"Auto nie je z ponuky - úver",
};

function getZnacka(deal) {
  const raw = deal[ZNACKA_KEY];
  if (!raw) return "Neurčená";
  // Pipedrive vráti ID ako číslo alebo string
  const id = Number(raw);
  return ZNACKA_MAP[id] || String(raw);
}

async function fetchAllDeals() {
  const token = process.env.PIPEDRIVE_API_TOKEN;
  const statuses = ["open", "won", "lost"];
  const all = [];

  for (const status of statuses) {
    let start = 0;
    while (true) {
      const res  = await fetch(
        `https://api.pipedrive.com/v1/deals?api_token=${token}&status=${status}&limit=500&start=${start}`,
        { cache: "no-store" }
      );
      const json = await res.json();
      const rows = (json.data || []).map(d => ({
        id:      d.id,
        title:   d.title || "",
        status:  d.status,
        owner:   d.owner_id?.name || "",
        znacka:  getZnacka(d),
        addTime: d.add_time || null,
        wonTime: d.won_time || null,
      }));
      all.push(...rows);
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

  const deals = await fetchAllDeals();

  const byBrand = {};
  for (const d of deals) {
    const z = d.znacka;
    if (!byBrand[z]) byBrand[z] = { brand:z, open:0, won:0, lost:0 };
    byBrand[z][d.status]++;
  }

  const result = Object.values(byBrand)
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
