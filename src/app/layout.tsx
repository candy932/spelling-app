import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: '单词听写',
  description: '手机端单词听写应用',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="zh">
      <body>{children}</body>
    </html>
  )
}