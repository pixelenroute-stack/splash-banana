/** @type {import('next').NextConfig} */
const nextConfig = {
  // Mode standalone pour le déploiement (optimise la taille du bundle)
  output: 'standalone',

  // Désactive l'optimisation d'image (économise mémoire + pas besoin de sharp)
  images: {
    unoptimized: true,
  },

  // Ignore les erreurs TypeScript/ESLint lors du build
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },

  // Optimisations pour environnements à mémoire limitée
  swcMinify: true,

  // Désactive la génération de source maps en production
  productionBrowserSourceMaps: false,

  // Désactive le powered by header
  poweredByHeader: false,

  // Désactive la compression (sera gérée par le serveur)
  compress: false,

  // Configuration webpack simplifiée
  webpack: (config, { isServer }) => {
    // Fix pour certaines dépendances côté serveur
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
      };
    }

    // Optimisation mémoire
    config.optimization = {
      ...config.optimization,
      minimize: true,
    };

    return config;
  },

  // Expérimental: réduire le bundle
  experimental: {
    optimizePackageImports: [
      'lucide-react',
      '@radix-ui/react-icons',
      'recharts',
      'date-fns',
    ],
  },
};

export default nextConfig;
