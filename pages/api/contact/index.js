import { id, saveMessage } from "@/lib/store";
import { createToken } from "@/lib/tokens";
import { sendMail, siteUrl, usingSmtp } from "@/lib/mailer";
import { inspectContent, checkRateLimit, clientIp, SPAM_MESSAGES } from "@/lib/spam";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export const SUBJECTS = {
  bug: "Signaler un problème",
  amelioration: "Proposer une amélioration",
  modification: "Modifier ou retirer un contenu que j'ai publié",
  contenu: "Signaler un contenu inapproprié",
  autre: "Autre",
};

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Méthode non autorisée." });
  }

  const { subject, email, name, body, honeypot, renderedAt } = req.body || {};

  if (!EMAIL_RE.test(String(email || ""))) {
    return res.status(400).json({ error: "Adresse email invalide." });
  }

  const key = String(subject || "").trim();
  if (!SUBJECTS[key]) {
    return res.status(400).json({ error: "Choisis un motif." });
  }

  const verdict = inspectContent({ body, honeypot, renderedAt });
  if (!verdict.ok) {
    return res.status(400).json({ error: SPAM_MESSAGES[verdict.reason] || "Message refusé." });
  }

  const rate = await checkRateLimit(clientIp(req));
  if (!rate.ok) return res.status(429).json({ error: SPAM_MESSAGES[rate.reason] });

  const message = {
    id: id(),
    status: "unverified",
    createdAt: new Date().toISOString(),
    subject: key,
    subjectLabel: SUBJECTS[key],
    name: String(name || "").trim().slice(0, 60) || null,
    email: String(email).trim().toLowerCase(),
    body: String(body).trim().slice(0, 4000),
  };

  await saveMessage(message);

  const token = createToken({ kind: "message", id: message.id });
  const link = `${siteUrl()}/api/contact/verify?token=${encodeURIComponent(token)}`;

  await sendMail({
    to: message.email,
    subject: "Confirme ton message",
    text: [
      "Bonjour,",
      "",
      "Tu viens d'envoyer un message via le formulaire de contact.",
      "Clique sur ce lien pour le transmettre :",
      "",
      link,
      "",
      "Sans ce clic, le message ne sera pas transmis.",
      "",
      "Si tu n'es pas à l'origine de cet envoi, ignore ce message.",
    ].join("\n"),
  });

  return res.status(202).json({
    ok: true,
    message: usingSmtp
      ? "Vérifie ta boîte mail et clique sur le lien pour transmettre ton message."
      : "Message enregistré. SMTP non configuré : le lien de confirmation est dans les logs du serveur.",
  });
}
