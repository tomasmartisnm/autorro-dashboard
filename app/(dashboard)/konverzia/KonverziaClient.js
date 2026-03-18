"use client";

import { useEffect, useState } from "react";

const OFFICES = {
  "Všetky": null,
  "BB": ["Dominika Kompaniková", "Dominka Kompaníková", "Milan Kováč", "Andrej Čík", "Tomáš Urbán", "Tomás Urban", "Dávid Juhaniak", "David Juhaniak"],
  "TT": ["Bálint Forró", "Bálint Forro", "Tomáš Opálek", "Karolína Lisická", "Martin Blažek", "Lukáš Krommel"],
  "NR": ["Martin Petráš", "Dávid Kalužák", "David Kalužák", "Daniel Kádek", "Gabriela Šodorová", "Dávid Čintala"],
  "BA": ["Milan Švorc", "Ján Mikuš", "Richard Kiss", "Karin Harvan", "Matej Hromada", "Milan Pulc", "Martin Bošeľa", "Peter Maťo", "Jonathán Pavelka", "Matej Klačko", "Dominik Ďurčo"],
  "TN": ["Libor Koníček", "Tomáš Otrubný", "Peter Mjartan", "Martin Mečiar", "Ján Skovajsa", "Tomáš Kučerka", "Patrik Frič"],
  "ZA": ["Tomáš Smieško", "Daniel Jašek", "Vladko Hess", "Wlodzimierz Hess", "Irena Varadová", "Matej Gažo", "Veronika Maťková", "Tomáš Ďurana"],
  "PP": ["Sebastián Čuban", "Tomáš Matta"],
  "KE": ["Ján Tej", "Adrián Šomšág", "Viliam Baran", "Jaroslav Hažlinský", "Martin Živčák", "Ján Slivka"],
};

