import "./globals.css";
import Link from "next/link";

export const metadata = { title: "Autorro Dashboard" };

export default function RootLayout({ children }) {
  return (
    <html lang="sk">
      <body className="bg-gray-100 text-gray-900 flex min-h-screen">
        <aside className="w-56 bg-white border-r border-gray-200 flex flex-col p-4 fixed h-full">
          <div className="mb-8">
            <h1 className="text-lg font-bold text-gray-900">Autorro</h1>
            <p className="text-xs text-gray-400">Dashboard</p>
          </div>
          <nav className="flex flex-col gap-1">
            <Link href="/" className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-gray-600 hover:bg-gray-100 hover:text-gray-900 transition-colors">
              <span>🏥</span> Zdravie ponuky
            </Link>
            <Link href="/reakčný-čas" className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-gray-600 hover:bg-gray-100 hover:text-gray-900 transition-colors">
              <span>⚡</span> Reakčný čas
            </Link>
            <Link href="/aktivity" className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-gray-600 hover:bg-gray-100 hover:text-gray-900 transition-colors">
              <span>📊</span> Aktivity
            </Link>
            <Link href="/pipeline" className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-gray-600 hover:bg-gray-100 hover:text-gray-900 transition-colors">
              <span>🚗</span> Pipeline
            </Link>
          </nav>
        </aside>
        <main className="ml-56 flex-1 p-8 bg-gray-100 min-h-screen">
          {children}
        </main>
      </body>
    </html>
  );
}