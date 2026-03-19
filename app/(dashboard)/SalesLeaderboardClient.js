"use client";
import { useEffect, useState } from "react";

/* ── Kancelárie ── */
const OFFICES = {
  "Všetky": null,
  "BB": ["Dominika Kompaniková","Dominka Kompaníková","Milan Kováč","Andrej Čík","Tomáš Urbán","Tomás Urban","Dávid Juhaniak","David Juhaniak"],
  "TT": ["Bálint Forró","Bálint Forro","Tomáš Opálek","Karolína Lisická","Martin Blažek","Lukáš Krommel"],
  "NR": ["Martin Petráš","Dávid Kalužák","David Kalužák","Daniel Kádek","Gabriela Šodorová","Dávid Čintala"],
  "BA": ["Milan Švorc","Ján Mikuš","Richard Kiss","Karin Harvan","Matej Hromada","Milan Pulc","Martin Bošeľa","Peter Maťo","Jonathán Pavelka","Matej Klačko","Dominik Ďurčo"],
  "TN": ["Libor Koníček","Tomáš Otrubný","Peter Mjartan","Martin Mečiar","Ján Skovajsa","Tomáš Kučerka","Patrik Frič"],
  "ZA": ["Tomáš Smieško","Daniel Jašek","Vladko Hess","Wlodzimierz Hess","Irena Varadová","Matej Gažo","Veronika Maťková","Tomáš Ďurana"],
  "PP": ["Sebastián Čuban","Tomáš Matta"],
  "KE": ["Ján Tej","Adrián Šomšág","Viliam Baran","Jaroslav Hažlinský","Martin Živčák","Ján Slivka"],
};
const EXCLUDE = ["Development","Tomáš Martiš","Miroslav Hrehor","Peter Hudec","Jaroslav Kováč"];

// Kurzy prepočtu na EUR (pevný kurz — aktualizuj podľa potreby)
const FX = { EUR: 1, CZK: 1 / 25.5 };

function toEur(value, currency) {
  const rate = FX[currency] ?? 1;
  return value * rate;
}

function norm(s) {
  return (s || "").normalize("NFD").replace(/\p{Diacritic}/gu,"").trim().toLowerCase();
}
function inOffice(name, officeNames) {
  if (!officeNames) return true;
  const n = norm(name);
  return officeNames.some(a => norm(a) === n);
}
function fmtMoney(v) {
  return new Intl.NumberFormat("sk-SK", { style:"currency", currency:"EUR", maximumFractionDigits: 0 }).format(v);
}
function fmtOrig(v, currency) {
  if (currency === "EUR") return null; // nepotrebuje pôvodný formát
  return new Intl.NumberFormat("sk-SK", { style:"currency", currency, maximumFractionDigits: 0 }).format(v);
}
function fmtDate(d) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("sk-SK", { day:"2-digit", month:"2-digit", year:"numeric" });
}

/* ── Prednastavené obdobia ── */
function getRange(period) {
  const now  = new Date();
  const y    = now.getFullYear();
  const m    = now.getMonth();
  switch (period) {
    case "Tento mesiac":
      return { from: new Date(y, m, 1), to: new Date(y, m+1, 0) };
    case "Minulý mesiac":
      return { from: new Date(y, m-1, 1), to: new Date(y, m, 0) };
    case "Posledné 3 mesiace":
      return { from: new Date(y, m-2, 1), to: new Date(y, m+1, 0) };
    case "Tento rok":
      return { from: new Date(y, 0, 1), to: new Date(y, 11, 31) };
    default:
      return null;
  }
}

const PERIODS = ["Tento mesiac","Minulý mesiac","Posledné 3 mesiace","Tento rok","Vlastné"];
const MEDALS  = ["🥇","🥈","🥉"];
const ACCENT  = "#FF501C";

