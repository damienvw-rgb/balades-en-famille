/**
 * Lien de modification d'une sortie.
 *
 * Le jeton signé porte l'identifiant de la sortie : posséder le lien suffit
 * pour proposer une correction, sans mot de passe ni compte à créer. Il n'est
 * jamais publié, il n'arrive que dans la boîte mail de l'auteur, celle qui a
 * déjà été confirmée au dépôt de la sortie.
 *
 * Trois mois de validité : assez long pour retrouver le message des semaines
 * plus tard, assez court pour qu'un lien oublié dans une boîte mail finisse par
 * ne plus rien ouvrir. Passé ce délai, /sortie/modifier permet d'en redemander
 * un nouveau.
 */
import { createToken } from "./tokens";
import { siteUrl } from "./mailer";

export const EDIT_TTL_SECONDS = 60 * 60 * 24 * 90;

export function editUrl(submissionId) {
  const token = createToken({ kind: "edit", id: submissionId }, EDIT_TTL_SECONDS);
  return `${siteUrl()}/sortie/modifier?token=${encodeURIComponent(token)}`;
}

/** Adresse publique de la sortie une fois publiée. */
export function rideUrl(slug) {
  return `${siteUrl()}/rides/${slug}`;
}
