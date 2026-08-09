import { siteUrl } from "@/lib/site";

/**
 * robots.txt généré plutôt que posé en dur dans public/ : il doit citer
 * l'adresse du plan du site, qui dépend du domaine sur lequel le site tourne.
 *
 * /admin et /proposer sont écartés de l'indexation, comme le disent déjà leurs
 * balises robots. Les routes API n'ont rien à faire dans un moteur de recherche.
 */
export async function getServerSideProps({ res }) {
  const body = [
    "User-agent: *",
    "Allow: /",
    "Disallow: /admin",
    "Disallow: /proposer",
    "Disallow: /api/",
    "",
    `Sitemap: ${siteUrl()}/sitemap.xml`,
    "",
  ].join("\n");

  res.setHeader("Content-Type", "text/plain; charset=utf-8");
  res.setHeader("Cache-Control", "public, max-age=0, s-maxage=86400");
  res.write(body);
  res.end();

  return { props: {} };
}

export default function Robots() {
  return null;
}
