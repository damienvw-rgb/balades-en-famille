import { id, saveComment, listPublishedComments, publicComment, slugify } from "@/lib/store";
import { createToken, hashEmail } from "@/lib/tokens";
import { sendMail, siteUrl, usingSmtp } from "@/lib/mailer";
import { inspectContent, checkRateLimit, clientIp, SPAM_MESSAGES } from "@/lib/spam";
import { getRideAuthor } from "@/lib/rides";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export default async function handler(req, res) {
  if (req.method === "GET") {
    const ride = slugify(req.query.ride || "");
    if (!ride) return res.status(400).json({ error: "Sortie non précisée." });
    const comments = (await listPublishedComments(ride)).map(publicComment);
    return res.status(200).json({ comments });
  }

  if (req.method !== "POST") {
    res.setHeader("Allow", "GET, POST");
    return res.status(405).json({ error: "Méthode non autorisée." });
  }

  const { ride, stage, pseudo, email, body, honeypot, renderedAt } = req.body || {};

  const rideSlug = slugify(ride || "");
  if (!rideSlug) return res.status(400).json({ error: "Sortie non précisée." });

  if (!EMAIL_RE.test(String(email || ""))) {
    return res.status(400).json({ error: "Adresse email invalide." });
  }

  const cleanPseudo = String(pseudo || "").trim().slice(0, 40);
  if (cleanPseudo.length < 2) {
    return res.status(400).json({ error: "Choisis un pseudo d'au moins 2 caractères." });
  }

  // Filtrage anti-spam avant toute écriture
  const verdict = inspectContent({ body, honeypot, renderedAt });
  if (!verdict.ok) {
    return res.status(400).json({ error: SPAM_MESSAGES[verdict.reason] || "Message refusé." });
  }

  const rate = await checkRateLimit(clientIp(req));
  if (!rate.ok) {
    return res.status(429).json({ error: SPAM_MESSAGES[rate.reason] });
  }

  const comment = {
    id: id(),
    ride: rideSlug,
    stage: stage ? String(stage).slice(0, 120) : null,
    pseudo: cleanPseudo,
    // L'adresse sert à la vérification et à rien d'autre. Elle n'est jamais
    // renvoyée par les API publiques (voir publicComment).
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
    subject: "Confirme ton commentaire",
    text: [
      `Bonjour ${cleanPseudo},`,
      "",
      "Tu viens d'écrire un commentaire sur Nos balades en famille.",
      "Clique sur ce lien pour le publier :",
      "",
      link,
      "",
      "Ton adresse email ne sera jamais affichée sur le site, elle sert",
      "uniquement à cette confirmation.",
      "",
      "Si tu n'es pas à l'origine de ce message, ignore-le : sans confirmation,",
      "le commentaire ne sera pas publié.",
    ].join("\n"),
  });

  return res.status(202).json({
    ok: true,
    message: usingSmtp
      ? "Vérifie ta boîte mail et clique sur le lien pour publier ton commentaire."
      : "Commentaire enregistré. SMTP non configuré : le lien de confirmation est affiché dans les logs du serveur.",
  });
}
