import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

/**
 * Získa aktuálne prihláseného usera v API route / Server Component.
 * Vráti null ak nie je prihlásený.
 */
export async function getServerUser() {
  const cookieStore = await cookies()

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() { return cookieStore.getAll() },
        setAll() {}, // read-only v API routách
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()
  return user
}

/**
 * Overí, či je user admin (email je v ADMIN_EMAILS env var).
 * ADMIN_EMAILS = čiarkami oddelený zoznam emailov v prostredí.
 */
export function isAdminUser(user) {
  if (!user?.email) return false
  const adminEmails = (process.env.ADMIN_EMAILS || '').split(',').map(e => e.trim().toLowerCase())
  return adminEmails.includes(user.email.toLowerCase())
}
