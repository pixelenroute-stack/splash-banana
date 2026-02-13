import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Splash Banana - Plateforme SaaS',
  description: 'Plateforme de gestion et création assistée par IA',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="fr" className="dark">
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=Orbitron:wght@400;700&family=Rajdhani:wght@300;500;700&family=Inter:wght@300;400;500;600;700&family=Fira+Code:wght@400;500&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="font-sans antialiased bg-background text-white min-h-screen">
        {children}
      </body>
    </html>
  )
}