export default function SalesLeaderboardClient() {
  const [allDeals, setAllDeals] = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [office,   setOffice]   = useState("Všetky");
  const [period,   setPeriod]   = useState("Tento mesiac");
  const [from,     setFrom]     = useState("");   // vlastné dátumy
  const [to,       setTo]       = useState("");
  const [expanded, setExpanded] = useState(null); // expanded broker name

  /* ── Načítanie ── */
  useEffect(() => {
    setLoading(true);
    fetch("/api/leaderboard")
      .then(r => r.json())
      .then(d => { setAllDeals(Array.isArray(d) ? d : []); })
      .finally(() => setLoading(false));
  }, []);

  /* ── Filter podľa dátumu ── */
  const range = period === "Vlastné"
    ? (from && to ? { from: new Date(from), to: new Date(to + "T23:59:59") } : null)
    : getRange(period);

  const filtered = allDeals.filter(d => {
    if (EXCLUDE.some(e => norm(e) === norm(d.owner))) return false;
    if (!inOffice(d.owner, OFFICES[office])) return false;
    if (!d.wonTime) return false;
    if (range) {
      const t = new Date(d.wonTime);
      if (t < range.from || t > range.to) return false;
    }
    return true;
  });

  /* ── Agregácia podľa makléra (všetko prepočítané na EUR) ── */
  const brokerMap = {};
  for (const d of filtered) {
    if (!brokerMap[d.owner]) brokerMap[d.owner] = { count: 0, total: 0, deals: [] };
    brokerMap[d.owner].count += 1;
    brokerMap[d.owner].total += toEur(d.cenaVozidla, d.currency);
    brokerMap[d.owner].deals.push(d);
  }
  const brokers = Object.entries(brokerMap)
    .map(([name, s]) => ({ name, ...s, avg: s.total / s.count }))
    .sort((a, b) => b.total - a.total || b.count - a.count);

  const totalDeals   = brokers.reduce((s, b) => s + b.count, 0);
  const totalRevenue = brokers.reduce((s, b) => s + b.total, 0);
  const avgPerDeal   = totalDeals ? totalRevenue / totalDeals : 0;

  const dark    = false;
  const cardCls = "bg-white shadow-sm rounded-xl";

  /* ── Skeleton ── */
  if (loading) return (
    <div className="space-y-4 animate-pulse">
      <div className="h-10 bg-gray-200 rounded-xl w-1/2" />
      <div className="h-28 bg-gray-200 rounded-xl" />
      {[...Array(6)].map((_,i) => (
        <div key={i} className="h-16 bg-gray-200 rounded-xl" />
      ))}
    </div>
  );

  return (
    <div className="space-y-5">
      {/* ── Nadpis ── */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">🏆 Leaderboard predaja</h1>
          <p className="text-sm text-gray-500 mt-0.5">Počet predaných vozidiel a obrat podľa makléra</p>
        </div>
        <button
          onClick={() => { setLoading(true); fetch("/api/leaderboard?force=1").then(r=>r.json()).then(d=>setAllDeals(Array.isArray(d)?d:[])).finally(()=>setLoading(false)); }}
          className="text-xs px-3 py-1.5 rounded-full border border-gray-300 text-gray-600 hover:bg-gray-100 flex items-center gap-1"
        >
          🔄 Obnoviť
        </button>
      </div>

      {/* ── Filtre ── */}
      <div className={"p-4 rounded-xl flex flex-wrap gap-3 items-end " + cardCls}>
        {/* Kancelária */}
        <div className="flex flex-col gap-1">
          <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Kancelária</label>
          <div className="flex flex-wrap gap-1.5">
            {Object.keys(OFFICES).map(o => (
              <button key={o} onClick={() => setOffice(o)}
                className="px-3 py-1 rounded-full text-sm font-medium transition-colors"
                style={office === o
                  ? { backgroundColor: ACCENT, color: "white" }
                  : { backgroundColor: "#f3f4f6", color: "#374151" }}
              >{o}</button>
            ))}
          </div>
        </div>

        {/* Obdobie */}
        <div className="flex flex-col gap-1">
          <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Obdobie</label>
          <div className="flex flex-wrap gap-1.5">
            {PERIODS.map(p => (
              <button key={p} onClick={() => setPeriod(p)}
                className="px-3 py-1 rounded-full text-sm font-medium transition-colors"
                style={period === p
                  ? { backgroundColor: "#1e3a5f", color: "white" }
                  : { backgroundColor: "#f3f4f6", color: "#374151" }}
              >{p}</button>
            ))}
          </div>
        </div>

        {/* Vlastné dátumy */}
        {period === "Vlastné" && (
          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-gray-500">Od</label>
              <input type="date" value={from} onChange={e => setFrom(e.target.value)}
                className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm text-gray-900 focus:outline-none focus:ring-2" />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-gray-500">Do</label>
              <input type="date" value={to} onChange={e => setTo(e.target.value)}
                className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm text-gray-900 focus:outline-none focus:ring-2" />
            </div>
          </div>
        )}
      </div>

      {/* ── Súhrnné štatistiky ── */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        {[
          { label: "Predané vozidlá",   value: totalDeals,          fmt: v => v, suffix: " ks", color: "#1e3a5f" },
          { label: "Celkový obrat",     value: totalRevenue,        fmt: fmtMoney, suffix: "", color: "#15803d" },
          { label: "Priemerná hodnota", value: avgPerDeal,          fmt: fmtMoney, suffix: "", color: "#9333ea" },
        ].map(s => (
          <div key={s.label} className={cardCls + " p-4"}>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">{s.label}</p>
            <p className="text-2xl font-extrabold" style={{ color: s.color }}>
              {s.fmt(s.value)}{s.suffix}
            </p>
          </div>
        ))}
      </div>

      {/* ── Leaderboard ── */}
      {brokers.length === 0 ? (
        <div className={"p-8 text-center text-gray-500 " + cardCls}>
          Žiadne predaje v zvolenom období.
        </div>
      ) : (
        <div className="space-y-2">
          {brokers.map((b, i) => {
            const isExpanded = expanded === b.name;
            const pct        = totalRevenue ? (b.total / totalRevenue * 100) : 0;
            return (
              <div key={b.name} className={cardCls + " overflow-hidden"}>
                {/* ── Riadok makléra ── */}
                <button
                  onClick={() => setExpanded(isExpanded ? null : b.name)}
                  className="w-full text-left px-4 py-3 flex items-center gap-3 hover:bg-gray-50 transition-colors"
                >
                  {/* Rank */}
                  <span className="text-xl w-8 text-center flex-shrink-0">
                    {i < 3 ? MEDALS[i] : <span className="text-gray-400 font-bold text-base">#{i+1}</span>}
                  </span>

                  {/* Meno */}
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-gray-900 truncate">{b.name}</p>
                    {/* Progress bar */}
                    <div className="mt-1 h-1.5 bg-gray-100 rounded-full overflow-hidden w-full max-w-xs">
                      <div className="h-full rounded-full transition-all" style={{ width: pct+"%", backgroundColor: ACCENT }} />
                    </div>
                  </div>

                  {/* Počet */}
                  <div className="text-center hidden sm:block flex-shrink-0 w-16">
                    <p className="text-xl font-extrabold text-gray-900">{b.count}</p>
                    <p className="text-xs text-gray-400">vozidiel</p>
                  </div>

                  {/* Obrat */}
                  <div className="text-right flex-shrink-0">
                    <p className="text-base font-extrabold" style={{ color: "#15803d" }}>{fmtMoney(b.total)}</p>
                    <p className="text-xs text-gray-400">ø {fmtMoney(b.avg)}/deal</p>
                  </div>

                  {/* Šípka */}
                  <span className="text-gray-400 flex-shrink-0 ml-1">{isExpanded ? "▲" : "▼"}</span>
                </button>

                {/* ── Detail dealov ── */}
                {isExpanded && (
                  <div className="border-t border-gray-100">
                    {/* Mobile: karty */}
                    <div className="md:hidden divide-y divide-gray-100">
                      {b.deals.sort((a,z) => new Date(z.wonTime) - new Date(a.wonTime)).map(d => {
                        const orig = fmtOrig(d.cenaVozidla, d.currency);
                        const eur  = fmtMoney(toEur(d.cenaVozidla, d.currency));
                        return (
                          <div key={d.id} className="px-4 py-3 flex justify-between items-start">
                            <div>
                              <p className="font-medium text-gray-800 text-sm">{d.title}</p>
                              <p className="text-xs text-gray-400">{fmtDate(d.wonTime)}</p>
                            </div>
                            <div className="text-right ml-2">
                              <p className="font-bold text-green-700 text-sm whitespace-nowrap">{orig ?? eur}</p>
                              {orig && <p className="text-xs text-gray-400 whitespace-nowrap">≈ {eur}</p>}
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* Desktop: tabuľka */}
                    <table className="hidden md:table w-full text-sm">
                      <thead>
                        <tr className="bg-gray-50 text-xs uppercase text-gray-400">
                          <th className="px-5 py-2 text-left font-semibold">Vozidlo</th>
                          <th className="px-5 py-2 text-left font-semibold">Predané dňa</th>
                          <th className="px-5 py-2 text-right font-semibold">Pôvodná hodnota</th>
                          <th className="px-5 py-2 text-right font-semibold">EUR</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {b.deals.sort((a,z) => new Date(z.wonTime) - new Date(a.wonTime)).map(d => {
                          const orig = fmtOrig(d.cenaVozidla, d.currency);
                          const eur  = fmtMoney(toEur(d.cenaVozidla, d.currency));
                          return (
                            <tr key={d.id} className="hover:bg-gray-50">
                              <td className="px-5 py-2.5 font-medium text-gray-800">{d.title}</td>
                              <td className="px-5 py-2.5 text-gray-500">{fmtDate(d.wonTime)}</td>
                              <td className="px-5 py-2.5 text-right text-gray-500">
                                {orig ? <span className="font-semibold text-blue-700">{orig}</span> : <span className="text-gray-300">—</span>}
                              </td>
                              <td className="px-5 py-2.5 text-right font-bold text-green-700">{eur}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                      <tfoot>
                        <tr className="bg-green-50">
                          <td colSpan={3} className="px-5 py-2 text-sm font-semibold text-green-800">Spolu (v EUR)</td>
                          <td className="px-5 py-2 text-right font-extrabold text-green-800">{fmtMoney(b.total)}</td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Podnožie */}
      {range && (
        <p className="text-xs text-gray-400 text-center">
          Obdobie: {fmtDate(range.from.toISOString())} – {fmtDate(range.to.toISOString())} · {filtered.length} dealov · cache 5 min
        </p>
      )}
    </div>
  );
}
