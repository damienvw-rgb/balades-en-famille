/**
 * Identité publique du site.
 *
 * Regroupée ici parce que trois endroits en ont besoin et qu'ils ne doivent pas
 * se contredire : les liens des emails, les balises de partage des pages et le
 * plan du site. lib/mailer.js s'y branche aussi.
 */

export const SITE_NAME = "Partage de balades familiales";

export const SITE_DESCRIPTION =
  "Un carnet de route de balades parcourues à vélo, à pied ou par tout autre " +
  "moyen, pour donner des idées à d'autres familles.";

/**
 * Adresse publique, sans barre oblique finale.
 * NEXT_PUBLIC_SITE_URL fait foi si elle est définie, sinon Vercel fournit
 * l'adresse de production, sinon on est en local.
 */
export function siteUrl() {
  if (process.env.NEXT_PUBLIC_SITE_URL) {
    return process.env.NEXT_PUBLIC_SITE_URL.replace(/\/$/, "");
  }
  if (process.env.VERCEL_PROJECT_PRODUCTION_URL) {
    return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`;
  }
  return "http://localhost:3000";
}
