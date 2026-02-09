
/** @type {import('next').NextConfig} */
const nextConfig = {
  // Le mode standalone crée un dossier optimisé pour la production (réduit la taille de l'upload)
  output: 'standalone',
  
  // Désactive l'optimisation d'image par défaut de Next.js
  // (Recommandé sur Hostinger Shared pour éviter les erreurs si 'sharp' n'est pas installé)
  images: {
    unoptimized: true,
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
    ],
  },
  
  // Permet d'ignorer les erreurs de build TypeScript/ESLint pour garantir que le build se termine
  // (À désactiver si vous voulez un contrôle strict)
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;
