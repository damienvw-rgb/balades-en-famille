import { storage } from "./storage.js";
import { hashEmail } from "./tokens.js";

/**
 * Association pseudo <-> adresse email, valable pour tout le site
 * (commentaires, propositions de sorties, messages de contact).
 *
 * Objectif : empêcher qu'on écrive sous le pseudo de quelqu'un d'autre.
 * Le lien n'est enregistré qu'après confirmation de l'adresse, sinon il
 * suffirait d'envoyer un formulaire avec une fausse adresse pour réserver
 * un pseudo qu'on ne possède pas.
 *
 * Deux entrées miroir sont tenues à jour :
 *   identities/<empreinte email> -> { pseudo }
 *   pseudos/<pseudo normalisé>   -> { emailHash }
 */

/** Insensible à la casse, aux accents et aux espaces multiples. */
export function normalizePseudo(pseudo) {
  return String(pseudo || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

export async function pseudoForEmail(email) {
  const record = await storage.get(`identities/${hashEmail(email)}`);
  return record?.pseudo || null;
}

export async function emailHashForPseudo(pseudo) {
  const record = await storage.get(`pseudos/${normalizePseudo(pseudo)}`);
  return record?.emailHash || null;
}

/**
 * Vérifie qu'un couple pseudo/email est cohérent avec ce qui est déjà connu.
 * Renvoie { ok: true } ou { ok: false, error, suggestion }.
 */
export async function checkIdentity(pseudo, email) {
  const clean = String(pseudo || "").trim();
  const key = normalizePseudo(clean);
  if (key.length < 2) {
    return { ok: false, error: "Choisis un pseudo d'au moins 2 caractères." };
  }

  // Un pseudo n'est jamais une adresse email. Ça évite qu'une adresse s'affiche
  // sur le site, et ça ferme la porte à qui voudrait deviner, en soumettant une
  // adresse comme pseudo, si elle a déjà servi ici.
  if (clean.includes("@")) {
    return { ok: false, error: "Le pseudo ne peut pas être une adresse email." };
  }

  const myHash = hashEmail(email);
  const [knownPseudo, ownerHash] = await Promise.all([
    pseudoForEmail(email),
    emailHashForPseudo(clean),
  ]);

  // Cette adresse a déjà écrit sous un autre pseudo
  if (knownPseudo && normalizePseudo(knownPseudo) !== key) {
    return {
      ok: false,
      error: `Cette adresse email est déjà associée au pseudo « ${knownPseudo} ». Utilise celui-ci pour rester reconnaissable.`,
      suggestion: knownPseudo,
    };
  }

  // Ce pseudo appartient à quelqu'un d'autre
  if (ownerHash && ownerHash !== myHash) {
    return {
      ok: false,
      error: "Ce pseudo est déjà utilisé par quelqu'un d'autre. Choisis-en un autre.",
    };
  }

  return { ok: true, pseudo: clean };
}

/** Enregistre le lien. À n'appeler qu'une fois l'adresse confirmée. */
export async function bindIdentity(pseudo, email) {
  const clean = String(pseudo || "").trim();

  // Garde-fou : les deux arguments sont des chaînes, rien ne signale une
  // inversion à l'appel. Une adresse email arrivée en position de pseudo
  // finirait écrite en clair dans le stockage, sous une clé de pseudo.
  if (clean.includes("@")) {
    throw new Error("bindIdentity attend (pseudo, email), pas l'inverse.");
  }

  const emailHash = hashEmail(email);

  await storage.put(`identities/${emailHash}`, {
    pseudo: clean,
    boundAt: new Date().toISOString(),
  });
  await storage.put(`pseudos/${normalizePseudo(clean)}`, {
    emailHash,
    boundAt: new Date().toISOString(),
  });
}
