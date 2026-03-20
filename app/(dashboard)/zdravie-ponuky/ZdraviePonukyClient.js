"use client";
import { useEffect, useState, useMemo } from "react";

const ACCENT = "#FF501C";

const HEALTH = {
  excellent: { bg: "#f0fdf4", border: "#16a34a", text: "#15803d", dot: "🟢", label: "Výborné",       grad: "from-green-600 to-green-700" },
  good:      { bg: "#f7fee7", border: "#65a30d", text: "#4d7c0f", dot: "🟡", label: "Dobré",          grad: "from-lime-600 to-lime-700"  },
  average:   { bg: "#fffbeb", border: "#d97706", text: "#b45309", dot: "🟠", label: "Priemerné",      grad: "from-amber-500 to-amber-600" },
  poor:      { bg: "#fef2f2", border: "#dc2626", text: "#b91c1c", dot: "🔴", label: "Problematické",  grad: "from-red-600 to-red-700"    },
};

const LEVEL = {
  ok:      { bg: "#dcfce7", text: "#15803d" },
  warn:    { bg: "#fef9c3", text: "#854d0e" },
  bad:     { bg: "#fee2e2", text: "#b91c1c" },
  neutral: { bg: "#f3f4f6", text: "#374151" },
  info:    { bg: "#eff6ff", text: "#1d4ed8" },
  na:      { bg: "#f3f4f6", text: "#d1d5db" },
};

function Badge({ icon, label, level }) {
  const s = LEVEL[level] || LEVEL.na;
  const faded = !label || label === "N/A";
  return (
    <span
      className="inline-flex items-center gap-0.5 text-xs px-2 py-0.5 rounded-full font-medium whitespace-nowrap"
      style={{ backgroundColor: faded ? "#f3f4f6" : s.bg, color: faded ? "#d1d5db" : s.text }}
    >
      {icon} {faded ? "N/A" : label}
    </span>
  );
}

function BrandAvatar({ brand, isTop5 }) {
  const initial = (brand || "?")[0].toUpperCase();
  const color   = isTop5 ? "#FF501C" : "#6b7280";
  return (
    <div className="w-9 h-9 rounded-xl flex-shrink-0 flex items-center justify-center text-white text-sm font-extrabold"
      style={{ backgroundColor: color }}>
      {initial}
    </div>
  );
}

