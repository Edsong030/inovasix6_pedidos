import { dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

/** @type {import('next').NextConfig} */

const isDemo = process.env.NEXT_PUBLIC_DEMO_MODE === 'true'

const nextConfig = {
  // Raiz do projeto web (evita que um package-lock.json de pasta acima seja tomado como raiz)
  outputFileTracingRoot: dirname(fileURLToPath(import.meta.url)),

  // Static export only in demo/Pages mode
  ...(isDemo && {
    output:       'export',
    basePath:     '/inovasix6_pedidos',
    assetPrefix:  '/inovasix6_pedidos/',
    trailingSlash: true,
  }),

  // Imagem Docker: servidor mínimo (.next/standalone). Definido só no Dockerfile,
  // para "next start" local continuar como antes.
  ...(!isDemo && process.env.NEXT_OUTPUT === 'standalone' && { output: 'standalone' }),

  // O app não usa next/image (as imagens são <img> comuns). Otimizador desligado em
  // todos os modos: o endpoint /_next/image não processa nem busca imagens de terceiros.
  images: {
    unoptimized: true,
  },
}

export default nextConfig
