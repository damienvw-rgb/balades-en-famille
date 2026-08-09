/**
 * Plafonds de taille pour l'envoi d'une proposition.
 *
 * Une fonction Vercel refuse un corps de requête au delà de 4,5 Mo, et cette
 * coupure vient de la plateforme : elle se produit avant que le code du site ne
 * reçoive quoi que ce soit, donc sans message compréhensible pour le visiteur.
 * On se place sous ce seuil et on prévient dans le formulaire, avant l'envoi.
 *
 * Ce fichier est partagé par le formulaire et par la route API pour que les
 * deux ne puissent pas diverger.
 */

/** Corps de requête accepté par la route API. */
export const MAX_PAYLOAD_BYTES = 4 * 1024 * 1024;

/**
 * Marge gardée par le formulaire sous le plafond de la route.
 * L'encodage JSON gonfle un peu le texte des traces (guillemets et retours à
 * la ligne échappés), et les autres champs occupent quelques kilo-octets.
 */
export const MAX_PAYLOAD_BYTES_CLIENT = Math.round(MAX_PAYLOAD_BYTES * 0.9);

/** Un seul fichier GPX. Au delà, c'est une trace à simplifier, pas à envoyer. */
export const MAX_FILE_BYTES = 2 * 1024 * 1024;

/** Taille lisible : "3,2 Mo". */
export function formatBytes(bytes) {
  const mo = bytes / (1024 * 1024);
  return `${mo.toFixed(1).replace(".", ",")} Mo`;
}
