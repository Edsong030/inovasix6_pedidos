/** @type {import('next').NextConfig} */

const isDemo = process.env.NEXT_PUBLIC_DEMO_MODE === 'true'

const nextConfig = {
  // Static export only in demo/Pages mode
  ...(isDemo && {
    output:       'export',
    basePath:     '/inovasix6_pedidos',
    assetPrefix:  '/inovasix6_pedidos/',
    trailingSlash: true,
  }),

  images: {
    // next/image optimization is incompatible with static export
    unoptimized: isDemo ? true : false,
    remotePatterns: isDemo ? [] : [
      { protocol: 'https', hostname: '**' },
    ],
  },
}

export default nextConfig
