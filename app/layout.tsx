export const metadata = {
  title: 'FindOrigin Bot',
  description: 'Telegram bot for finding information sources',
}

import './globals.css'

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ru">
      <body>{children}</body>
    </html>
  )
}
