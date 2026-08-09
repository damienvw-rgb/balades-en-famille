/**
 * En-têtes de sécurité appliqués à toutes les pages.
 *
 * Le site ne charge que ses propres fichiers, plus les tuiles de carte
 * d'OpenStreetMap, de CyclOSM et d'OpenTopoMap. La politique de contenu dit
 * exactement cela : tout le reste est refusé par le navigateur, y compris un
 * script tiers qui se glisserait dans une page.
 *
 * 'unsafe-inline' reste nécessaire pour les styles (Leaflet et styled-jsx en
 * posent en ligne) et pour le petit script de thème de _document.js, qui doit
 * s'exécuter avant le premier rendu pour éviter le clignotement blanc.
 */
const csp = [
  "default-src 'self'",
  "img-src 'self' data: blob: https://*.tile.openstreetmap.org https://tile.openstreetmap.org https://*.tile-cyclosm.openstreetmap.fr https://*.tile.opentopomap.org",
  "style-src 'self' 'unsafe-inline'",
  "script-src 'self' 'unsafe-inline'",
  "font-src 'self'",
  "connect-src 'self'",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "object-src 'none'",
].join("; ");

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "Content-Security-Policy", value: csp },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          // Aucune de ces fonctions n'est utilisée par le site
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), interest-cohort=()" },
        ],
      },
    ];
  },
};

export default nextConfig;
