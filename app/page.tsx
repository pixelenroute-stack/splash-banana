'use client';

import dynamic from 'next/dynamic';

// Import dynamique pour éviter les problèmes SSR avec Three.js et les APIs browser
const App = dynamic(() => import('../App'), {
  ssr: false,
  loading: () => (
    <div className="h-screen w-screen bg-background flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
        <p className="text-slate-400 text-sm">Chargement de Splash Banana...</p>
      </div>
    </div>
  ),
});

export default function Home() {
  return <App />;
}
