"use client";

import { useEffect, useState } from "react";

const OFFICES = {
  BB: ["Dominika Kompaniková", "Dominka Kompaníková", "Milan Kováč", "Andrej Čík", "Tomáš Urbán", "Tomás Urban", "Dávid Juhaniak", "David Juhaniak"],
  TT: ["Bálint Forró", "Bálint Forro", "Tomáš Opálek", "Karolína Lisická", "Martin Blažek", "Lukáš Krommel"],
  NR: ["Martin Petráš", "Dávid Kalužák", "David Kalužák", "Daniel Kádek", "Gabriela Šodorová", "Dávid Čintala"],
  BA: ["Milan Švorc", "Ján Mikuš", "Richard Kiss", "Karin Harvan", "Matej Hromada", "Milan Pulc", "Martin Bošeľa", "Peter Maťo", "Jonathán Pavelka", "Matej Klačko", "Dominik Ďurčo"],
  TN: ["Libor Koníček", "Tomáš Otrubný", "Peter Mjartan", "Martin Mečiar", "Ján Skovajsa", "Tomáš Kučerka", "Patrik Frič"],
  ZA: ["Tomáš Smieško", "Daniel Jašek", "Vladko Hess", "Wlodzimierz Hess", "Irena Varadová", "Matej Gažo", "Veronika Maťková", "Tomáš Ďurana"],
  PP: ["Sebastián Čuban", "Tomáš Matta"],
  KE: ["Ján Tej", "Adrián Šomšág", "Viliam Baran", "Jaroslav Hažlinský", "Martin Živčák", "Ján Slivka"],
};

const EXCLUDE = ["Development", "Tomáš Martiš", "Miroslav Hrehor", "Peter Hudec", "Jaroslav Kováč"];

function matchOwner(ownerName, names) {
  return names.some(
    (n) => ownerName && ownerName.trim().toLowerCase() === n.trim().toLowerCase()
  );
}

function getOfficeForOwner(ownerName) {
  for (const [office, names] of Object.entries(OFFICES)) {
    if (matchOwner(ownerName, names)) return office;
  }
  return null;
}

function speedColor(avg) {
  if (avg <= 30) return { bg: "bg-green-900/40", text: "text-green-400", badge: "bg-green-900 text-green-300", label: "Rýchly" };
  if (avg <= 60) return { bg: "bg-yellow-900/40", text: "text-yellow-400", badge: "bg-yellow-900 text-yellow-300", label: "Priemerný" };
  return { bg: "bg-red-900/40", text: "text-red-400", badge: "bg-red-900 text-red-300", label: "Pomalý" };
}

function SpeedBar({ avg }) {
  const max = 120;
  const pct = Math.min((avg / max) * 100, 100);
  const color = avg <= 30 ? "bg-green-500" : avg <= 60 ? "bg-yellow-500" : "bg-red-500";
  return (
    <div className="w-full bg-gray-700 rounded-full h-1.5 mt-1">
      <div className={`${color} h-1.5 rounded-full`} style={{ width: `${pct}%` }} />
    </div>
  );
}