export default function ZdraviePonukyClient() {
  const [data,    setData]    = useState([]);
  const [loading, setLoading] = useState(true);
  const [broker,  setBroker]  = useState("all");
  const [filter,  setFilter]  = useState("all"); // all | poor | average | good | excellent
  const [top5,    setTop5]    = useState(false);
  const [sortBy,  setSortBy]  = useState("health"); // health | days | price

  const load = (force = false) => {
    setLoading(true);
    fetch(`/api/zdravie-ponuky${force ? "?force=1" : ""}`)
      .then(r => r.json())
      .then(d => setData(Array.isArray(d) ? d : []))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const brokers = useMemo(() =>
    [...new Set(data.map(d => d.owner).filter(Boolean))].sort()
  , [data]);

  const counts = useMemo(() => {
    const c = { excellent: 0, good: 0, average: 0, poor: 0 };
    data.forEach(d => { if (d.health?.level) c[d.health.level] = (c[d.health.level] || 0) + 1; });
    return c;
  }, [data]);

  const filtered = useMemo(() => {
    const items = data
      .filter(d => broker === "all"  || d.owner === broker)
      .filter(d => filter === "all"  || d.health?.level === filter)
      .filter(d => !top5 || d.scores.brand.isTop5);

    return [...items].sort((a, b) => {
      if (sortBy === "days")  return b.scores.days.days - a.scores.days.days;
      if (sortBy === "price") return a.scores.price.score - b.scores.price.score;
      return a.totalScore - b.totalScore;
    });
  }, [data, broker, filter, top5, sortBy]);

  if (loading) return (
    <div className="space-y-4 animate-pulse">
      <div className="h-10 bg-gray-200 rounded-2xl w-1/2" />
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[...Array(4)].map((_, i) => <div key={i} className="h-24 bg-gray-200 rounded-2xl" />)}
      </div>
      {[...Array(8)].map((_, i) => <div key={i} className="h-16 bg-gray-200 rounded-2xl" />)}
    </div>
  );

  return (
    <div className="space-y-5">

      {/* Nadpis */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold text-gray-900">🏥 Zdravie ponuky</h1>
          <p className="text-sm text-gray-400 mt-0.5">
            Predajnosť aktívnych vozidiel · cena, značka, čas, vek, km
          </p>
        </div>
        <button onClick={() => load(true)}
          className="text-xs px-4 py-2 rounded-full border border-gray-200 text-gray-500 hover:bg-gray-50 transition-all flex items-center gap-1.5 font-medium">
          🔄 Obnoviť
        </button>
      </div>

      {/* Súhrnné karty — klikateľné filtre */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {Object.entries(HEALTH).map(([level, h]) => (
          <div key={level}
            onClick={() => setFilter(f => f === level ? "all" : level)}
            className={`rounded-2xl p-4 text-white bg-gradient-to-br ${h.grad} shadow-sm cursor-pointer transition-all`}
            style={{ opacity: filter === "all" || filter === level ? 1 : 0.55, outline: filter === level ? "2px solid white" : "none" }}>
            <p className="text-xs font-semibold text-white/70 uppercase tracking-wider mb-1">
              {h.dot} {h.label}
            </p>
            <p className="text-2xl font-extrabold">{counts[level] || 0}</p>
          </div>
        ))}
      </div>

      {/* Filtre */}
      <div className="bg-white rounded-2xl shadow-sm p-4 flex flex-wrap gap-4 items-end">
        <div className="flex flex-col gap-1.5 flex-1 min-w-[160px]">
          <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Maklér</label>
          <select value={broker} onChange={e => setBroker(e.target.value)}
            className="border border-gray-200 rounded-xl px-3 py-2 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-orange-200">
            <option value="all">Všetci makléri</option>
            {brokers.map(b => <option key={b} value={b}>{b}</option>)}
          </select>
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Zoradiť podľa</label>
          <div className="flex flex-wrap gap-1.5">
            {[
              { key: "health", label: "Zdravie"      },
              { key: "days",   label: "Dni v ponuke" },
              { key: "price",  label: "Cena vs trh"  },
            ].map(o => (
              <button key={o.key} onClick={() => setSortBy(o.key)}
                className="px-3 py-1.5 rounded-xl text-sm font-semibold transition-all"
                style={sortBy === o.key
                  ? { backgroundColor: ACCENT, color: "white", boxShadow: `0 2px 8px ${ACCENT}55` }
                  : { backgroundColor: "#f3f4f6", color: "#6b7280" }}>
                {o.label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Značka</label>
          <button onClick={() => setTop5(v => !v)}
            className="px-3 py-1.5 rounded-xl text-sm font-semibold transition-all"
            style={top5
              ? { backgroundColor: ACCENT, color: "white", boxShadow: `0 2px 8px ${ACCENT}55` }
              : { backgroundColor: "#f3f4f6", color: "#6b7280" }}>
            🏆 Len TOP 5
          </button>
        </div>
      </div>

      {/* Zoznam vozidiel */}
      <div className="space-y-2">
        {filtered.map(d => {
          const hc = HEALTH[d.health.level] || HEALTH.average;
          const s  = d.scores;
          return (
            <div key={d.id} className="bg-white rounded-2xl shadow-sm overflow-hidden"
              style={{ borderLeft: `4px solid ${hc.border}` }}>
              <div className="px-4 py-3.5 flex items-start gap-3">

                <BrandAvatar brand={d.brand} isTop5={s.brand.isTop5} />

                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="min-w-0">
                      <p className="font-bold text-gray-900 text-sm leading-tight truncate">{d.title}</p>
                      <p className="text-xs text-gray-400 mt-0.5">
                        {d.owner} · {new Date(d.addTime).toLocaleDateString("sk-SK")}
                        {d.value ? ` · ${d.value.toLocaleString("sk-SK")} ${d.currency}` : ""}
                      </p>
                    </div>
                    <span className="flex-shrink-0 text-xs font-bold px-2.5 py-1 rounded-full"
                      style={{ backgroundColor: hc.bg, color: hc.text }}>
                      {hc.dot} {hc.label}
                    </span>
                  </div>

                  <div className="flex flex-wrap gap-1.5">
                    <Badge icon="💰" label={s.price.label} level={s.price.level} />
                    <Badge icon="🏆" label={s.brand.isTop5 ? `TOP 5 · ${d.brand}` : d.brand} level={s.brand.level} />
                    <Badge icon="📅" label={s.days.label}  level={s.days.level}  />
                    <Badge icon="🗓️" label={s.age.label}   level={s.age.level}   />
                    <Badge icon="🔧" label={s.km.label}    level={s.km.level}    />
                    <Badge icon="⛽" label={s.fuel.label}  level={s.fuel.level}  />
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {filtered.length === 0 && (
        <div className="bg-white rounded-2xl shadow-sm p-10 text-center text-gray-400">
          <p className="text-4xl mb-3">🔍</p>
          <p className="font-semibold text-gray-600">Žiadne vozidlá nezodpovedajú filtru.</p>
        </div>
      )}

      <p className="text-xs text-gray-400 text-center">
        {filtered.length} z {data.length} vozidiel · cache 10 min
      </p>
    </div>
  );
}
