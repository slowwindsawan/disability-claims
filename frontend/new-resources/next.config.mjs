/** @type {import('next').NextConfig} */
const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000'

const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  async rewrites() {
    return [
      // Special-case: /api/user/cases → /cases (authenticated user's cases)
      {
        source: '/api/user/cases',
        destination: `${BACKEND_URL}/cases`,
      },
      // Special-case: /api/user/profile → /user/profile
      {
        source: '/api/user/profile',
        destination: `${BACKEND_URL}/user/profile`,
      },
      // General catch-all: /api/xxx → backend /xxx
      {
        source: '/api/:path*',
        destination: `${BACKEND_URL}/:path*`,
      },
    ]
  },
}

export default nextConfig
