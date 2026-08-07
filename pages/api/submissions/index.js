import { id, saveSubmission, slugify } from "@/lib/store";
import { sendMail, siteUrl, usingSmtp } from "@/lib/mailer";
import { createToken } from "@/lib/tokens";
import { inspectContent, checkRateLimit, clientIp, SPAM_MESSAGES } from "@/lib/spam";
import { checkIdentity } from "@/lib/identity";
import { ACTIVITIES, DIFFICULTIES } from "@/lib/activities";
import { gearEmoji, isKnownGearEmoji } from "@/lib/gear";
import { parseGpx } from "@/lib/gpx";

export const config = { api: { bodyParser: { sizeLimit: "8mb" } } };

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const MAX_STAGES = 12;

/** { adults: 2, children: [8, 11], childrenCount: 3 } vers la forme du site. */
function normalizeParticipants(raw) {
  if (!raw) return null;
  const adults = Math.max(0, Math.min(12, parseInt(raw.adults, 10) || 0));

  const ages = Array.isArray(raw.children)
    ? raw.children
        .map((a) => parseInt(a, 10))
        .filter((n) => Number.isFinite(n) && n >= 0 && n <= 25)
    : [];
  const declared = Math.max(0, Math.min(12, parseInt(raw.childrenCount, 10) || 0));
  const childrenCount = Math.max(declared, ages.length);

  if (adults === 0 && childrenCount === 0) return null;

  const out = {};
  if (adults > 0) out.adults = adults;
  // Les âges ne sont conservés que s'ils sont tous renseignés, sinon on ne
  // garde que le nombre : mieux vaut pas d'âge du tout qu'une liste incomplète.
  if (childrenCount > 0) {
    out.children = ages.length === childrenCount ? ages : childrenCount;
  }
  return out;
}

/**
 * Chaque ligne saisie reçoit son pictogramme.
 * Il est déduit de l'intitulé, sauf si le visiteur en a choisi un dans la
 * palette du formulaire. Le choix n'est retenu que s'il fait partie de cette
 * palette : rien d'arbitraire ne peut ainsi finir dans un fichier de public/.
 */
function normalizeGear(raw) {
  if (!Array.isArray(raw)) return null;
  const items = raw
    .map((item) => {
      const source = typeof item === "string" ? { label: item } : item || {};
      const label = String(source.label || "").trim().slice(0, 60);
      if (!label) return null;
      const chosen = String(source.emoji || "").trim();
      return { emoji: isKnownGearEmoji(chosen) ? chosen : gearEmoji(label), label };
    })
    .filter(Boolean)
    .slice(0, 20);
  return items.length > 0 ? items : null;
}

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

  const activity = String(b.activity || "").trim().toLowerCase();
  if (!activity || !ACTIVITIES[activity]) {
    return res.status(400).json({ error: "Choisis un type d'activité." });
  }

  const country = String(b.country || "").trim();
  if (country.length < 2) {
    return res.status(400).json({ error: "Le pays est obligatoire." });
  }

  // Un pseudo appartient à une adresse, sur tout le site
  const identity = await checkIdentity(b.author, b.authorEmail);
  if (!identity.ok) {
    return res.status(409).json({ error: identity.error, suggestion: identity.suggestion });
  }
  const author = identity.pseudo;

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

    const declaredTitle = String(stage.title || "").trim().slice(0, 120);

    stages.push({
      file: `etape-${i + 1}.gpx`,
      title: declaredTitle || (rawStages.length > 1 ? `Étape ${i + 1}` : ""),
      description: String(stage.description || "").trim().slice(0, 2000),
      lodging:
        stage.lodgingType || stage.lodgingText
          ? {
              type: String(stage.lodgingType || "").trim() || null,
              text: String(stage.lodgingText || "").trim().slice(0, 500) || null,
            }
          : null,
      gpx,
      distanceKm: parsed.distanceKm,
      elevationGain: parsed.elevationGain,
    });
  }

  const difficulty = String(b.difficulty || "").trim();

  const submission = {
    id: id(),
    // Tant que l'adresse n'est pas confirmée, la proposition n'entre pas dans
    // la file de modération : les faux envois ne sont jamais vus.
    status: "unverified",
    createdAt: new Date().toISOString(),
    slug: slugify(title),
    author,
    authorEmail: String(b.authorEmail).trim().toLowerCase(),
    info: {
      title,
      activity,
      date: String(b.date || "").trim() || null,
      country,
      region: String(b.region || "").trim() || null,
      difficulty: DIFFICULTIES.includes(difficulty) ? difficulty : null,
      description: String(b.description || "").trim().slice(0, 3000),
      participants: normalizeParticipants(b.participants),
      gear: normalizeGear(b.gear),
    },
    stages,
  };

  await saveSubmission(submission);

  const totalKm = Math.round(stages.reduce((s, x) => s + x.distanceKm, 0) * 10) / 10;
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
