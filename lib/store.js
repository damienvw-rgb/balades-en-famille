import crypto from "crypto";
import { storage } from "./storage";
import { hashEmail } from "./tokens";

export const id = () => crypto.randomUUID();

// --- Commentaires -----------------------------------------------------------
// Clé : comments/<rideSlug>/<id>
// L'adresse email n'est jamais renvoyée au navigateur (voir publicComment).

export async function saveComment(comment) {
  await storage.put(`comments/${comment.ride}/${comment.id}`, comment);
  return comment;
}

export async function getComment(ride, commentId) {
  return storage.get(`comments/${ride}/${commentId}`);
}

export async function listComments(ride) {
  const all = await storage.list(`comments/${ride}`);
  return all.sort((a, b) => (a.createdAt || "").localeCompare(b.createdAt || ""));
}

export async function listPublishedComments(ride) {
  return (await listComments(ride)).filter((c) => c.status === "published");
}

export async function deleteComment(ride, commentId) {
  await storage.del(`comments/${ride}/${commentId}`);
}

/** Version expurgée, seule à sortir des API publiques. */
export function publicComment(c) {
  return {
    id: c.id,
    ride: c.ride,
    stage: c.stage || null,
    pseudo: c.pseudo,
    body: c.body,
    createdAt: c.createdAt,
  };
}

// --- Sorties proposées ------------------------------------------------------
// Clé : submissions/<id>. Statuts : pending | approved | rejected

export async function saveSubmission(submission) {
  await storage.put(`submissions/${submission.id}`, submission);
  return submission;
}

export async function getSubmission(submissionId) {
  return storage.get(`submissions/${submissionId}`);
}

export async function listSubmissions(status = null) {
  const all = await storage.list("submissions");
  const sorted = all.sort((a, b) =>
    (b.createdAt || "").localeCompare(a.createdAt || "")
  );
  return status ? sorted.filter((s) => s.status === status) : sorted;
}

export async function deleteSubmission(submissionId) {
  await storage.del(`submissions/${submissionId}`);
}

// --- Utilitaires ------------------------------------------------------------

/** Transforme un titre en identifiant d'URL : "Boucle de l'Ourthe" -> "boucle-de-l-ourthe" */
export function slugify(text) {
  return String(text)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

export { hashEmail };
