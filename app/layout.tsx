import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Base Attribution Monitor',
  description: 'Base Mini App 归因监控看板',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh">
      <body>{children}</body>
    </html>
  )
}
