/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  experimental: {
    turbopack: {
      resolveAlias: {
        "framer-motion": {
          browser: ["./node_modules/framer-motion/dist/index.mjs"],
        },
      },
    },
  },
}

export default nextConfig
