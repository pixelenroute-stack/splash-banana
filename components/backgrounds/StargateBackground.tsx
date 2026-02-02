import React, { Suspense } from 'react';
import dynamic from 'next/dynamic';

// Lazy load avec SSR false pour éviter les erreurs de hydration sur le Canvas
// et ne pas bloquer le thread principal au chargement de la page.
const Scene = dynamic(() => import('./StargateScene'), { 
  ssr: false,
  loading: () => <div className="w-full h-full bg-[#020617]" />
});

export const StargateBackground: React.FC = () => {
  return (
    <div className="fixed inset-0 z-0 w-full h-full pointer-events-none" aria-hidden="true">
      <Suspense fallback={<div className="w-full h-full bg-[#020617]" />}>
        <Scene />
      </Suspense>
      
      {/* Overlay Vignette/Gradient pour assurer la lisibilité du texte par-dessus la 3D */}
      <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-background/80 z-10" />
      <div 
        className="absolute inset-0 z-10 pointer-events-none"
        style={{
          backgroundImage: 'radial-gradient(circle at center, transparent 30%, #0f172a 100%)'
        }}
      />
    </div>
  );
};