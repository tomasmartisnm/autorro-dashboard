/** @type {import('next').NextConfig} */
const nextConfig = {
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          // Zabraňuje MIME sniffingu
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          // Zabraňuje clickjackingu (iframe embedding)
          { key: 'X-Frame-Options', value: 'DENY' },
          // Referrer len na rovnakú doménu
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          // Vypnuté zbytočné browser features
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(), payment=()' },
        ],
      },
      {
        // API routes — zakáž cachovanie v browseroch
        source: '/api/(.*)',
        headers: [
          { key: 'Cache-Control', value: 'no-store, max-age=0' },
        ],
      },
    ]
  },
}

export default nextConfig
