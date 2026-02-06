import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Splash Banana - Studio de Production',
  description: 'Application de gestion de production audiovisuelle avec IA',
  icons: {
    icon: '/favicon.ico',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="fr" suppressHydrationWarning>
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="bg-background text-slate-100 antialiased">
        {children}
      </body>
    </html>
  );
}
