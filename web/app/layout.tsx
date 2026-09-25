import type { Metadata } from 'next'
import './globals.css'
import { Toaster } from 'react-hot-toast'

export const metadata: Metadata = {
  title: 'Inovasix6 Pedidos',
  description: 'Plataforma de gestão de pedidos para restaurantes',
  icons: { icon: '/inovasix6-symbol.svg' },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body className="bg-surface text-white min-h-screen">
        {children}
        <Toaster
          position="top-right"
          toastOptions={{
            style: {
              background: '#1a1d2e',
              color: '#e8eaf0',
              border: '1px solid #2a2d3e',
              borderRadius: '12px',
            },
            success: { iconTheme: { primary: '#22c55e', secondary: '#fff' } },
            error:   { iconTheme: { primary: '#ef4444', secondary: '#fff' } },
          }}
        />
      </body>
    </html>
  )
}
