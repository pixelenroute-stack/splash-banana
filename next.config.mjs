/** @type {import('next').NextConfig} */
const nextConfig = {
  // Mode standalone pour le déploiement (optimise la taille du bundle)
  output: 'standalone',

  // Désactive l'optimisation d'image par défaut de Next.js
  // (Utile si sharp n'est pas installé sur le serveur de prod)
  images: {
    unoptimized: true,
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
    ],
  },

  // Ignore les erreurs TypeScript/ESLint lors du build
  // (Désactiver pour un contrôle strict en développement)
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },

  // Configuration webpack pour supporter Three.js et les shaders
  webpack: (config, { isServer }) => {
    // Support des fichiers GLSL shaders
    config.module.rules.push({
      test: /\.(glsl|vs|fs|vert|frag)$/,
      use: ['raw-loader'],
    });

    // Fix pour certaines dépendances côté serveur
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
      };
    }

    return config;
  },

  // Headers de sécurité
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
        ],
      },
    ];
  },

  // Redirections
  async redirects() {
    return [];
  },

  // Réécritures (utile pour proxy API)
  async rewrites() {
    return [];
  },
};

export default nextConfig;
