/**
 * Motifs proposés par le formulaire de contact.
 *
 * Une seule liste pour les deux côtés : le formulaire affiche ces libellés et
 * la route API valide la clé reçue puis enregistre le libellé correspondant.
 * Quand les deux listes vivaient chacune de leur côté, l'intitulé montré au
 * visiteur et celui rangé dans le message avaient déjà commencé à diverger.
 */
export const CONTACT_SUBJECTS = {
  bug: "Signaler un problème sur le site",
  amelioration: "Proposer une amélioration",
  modification: "Modifier ou retirer un contenu que j'ai publié",
  contenu: "Signaler un contenu inapproprié",
  autre: "Autre",
};
