import { storage } from "./storage";
import { hashEmail } from "./tokens";

/**
 * Association pseudo <-> adresse email, valable pour tout le site
 * (commentaires, propositions de sorties, messages de contact).
 *
 * Objectif : empêcher qu'on écrive sous le pseudo de quelqu'un d'autre.
 * Le lien n'est enregistré qu'après confirmation de l'adresse, sinon il
 * suffirait d'envoyer un formulaire avec une fausse adresse pour réserver
 * un pseudo qu'on ne possède pas.
 *
 * Le pseudo n'est pas figé pour autant : une adresse déjà connue peut en
 * choisir un autre au moment d'écrire un commentaire ou de proposer une
 * sortie. Le changement ne prend effet qu'une fois le lien de confirmation
 * cliqué, et il s'applique alors partout où cette adresse a publié, y compris
 * sur ses anciens messages : c'est toujours le dernier pseudo confirmé qui
 * est affiché.
 *
 * Deux entrées miroir sont tenues à jour :
 *   identities/<empreinte email> -> { pseudo, previous: [...] }
 *   pseudos/<pseudo normalisé>   -> { emailHash }
 *
 * Les anciens pseudos gardent leur entrée pseudos/ : ils restent réservés à
 * la même adresse, personne ne peut récupérer un pseudo abandonné pour se
 * faire passer pour son ancien porteur.
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
 * Vérifie qu'un couple pseudo/email est acceptable.
 *
 * Renvoie { ok: false, error } si le pseudo appartient à quelqu'un d'autre,
 * sinon { ok: true, pseudo } avec deux indications facultatives :
 *   known    l'adresse est connue et garde le même pseudo
 *   rename   l'adresse est connue sous un autre pseudo, celui-ci le remplacera
 *            une fois l'email confirmé (avec notice, un texte prêt à afficher)
 */
export async function checkIdentity(pseudo, email) {
  const clean = String(pseudo || "").trim();
  const key = normalizePseudo(clean);
  if (key.length < 2) {
    return { ok: false, error: "Choisis un pseudo d'au moins 2 caractères." };
  }

  const myHash = hashEmail(email);
  const [knownPseudo, ownerHash] = await Promise.all([
    pseudoForEmail(email),
    emailHashForPseudo(clean),
  ]);

  // Ce pseudo appartient à quelqu'un d'autre
  if (ownerHash && ownerHash !== myHash) {
    return {
      ok: false,
      error: "Ce pseudo est déjà utilisé par quelqu'un d'autre. Choisis-en un autre.",
      suggestion: knownPseudo || undefined,
    };
  }

  // Cette adresse est connue sous un autre pseudo : c'est un changement de nom,
  // pas une usurpation. Il sera appliqué à la confirmation de l'email.
  if (knownPseudo && normalizePseudo(knownPseudo) !== key) {
    return {
      ok: true,
      pseudo: clean,
      known: true,
      rename: knownPseudo,
      notice:
        `Tu publiais jusqu'ici sous « ${knownPseudo} ». En confirmant l'email, ` +
        `« ${clean} » le remplacera partout où tu as publié sur le site.`,
      suggestion: knownPseudo,
    };
  }

  return { ok: true, pseudo: clean, known: Boolean(knownPseudo) };
}

/**
 * Enregistre le lien. À n'appeler qu'une fois l'adresse confirmée.
 *
 * Renvoie { changed, from, to } : changed indique un changement de pseudo,
 * à propager au reste du site (voir applyPseudoEverywhere).
 */
export async function bindIdentity(pseudo, email) {
  const clean = String(pseudo || "").trim();
  if (normalizePseudo(clean).length < 2) return { changed: false, from: null, to: null };

  const emailHash = hashEmail(email);
  const now = new Date().toISOString();
  const existing = await storage.get(`identities/${emailHash}`);
  const previousPseudo = existing?.pseudo || null;
  const changed = Boolean(previousPseudo) && normalizePseudo(previousPseudo) !== normalizePseudo(clean);

  // Historique des anciens pseudos, sans doublon : il sert à retrouver
  // l'origine d'un pseudo réservé et à comprendre un renommage depuis /admin.
  const previous = Array.isArray(existing?.previous) ? [...existing.previous] : [];
  if (changed && !previous.some((p) => normalizePseudo(p.pseudo) === normalizePseudo(previousPseudo))) {
    previous.push({ pseudo: previousPseudo, until: now });
  }

  await storage.put(`identities/${emailHash}`, {
    pseudo: clean,
    boundAt: existing?.boundAt || now,
    updatedAt: now,
    previous,
  });

  // L'ancienne entrée n'est pas supprimée : le pseudo abandonné reste réservé
  // à cette adresse, donc indisponible pour un tiers.
  await storage.put(`pseudos/${normalizePseudo(clean)}`, {
    emailHash,
    boundAt: now,
  });

  return { changed, from: previousPseudo, to: clean };
}

/**
 * Pseudos affichables pour un lot d'empreintes d'adresses.
 *
 * C'est ce qui permet à un ancien commentaire de porter le pseudo actuel de
 * son auteur : le nom écrit dans l'enregistrement ne sert plus que de repli,
 * pour les contenus déposés avant l'existence de cette table.
 */
export async function currentPseudos(hashes) {
  const unique = [...new Set((hashes || []).filter(Boolean))];
  const entries = await Promise.all(
    unique.map(async (hash) => [hash, (await storage.get(`identities/${hash}`))?.pseudo || null])
  );
  return new Map(entries.filter(([, pseudo]) => pseudo));
}

/** Pseudo actuel d'une empreinte, ou le nom d'origine si l'adresse est inconnue. */
export async function currentPseudo(emailHash, fallback = null) {
  if (!emailHash) return fallback;
  const record = await storage.get(`identities/${emailHash}`);
  return record?.pseudo || fallback;
}

/**
 * Reporte un nouveau pseudo sur les sorties déjà déposées par cette adresse.
 *
 * Les commentaires, eux, n'ont rien à réécrire : ils sont servis par une route
 * API qui résout le pseudo à la lecture. Une sortie est au contraire figée
 * dans public/rides/ au moment du build, son auteur doit donc être corrigé
 * dans le stockage, et le site reconstruit si elle est déjà en ligne.
 *
 * Renvoie { updated, published } : le nombre de sorties renommées, et parmi
 * elles le nombre de sorties publiées, qui seules justifient un redéploiement.
 */
export async function applyPseudoToSubmissions(email, pseudo) {
  const { listSubmissions, saveSubmission, listRevisions, saveRevision } = await import("./store");
  const target = String(email).trim().toLowerCase();
  const clean = String(pseudo || "").trim();

  let updated = 0;
  let published = 0;
  const mine = new Set();

  for (const submission of await listSubmissions()) {
    if (String(submission.authorEmail || "").toLowerCase() !== target) continue;
    mine.add(submission.id);
    if (submission.author === clean) continue;
    submission.author = clean;
    await saveSubmission(submission);
    updated += 1;
    if (submission.status === "approved") published += 1;
  }

  // Une modification en attente de relecture porte elle aussi le nom de son
  // auteur : sans ça, la relecture republierait l'ancien pseudo. Une révision
  // ne garde pas l'adresse de l'auteur, elle est reliée à sa sortie d'origine.
  for (const revision of await listRevisions()) {
    if (!mine.has(revision.submissionId) || revision.author === clean) continue;
    revision.author = clean;
    await saveRevision(revision);
  }

  return { updated, published };
}
