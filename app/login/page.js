"use client";
import { useState } from "react";
import { createClient } from "../../lib/supabase";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  async function handleLogin(e) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      setError("Nesprávny email alebo heslo");
      setLoading(false);
    } else {
      router.push("/");
      router.refresh();
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center" style={{backgroundColor: "#F7F6F4"}}>
      <div className="bg-white rounded-2xl shadow-lg p-8 w-full max-w-md">
        <div className="text-center mb-8">
          <div className="w-12 h-12 rounded-xl mx-auto mb-3 flex items-center justify-center" style={{backgroundColor: "#FF501C"}}>
            <span className="text-white font-bold text-xl">A</span>
          </div>
          <h1 className="text-2xl font-bold" style={{color: "#481132"}}>Autorro Dashboard</h1>
          <p className="text-sm text-gray-400 mt-1">CRManagement</p>
        </div>
        <h2 className="text-xl font-bold text-center text-gray-900 mb-6">Prihláste sa</h2>
        <form onSubmit={handleLogin} className="flex flex-col gap-4">
          <div>
            <label className="text-sm font-medium text-gray-900">Emailová adresa</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              className="mt-1 w-full border-2 rounded-lg px-4 py-3 text-gray-900 focus:outline-none"
              style={{borderColor: "#FF501C"}}
              placeholder="meno@autorro.sk"
              required
            />
          </div>
          <div>
            <label className="text-sm font-medium text-gray-900">Heslo</label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              className="mt-1 w-full border border-gray-200 rounded-lg px-4 py-3 text-gray-900 focus:outline-none focus:border-orange-400"
              required
            />
          </div>
          {error && <p className="text-red-500 text-sm">{error}</p>}
          <div className="text-right">
            <a href="/forgot-password" className="text-sm" style={{color: "#FF501C"}}>Zabudnuté heslo?</a>
          </div>
          <button
            type="submit"
            disabled={loading}
            className="text-white font-semibold py-3 rounded-lg transition-opacity hover:opacity-90"
            style={{backgroundColor: "#FF501C"}}
          >
            {loading ? "Prihlasovanie..." : "Prihlásiť sa"}
          </button>
        </form>
      </div>
    </div>
  );
}