export default function CasPredajaClient() {
  const [stats, setStats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedOffice, setSelectedOffice] = useState("Všetky");

  useEffect(() => {
    fetch("/api/cas-predaja")
      .then((r) => r.json())
      .then((data) => {
        setStats(data.filter((d) => !EXCLUDE.includes(d.owner_name)));
        setLoading(false);
      })
      .catch(() => {
        setError("Nepodarilo sa načítať dáta.");
        setLoading(false);
      });
  }, []);

  const officeStats = Object.entries(OFFICES).map(([name, names]) => {
    const brokers = stats.filter((s) => matchOwner(s.owner_name, names));
    if (brokers.length === 0) return { name, avg: null, count: 0 };
    const allAvgs = brokers.map((b) => b.avg);
    const avg = Math.round((allAvgs.reduce((a, b) => a + b, 0) / allAvgs.length) * 10) / 10;
    return { name, avg, count: brokers.reduce((a, b) => a + b.count, 0) };
  }).filter((o) => o.avg !== null).sort((a, b) => a.avg - b.avg);

  const filteredStats =
    selectedOffice === "Všetky"
      ? stats.sort((a, b) => a.avg - b.avg)
      : stats
          .filter((s) => matchOwner(s.owner_name, OFFICES[selectedOffice] || []))
          .sort((a, b) => a.avg - b.avg);

  const offices = ["Všetky", ...Object.keys(OFFICES)];

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100 p-6">
      <h1 className="text-2xl font-bold text-white mb-1">Čas predaja</h1>
      <p className="text-gray-400 text-sm mb-6">
        Priemerný počet dní, ktoré deal strávi v stave <span className="text-gray-200 font-medium">Inzerované</span> — čím menej, tým lepšie.
      </p>

      {loading && (
        <div className="flex items-center gap-3 text-gray-400">
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-gray-600 border-t-blue-500" />
          Načítavam dáta...
        </div>
      )}

      {error && (
        <div className="rounded-lg bg-red-900/40 border border-red-700 px-4 py-3 text-red-300">
          {error}
        </div>
      )}

      {!loading && !error && (
        <>
          {/* Office summary cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
            {officeStats.map((o) => {
              const c = speedColor(o.avg);
              return (
                <button
                  key={o.name}
                  onClick={() => setSelectedOffice(selectedOffice === o.name ? "Všetky" : o.name)}
                  className={`rounded-xl border p-4 text-left transition-all ${
                    selectedOffice === o.name
                      ? "border-blue-500 bg-blue-900/20"
                      : "border-gray-800 bg-gray-900/50 hover:border-gray-600"
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-lg font-bold text-white">{o.name}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${c.badge}`}>
                      {c.label}
                    </span>
                  </div>
                  <div className={`text-2xl font-bold ${c.text}`}>{o.avg}d</div>
                  <SpeedBar avg={o.avg} />
                  <div className="text-xs text-gray-500 mt-1">{o.count} dealov</div>
                </button>
              );
            })}
          </div>

          {/* Office filter tabs */}
          <div className="flex flex-wrap gap-2 mb-4">
            {offices.map((o) => (
              <button
                key={o}
                onClick={() => setSelectedOffice(o)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  selectedOffice === o
                    ? "bg-blue-600 text-white"
                    : "bg-gray-800 text-gray-300 hover:bg-gray-700"
                }`}
              >
                {o}
              </button>
            ))}
          </div>

          {/* Broker table */}
          <div className="overflow-x-auto rounded-xl border border-gray-800">
            <table className="w-full text-sm">
              <thead className="bg-gray-900 text-gray-400 uppercase text-xs tracking-wider">
                <tr>
                  <th className="px-6 py-4 text-left">Maklér</th>
                  <th className="px-6 py-4 text-left">Kancelária</th>
                  <th className="px-6 py-4 text-left">Počet dealov</th>
                  <th className="px-6 py-4 text-left">Priem. čas (dni)</th>
                  <th className="px-6 py-4 text-left">Min</th>
                  <th className="px-6 py-4 text-left">Max</th>
                  <th className="px-6 py-4 text-left">Rýchlosť</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800">
                {filteredStats.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-8 text-center text-gray-500">
                      Žiadne dáta.
                    </td>
                  </tr>
                ) : (
                  filteredStats.map((s) => {
                    const office = getOfficeForOwner(s.owner_name) || "—";
                    const c = speedColor(s.avg);
                    return (
                      <tr key={s.owner_name} className="bg-gray-900/50 hover:bg-gray-800/60 transition-colors">
                        <td className="px-6 py-4 font-medium text-white">{s.owner_name}</td>
                        <td className="px-6 py-4 text-gray-300">{office}</td>
                        <td className="px-6 py-4 text-gray-300">{s.count}</td>
                        <td className={`px-6 py-4 font-bold ${c.text}`}>{s.avg}d</td>
                        <td className="px-6 py-4 text-green-400">{s.min}d</td>
                        <td className="px-6 py-4 text-red-400">{s.max}d</td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${c.badge}`}>
                            {c.label}
                          </span>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
