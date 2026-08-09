import { id, saveSubmission, slugify } from "@/lib/store";
import { sendMail, siteUrl, usingSmtp } from "@/lib/mailer";
import { createToken } from "@/lib/tokens";
import { inspectContent, checkRateLimit, clientIp, SPAM_MESSAGES } from "@/lib/spam";
import { checkIdentity } from "@/lib/identity";
import { readInfo, readStages, totalKm } from "@/lib/submissionInput";

export const config = { api: { bodyParser: { sizeLimit: "8mb" } } };

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Méthode non autorisée." });
  }

  const b = req.body || {};

  if (!EMAIL_RE.test(String(b.authorEmail || ""))) {
    return res.status(400).json({ error: "Adresse email invalide." });
  }

  const { info, error } = readInfo(b);
  if (error) return res.status(400).json({ error });

  // Un pseudo appartient à une adresse, sur tout le site
  const identity = await checkIdentity(b.author, b.authorEmail);
  if (!identity.ok) {
    return res.status(409).json({ error: identity.error, suggestion: identity.suggestion });
  }
  const author = identity.pseudo;

  const verdict = inspectContent({
    body: `${info.title} ${info.description}`,
    honeypot: b.honeypot,
    renderedAt: b.renderedAt,
  });
  if (!verdict.ok) {
    return res.status(400).json({ error: SPAM_MESSAGES[verdict.reason] || "Proposition refusée." });
  }

  const rate = await checkRateLimit(clientIp(req));
  if (!rate.ok) return res.status(429).json({ error: SPAM_MESSAGES[rate.reason] });

  const stagesRead = readStages(b.stages);
  if (stagesRead.error) return res.status(400).json({ error: stagesRead.error });
  const { stages } = stagesRead;

  const submission = {
    id: id(),
    // Tant que l'adresse n'est pas confirmée, la proposition n'entre pas dans
    // la file de modération : les faux envois ne sont jamais vus.
    status: "unverified",
    createdAt: new Date().toISOString(),
    slug: slugify(info.title),
    author,
    authorEmail: String(b.authorEmail).trim().toLowerCase(),
    info,
    stages,
  };

  await saveSubmission(submission);

  const token = createToken({ kind: "submission", id: submission.id });
  const link = `${siteUrl()}/api/submissions/verify?token=${encodeURIComponent(token)}`;

  await sendMail({
    to: submission.authorEmail,
    subject: "Confirme ta proposition de sortie",
    text: [
      `Bonjour ${author},`,
      "",
      `Tu viens de proposer « ${info.title} » (${stages.length} étape${stages.length > 1 ? "s" : ""}, ${totalKm(stages)} km).`,
      "Clique sur ce lien pour la transmettre :",
      "",
      link,
      "",
      "Elle sera ensuite relue avant publication.",
      "",
      "Ton adresse ne sera jamais affichée sur le site. Elle sert à te prévenir",
      "de la publication et des commentaires que ta sortie recevra.",
      "",
      "Si tu n'es pas à l'origine de cet envoi, ignore ce message.",
    ].join("\n"),
  });

  return res.status(202).json({
    ok: true,
    message: usingSmtp
      ? "Vérifie ta boîte mail : un lien de confirmation t'y attend. Ta sortie sera ensuite relue avant publication."
      : "Sortie enregistrée. SMTP non configuré : le lien de confirmation est affiché dans les logs du serveur.",
  });
}
