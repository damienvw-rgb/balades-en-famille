import crypto from "crypto";
import { storage } from "./storage";
import { hashEmail } from "./tokens";

export const id = () => crypto.randomUUID();

// --- Commentaires -----------------------------------------------------------
// Clé : comments/<rideSlug>/<id>
// Un commentaire peut répondre à un autre via parentId, ce qui forme un fil.

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

/**
 * Toutes les adresses à prévenir quand un message arrive dans un fil :
 * l'auteur du message d'origine et tous ceux qui y ont déjà répondu,
 * sauf celui qui vient d'écrire.
 */
export async function threadParticipants(ride, rootId, exceptEmail) {
  const all = await listComments(ride);
  const root = all.find((c) => c.id === rootId);
  const emails = new Set();

  if (root?.email) emails.add(root.email);
  for (const c of all) {
    if (c.parentId === rootId && c.email && c.status === "published") {
      emails.add(c.email);
    }
  }

  if (exceptEmail) emails.delete(String(exceptEmail).toLowerCase());
  return [...emails];
}

/** Version expurgée, seule à sortir des API publiques. */
export function publicComment(c) {
  return {
    id: c.id,
    ride: c.ride,
    stage: c.stage || null,
    parentId: c.parentId || null,
    pseudo: c.pseudo,
    body: c.body,
    createdAt: c.createdAt,
  };
}

// --- Sorties proposées ------------------------------------------------------
// Statuts : unverified | pending | approved | rejected

export async function saveSubmission(submission) {
  await storage.put(`submissions/${submission.id}`, submission);
  return submission;
}

export async function getSubmission(submissionId) {
  return storage.get(`submissions/${submissionId}`);
}

export async function listSubmissions(status = null) {
  const all = await storage.list("submissions");
  const sorted = all.sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || ""));
  return status ? sorted.filter((s) => s.status === status) : sorted;
}

export async function deleteSubmission(submissionId) {
  await storage.del(`submissions/${submissionId}`);
}

// --- Messages de contact ----------------------------------------------------

export async function saveMessage(message) {
  await storage.put(`messages/${message.id}`, message);
  return message;
}

export async function getMessage(messageId) {
  return storage.get(`messages/${messageId}`);
}

export async function listMessages() {
  const all = await storage.list("messages");
  return all
    .filter((m) => m.status !== "unverified")
    .sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || ""));
}

export async function deleteMessage(messageId) {
  await storage.del(`messages/${messageId}`);
}

// --- Utilitaires ------------------------------------------------------------

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
