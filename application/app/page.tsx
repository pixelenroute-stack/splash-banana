'use client';

import dynamic from 'next/dynamic';

// Import dynamique pour éviter les problèmes SSR avec les composants qui utilisent window/document
const App = dynamic(() => import('../App'), {
  ssr: false,
  loading: () => (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
    </div>
  ),
});

export default function Home() {
  return <App />;
}