export default function KonverziaClient() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [office, setOffice] = useState("Všetky");
  const [dark, setDark] = useState(false);

  useEffect(() => {
    fetch("/api/wasitlead-conversion")
      .then(r => r.json())
      .then(d => { setData(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const bg = dark ? "text-white" : "text-gray-900";
  const bgStyle = dark ? { backgroundColor: "#481132" } : { backgroundColor: "#FFFFFF" };
  const cardCls = dark ? "shadow" : "bg-white shadow";
  const cardStyle = dark ? { backgroundColor: "#5c1a42" } : {};
  const rowCls = dark ? "border-gray-700" : "border-gray-100 hover:bg-gray-50";
  const theadCls = dark ? "text-gray-300" : "text-gray-700";
  const theadStyle = dark ? { backgroundColor: "#3d0e2a" } : { backgroundColor: "#F7F6F4" };
  const btnBase = dark ? "text-gray-300 hover:opacity-80" : "bg-gray-100 text-gray-700 hover:bg-gray-200";

  const officeNames = office === "Všetky" ? null : (OFFICES[office] || []);
  const brokerRows = data ? data.byBroker.filter(b =>
    !officeNames || officeNames.some(n => n.trim().toLowerCase() === b.name.trim().toLowerCase())
  ) : [];

  const filtTotal = brokerRows.reduce((a, b) => a + b.total, 0);
  const filtInz = brokerRows.reduce((a, b) => a + b.inzerovane, 0);
  const filtPct = filtTotal > 0 ? Math.round((filtInz / filtTotal) * 100) : 0;
  const filtWon = brokerRows.reduce((a, b) => a + b.won, 0);
  const filtLost = brokerRows.reduce((a, b) => a + b.lost, 0);
  const pctColor = filtPct >= 50 ? "text-green-400" : filtPct >= 30 ? "text-yellow-400" : "text-red-400";
  const barColor = filtPct >= 50 ? "#22c55e" : filtPct >= 30 ? "#eab308" : "#ef4444";

  // Office summary cards
  const officeSummary = Object.keys(OFFICES).filter(o => o !== "Všetky").map(o => {
    const names = OFFICES[o];
    const rows = data ? data.byBroker.filter(b =>
      names.some(n => n.trim().toLowerCase() === b.name.trim().toLowerCase())
    ) : [];
    const total = rows.reduce((a, b) => a + b.total, 0);
    const inz = rows.reduce((a, b) => a + b.inzerovane, 0);
    const pct = total > 0 ? Math.round((inz / total) * 100) : 0;
    return { name: o, total, inz, pct };
  }).sort((a, b) => b.pct - a.pct);

  return (
    <div className={"min-h-screen " + bg} style={bgStyle}>
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-1">
          <h1 className="text-3xl font-bold">Konverzia leadov</h1>
          <button onClick={() => setDark(!dark)} className={"px-4 py-2 rounded-full text-sm font-medium " + btnBase}>
            {dark ? "☀️ Light" : "🌙 Dark"}
          </button>
        </div>
        <p className={"mb-6 " + (dark ? "text-gray-400" : "text-gray-500")}>
          Úspešnosť maklérov: Lead od callcentra → Inzerované
        </p>

        {loading && (
          <div className="flex items-center gap-3 text-gray-400 py-12">
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-gray-400 border-t-orange-500" />
            Načítavam dáta...
          </div>
        )}

        {!loading && data && <>
          {/* Summary karty */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 mb-6 md:mb-8">
            <div className={"rounded-xl p-4 " + cardCls} style={cardStyle}>
              <p className={"text-sm " + (dark ? "text-gray-400" : "text-gray-500")}>Leadov od CC</p>
              <p className="text-2xl font-bold">{filtTotal}</p>
            </div>
            <div className={"rounded-xl p-4 " + cardCls} style={cardStyle}>
              <p className={"text-sm " + (dark ? "text-gray-400" : "text-gray-500")}>Dostalo sa do ponuky</p>
              <p className={"text-2xl font-bold " + pctColor}>{filtInz} <span className="text-base font-normal">({filtPct}%)</span></p>
            </div>
            <div className={"rounded-xl p-4 " + cardCls} style={cardStyle}>
              <p className={"text-sm " + (dark ? "text-gray-400" : "text-gray-500")}>Predaných (won)</p>
              <p className="text-2xl font-bold text-green-400">{filtWon}</p>
            </div>
            <div className={"rounded-xl p-4 " + cardCls} style={cardStyle}>
              <p className={"text-sm " + (dark ? "text-gray-400" : "text-gray-500")}>Stratených (lost)</p>
              <p className="text-2xl font-bold text-red-400">{filtLost}</p>
            </div>
          </div>

          {/* Office filter */}
          <div className="flex flex-wrap gap-2 mb-4 md:mb-8">
            {Object.keys(OFFICES).map(o => (
              <button key={o} onClick={() => setOffice(o)}
                className={"px-4 py-2 rounded-full text-sm font-medium " + (office === o ? "text-white" : btnBase)}
                style={office === o ? { backgroundColor: "#FF501C" } : {}}>
                {o}
              </button>
            ))}
          </div>

          {/* Office summary cards */}
          {office === "Všetky" && (
            <div className="mb-8">
              <h2 className="text-xl font-semibold mb-4">Prehľad kancelárií</h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {officeSummary.map(o => {
                  const c = o.pct >= 50 ? "text-green-400" : o.pct >= 30 ? "text-yellow-400" : "text-red-400";
                  const bc = o.pct >= 50 ? "#22c55e" : o.pct >= 30 ? "#eab308" : "#ef4444";
                  return (
                    <div key={o.name} onClick={() => setOffice(o.name)}
                      className={"rounded-xl p-4 cursor-pointer hover:opacity-80 " + cardCls} style={cardStyle}>
                      <div className="flex justify-between items-center mb-1">
                        <span className="font-bold text-lg">{o.name}</span>
                        <span className={"font-bold " + c}>{o.pct}%</span>
                      </div>
                      <div className={"w-full rounded-full h-2 mt-1 " + (dark ? "bg-gray-700" : "bg-gray-300")}>
                        <div className="h-2 rounded-full" style={{ width: o.pct + "%", backgroundColor: bc }} />
                      </div>
                      <p className={"text-xs mt-2 " + (dark ? "text-gray-400" : "text-gray-500")}>{o.inz} / {o.total} leadov</p>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Broker table */}
          <h2 className="text-xl font-semibold mb-4">
            {office === "Všetky" ? "Všetci makléri" : "Makléri – " + office}
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[600px]">
              <thead className={theadCls} style={theadStyle}>
                <tr>
                  <th className="p-3 text-left">#</th>
                  <th className="p-3 text-left">Maklér</th>
                  <th className="p-3 text-left">Leadov</th>
                  <th className="p-3 text-left">Do ponuky</th>
                  <th className="p-3 text-left">Won</th>
                  <th className="p-3 text-left">Lost</th>
                  <th className="p-3 text-left">Úspešnosť</th>
                  <th className="p-3 text-left w-40">Graf</th>
                </tr>
              </thead>
              <tbody>
                {brokerRows.map((b, i) => {
                  const c = b.pct >= 50 ? "text-green-400" : b.pct >= 30 ? "text-yellow-400" : "text-red-400";
                  const bc = b.pct >= 50 ? "#22c55e" : b.pct >= 30 ? "#eab308" : "#ef4444";
                  return (
                    <tr key={b.name} className={"border-t " + rowCls}>
                      <td className="p-3 text-gray-500">{i + 1}</td>
                      <td className="p-3 font-medium">{b.name}</td>
                      <td className="p-3">{b.total}</td>
                      <td className={"p-3 font-bold " + c}>{b.inzerovane}</td>
                      <td className="p-3 text-green-400">{b.won}</td>
                      <td className="p-3 text-red-400">{b.lost}</td>
                      <td className={"p-3 font-bold " + c}>{b.pct}%</td>
                      <td className="p-3">
                        <div className={"w-full rounded-full h-2 " + (dark ? "bg-gray-700" : "bg-gray-300")}>
                          <div className="h-2 rounded-full" style={{ width: b.pct + "%", backgroundColor: bc }} />
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>}
      </div>
    </div>
  );
}
