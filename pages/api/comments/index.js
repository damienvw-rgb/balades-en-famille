import { id, saveComment, listPublishedComments, publicComment, slugify, getComment } from "@/lib/store";
import { createToken, hashEmail } from "@/lib/tokens";
import { sendMail, siteUrl, usingSmtp } from "@/lib/mailer";
import { inspectContent, checkRateLimit, clientIp, SPAM_MESSAGES } from "@/lib/spam";
import { checkIdentity } from "@/lib/identity";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export default async function handler(req, res) {
  if (req.method === "GET") {
    const ride = slugify(req.query.ride || "");
    if (!ride) return res.status(400).json({ error: "Sortie non précisée." });
    return res.status(200).json({
      comments: (await listPublishedComments(ride)).map(publicComment),
    });
  }

  if (req.method !== "POST") {
    res.setHeader("Allow", "GET, POST");
    return res.status(405).json({ error: "Méthode non autorisée." });
  }

  const { ride, stage, pseudo, email, body, honeypot, renderedAt, parentId } = req.body || {};

  const rideSlug = slugify(ride || "");
  if (!rideSlug) return res.status(400).json({ error: "Sortie non précisée." });

  if (!EMAIL_RE.test(String(email || ""))) {
    return res.status(400).json({ error: "Adresse email invalide." });
  }

  // Un pseudo appartient à une adresse : on ne peut pas écrire sous celui d'un autre
  const identity = await checkIdentity(pseudo, email);
  if (!identity.ok) {
    return res.status(409).json({ error: identity.error, suggestion: identity.suggestion });
  }

  const verdict = inspectContent({ body, honeypot, renderedAt });
  if (!verdict.ok) {
    return res.status(400).json({ error: SPAM_MESSAGES[verdict.reason] || "Message refusé." });
  }

  const rate = await checkRateLimit(clientIp(req));
  if (!rate.ok) return res.status(429).json({ error: SPAM_MESSAGES[rate.reason] });

  // Une réponse se rattache toujours au message racine, pas à une autre réponse :
  // le fil reste à deux niveaux, lisible sans indentation infinie.
  let rootId = null;
  if (parentId) {
    const parent = await getComment(rideSlug, parentId);
    if (!parent) return res.status(400).json({ error: "Message d'origine introuvable." });
    rootId = parent.parentId || parent.id;
  }

  const comment = {
    id: id(),
    ride: rideSlug,
    parentId: rootId,
    stage: rootId ? null : stage ? String(stage).slice(0, 120) : null,
    pseudo: identity.pseudo,
    email: String(email).trim().toLowerCase(),
    emailHash: hashEmail(email),
    body: String(body).trim(),
    status: "pending",
    createdAt: new Date().toISOString(),
  };

  await saveComment(comment);

  const token = createToken({ kind: "comment", ride: rideSlug, id: comment.id });
  const link = `${siteUrl()}/api/comments/verify?token=${encodeURIComponent(token)}`;

  await sendMail({
    to: comment.email,
    subject: rootId ? "Confirme ta réponse" : "Confirme ton commentaire",
    text: [
      `Bonjour ${identity.pseudo},`,
      "",
      rootId
        ? "Tu viens de répondre à un commentaire sur Partage de balades familiales."
        : "Tu viens d'écrire un commentaire sur Partage de balades familiales.",
      "Clique sur ce lien pour le publier :",
      "",
      link,
      "",
      "Ton adresse email ne sera jamais affichée. Elle sert à cette confirmation",
      "et à te prévenir si quelqu'un répond.",
      "",
      "Si tu n'es pas à l'origine de ce message, ignore-le.",
    ].join("\n"),
  });

  return res.status(202).json({
    ok: true,
    message: usingSmtp
      ? "Vérifie ta boîte mail et clique sur le lien pour publier."
      : "Enregistré. SMTP non configuré : le lien de confirmation est dans les logs du serveur.",
  });
}
