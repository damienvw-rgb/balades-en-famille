import { id, saveSubmission, slugify } from "@/lib/store";
import { sendMail, siteUrl, usingSmtp } from "@/lib/mailer";
import { createToken } from "@/lib/tokens";
import { inspectContent, checkRateLimit, clientIp, SPAM_MESSAGES } from "@/lib/spam";
import { parseGpx } from "@/lib/gpx";

export const config = { api: { bodyParser: { sizeLimit: "8mb" } } };

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const MAX_STAGES = 12;

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Méthode non autorisée." });
  }

  const b = req.body || {};

  if (!EMAIL_RE.test(String(b.authorEmail || ""))) {
    return res.status(400).json({ error: "Adresse email invalide." });
  }

  const title = String(b.title || "").trim();
  if (title.length < 3) {
    return res.status(400).json({ error: "Donne un titre à ta sortie." });
  }

  const author = String(b.author || "").trim().slice(0, 40);
  if (author.length < 2) {
    return res.status(400).json({ error: "Choisis un pseudo d'au moins 2 caractères." });
  }

  const verdict = inspectContent({
    body: `${title} ${b.description || ""}`,
    honeypot: b.honeypot,
    renderedAt: b.renderedAt,
  });
  if (!verdict.ok) {
    return res.status(400).json({ error: SPAM_MESSAGES[verdict.reason] || "Proposition refusée." });
  }

  const rate = await checkRateLimit(clientIp(req));
  if (!rate.ok) return res.status(429).json({ error: SPAM_MESSAGES[rate.reason] });

  // --- Étapes et fichiers GPX ---
  const rawStages = Array.isArray(b.stages) ? b.stages.slice(0, MAX_STAGES) : [];
  if (rawStages.length === 0) {
    return res.status(400).json({ error: "Ajoute au moins un fichier GPX." });
  }

  const stages = [];
  for (const [i, stage] of rawStages.entries()) {
    const gpx = String(stage.gpx || "");
    if (!gpx.includes("<trkpt") && !gpx.includes("<rtept")) {
      return res.status(400).json({
        error: `Le fichier de l'étape ${i + 1} ne contient aucun point de trace.`,
      });
    }

    let parsed;
    try {
      parsed = parseGpx(gpx);
    } catch {
      return res.status(400).json({ error: `Fichier GPX illisible à l'étape ${i + 1}.` });
    }

    if (parsed.points.length < 2) {
      return res.status(400).json({ error: `Trace trop courte à l'étape ${i + 1}.` });
    }

    stages.push({
      file: `etape-${i + 1}.gpx`,
      title: String(stage.title || "").trim().slice(0, 120) || (rawStages.length > 1 ? `Étape ${i + 1}` : ""),
      description: String(stage.description || "").trim().slice(0, 2000),
      lodging: stage.lodgingType || stage.lodgingText
        ? {
            type: String(stage.lodgingType || "").trim() || null,
            text: String(stage.lodgingText || "").trim().slice(0, 500) || null,
          }
        : null,
      gpx,
      // Calculé côté serveur pour l'aperçu de modération
      distanceKm: parsed.distanceKm,
      elevationGain: parsed.elevationGain,
    });
  }

  const submission = {
    id: id(),
    // Tant que l'auteur n'a pas confirmé son adresse, la proposition n'entre
    // pas dans la file de modération : tu ne vois donc jamais les faux envois.
    status: "unverified",
    createdAt: new Date().toISOString(),
    slug: slugify(title),
    author,
    // Jamais affiché publiquement : sert à notifier l'auteur des commentaires.
    authorEmail: String(b.authorEmail).trim().toLowerCase(),
    info: {
      title,
      activity: String(b.activity || "velo").trim(),
      date: String(b.date || "").trim() || null,
      country: String(b.country || "").trim() || null,
      region: String(b.region || "").trim() || null,
      difficulty: String(b.difficulty || "").trim() || null,
      description: String(b.description || "").trim().slice(0, 3000),
      participants: b.participants || null,
      gear: Array.isArray(b.gear) ? b.gear.filter(Boolean).slice(0, 20) : null,
    },
    stages,
  };

  await saveSubmission(submission);

  const totalKm =
    Math.round(stages.reduce((s, x) => s + x.distanceKm, 0) * 10) / 10;

  const token = createToken({ kind: "submission", id: submission.id });
  const link = `${siteUrl()}/api/submissions/verify?token=${encodeURIComponent(token)}`;

  await sendMail({
    to: submission.authorEmail,
    subject: "Confirme ta proposition de sortie",
    text: [
      `Bonjour ${author},`,
      "",
      `Tu viens de proposer « ${title} » (${stages.length} étape${stages.length > 1 ? "s" : ""}, ${totalKm} km).`,
      "Clique sur ce lien pour la transmettre :",
      "",
      link,
      "",
      "Elle sera ensuite relue avant publication.",
      "",
      "Ton adresse ne sera jamais affichée sur le site. Elle sert à te prévenir",
      "de la publication et des commentaires que ta sortie recevra.",
      "",
      "Si tu n'es pas à l'origine de cet envoi, ignore ce message : sans",
      "confirmation, la proposition ne sera pas transmise.",
    ].join("\n"),
  });

  return res.status(202).json({
    ok: true,
    message: usingSmtp
      ? "Vérifie ta boîte mail : un lien de confirmation t'y attend. Ta sortie sera ensuite relue avant publication."
      : "Sortie enregistrée. SMTP non configuré : le lien de confirmation est affiché dans les logs du serveur.",
  });
}
