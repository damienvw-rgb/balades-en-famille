import { getRideSummaries } from "@/lib/rides";
import { siteUrl } from "@/lib/site";

/**
 * Plan du site, construit à la demande depuis les sorties présentes dans
 * public/rides/. Rien à tenir à jour à la main : une sortie publiée y entre au
 * déploiement suivant, une sortie retirée en sort.
 *
 * /admin et /proposer en sont volontairement absents, ces pages portent déjà
 * une balise robots noindex.
 */
function buildSitemap(base, rides) {
  const entries = [
    { loc: base, priority: "1.0" },
    { loc: `${base}/contact`, priority: "0.3" },
    { loc: `${base}/mentions-legales`, priority: "0.2" },
    ...rides.map((ride) => ({
      loc: `${base}/rides/${ride.slug}`,
      lastmod: ride.date || null,
      priority: "0.8",
    })),
  ];

  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    ...entries.map(({ loc, lastmod, priority }) =>
      [
        "  <url>",
        `    <loc>${loc}</loc>`,
        lastmod ? `    <lastmod>${lastmod}</lastmod>` : null,
        `    <priority>${priority}</priority>`,
        "  </url>",
      ]
        .filter(Boolean)
        .join("\n")
    ),
    "</urlset>",
    "",
  ].join("\n");
}

export async function getServerSideProps({ res }) {
  const xml = buildSitemap(siteUrl(), getRideSummaries());

  res.setHeader("Content-Type", "application/xml; charset=utf-8");
  res.setHeader("Cache-Control", "public, max-age=0, s-maxage=3600");
  res.write(xml);
  res.end();

  return { props: {} };
}

// Jamais rendu : getServerSideProps a déjà écrit la réponse.
export default function Sitemap() {
  return null;
}
