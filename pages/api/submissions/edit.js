/**
 * Modification d'une sortie par son auteur.
 *
 * GET  ?token=...  renvoie la sortie sous la forme attendue par le formulaire
 * POST { token, ... } enregistre la version retouchée
 *
 * Le jeton signé tient lieu d'authentification : il n'est parti que vers
 * l'adresse confirmée de l'auteur. Cette adresse ne repart jamais vers le
 * navigateur, pas plus ici qu'ailleurs.
 *
 * Une sortie déjà publiée n'est pas réécrite d'office : la version retouchée
 * est mise de côté et attend la relecture, la page en ligne reste inchangée.
 * Une sortie encore en attente de validation n'a jamais été publiée, sa
 * modification est donc appliquée tout de suite : elle sera de toute façon
 * relue avant de paraître.
 */
import { readToken } from "@/lib/tokens";
import { getSubmission, saveSubmission, saveRevision, getRevision } from "@/lib/store";
import { sendMail, siteUrl } from "@/lib/mailer";
import { inspectContent, checkRateLimit, clientIp, SPAM_MESSAGES } from "@/lib/spam";
import { readInfo, readStages, totalKm } from "@/lib/submissionInput";
import { formatPlace } from "@/lib/activities";

export const config = { api: { bodyParser: { sizeLimit: "8mb" } } };

/** Statuts pour lesquels une modification a encore un sens. */
const EDITABLE = ["pending", "approved"];

/**
 * Empreinte de la version affichée par le formulaire.
 *
 * Une étape dont la trace n'a pas été remplacée est désignée par son rang dans
 * la version ouverte. Si cette version change entre temps, par exemple parce que
 * la modification précédente vient d'être relue, ces rangs ne désignent plus les
 * mêmes traces : mieux vaut refuser l'envoi que rattacher une trace à la
 * mauvaise étape.
 */
function version(submission, revision) {
  if (revision) return `r:${revision.createdAt}`;
  return `s:${submission.editedAt || submission.approvedAt || submission.createdAt}`;
}

/**
 * Version de la sortie servie au formulaire.
 * Les traces GPX n'y figurent pas : elles pèsent lourd et le navigateur n'en a
 * pas besoin pour afficher les champs. L'adresse email de l'auteur non plus.
 */
function forForm(submission, revision) {
  const source = revision || submission;
  return {
    title: source.info.title,
    activity: source.info.activity,
    date: source.info.date,
    country: source.info.country,
    region: source.info.region,
    difficulty: source.info.difficulty,
    description: source.info.description,
    participants: source.info.participants,
    gear: source.info.gear,
    stages: source.stages.map((s, i) => ({
      source: i,
      file: s.file,
      title: s.title,
      description: s.description,
      lodgingType: s.lodging?.type || "",
      lodgingText: s.lodging?.text || "",
      distanceKm: s.distanceKm,
      elevationGain: s.elevationGain,
    })),
    author: submission.author,
    slug: submission.slug,
    status: submission.status,
    version: version(submission, revision),
    published: submission.status === "approved",
    url: submission.status === "approved" ? `/rides/${submission.slug}` : null,
    // Une modification déjà envoyée et pas encore relue : on le dit, et c'est
    // elle que le formulaire affiche, pour ne pas repartir d'une version
    // périmée.
    pendingSince: revision ? revision.createdAt : null,
  };
}

/** Prévient l'administrateur qu'une sortie a été retouchée. */
async function notifyAdmin(submission, stages, info, applique) {
  if (!process.env.ADMIN_EMAIL) return;

  await sendMail({
    to: process.env.ADMIN_EMAIL,
    subject: `Sortie modifiée par son auteur : « ${info.title} »`,
    text: [
      `${submission.author} a retouché sa sortie.`,
      "",
      `Titre    : ${info.title}`,
      `Lieu     : ${formatPlace(info.country, info.region) || "non précisé"}`,
      `Étapes   : ${stages.length}`,
      `Distance : ${totalKm(stages)} km`,
      "",
      applique
        ? "La sortie n'était pas encore publiée : la modification est déjà enregistrée, elle sera relue comme le reste."
        : "La version en ligne n'a pas bougé. La modification attend ta relecture :",
      `${siteUrl()}/admin`,
    ].join("\n"),
  });
}

export default async function handler(req, res) {
  if (req.method !== "GET" && req.method !== "POST") {
    res.setHeader("Allow", "GET, POST");
    return res.status(405).json({ error: "Méthode non autorisée." });
  }

  const token = req.method === "GET" ? req.query.token : (req.body || {}).token;
  const payload = readToken(token);

  if (!payload || payload.kind !== "edit") {
    return res.status(401).json({
      error: "Ce lien de modification est incorrect ou a expiré.",
      expired: true,
    });
  }

  const submission = await getSubmission(payload.id);
  if (!submission) {
    return res.status(404).json({ error: "Cette sortie n'existe plus." });
  }

  if (!EDITABLE.includes(submission.status)) {
    return res.status(409).json({
      error: "Cette sortie n'est plus modifiable. Écris-nous par la page Contact.",
    });
  }

  const revision = await getRevision(submission.id);

  if (req.method === "GET") {
    return res.status(200).json({ ok: true, sortie: forForm(submission, revision) });
  }

  const b = req.body || {};

  if (b.version !== version(submission, revision)) {
    return res.status(409).json({
      error:
        "Ta sortie a changé depuis l'ouverture de cette page. Recharge-la pour repartir de la version à jour.",
    });
  }

  const { info, error } = readInfo(b);
  if (error) return res.status(400).json({ error });

  const verdict = inspectContent({
    body: `${info.title} ${info.description}`,
    honeypot: b.honeypot,
    renderedAt: b.renderedAt,
  });
  if (!verdict.ok) {
    return res.status(400).json({ error: SPAM_MESSAGES[verdict.reason] || "Modification refusée." });
  }

  const rate = await checkRateLimit(`edit-${clientIp(req)}`);
  if (!rate.ok) return res.status(429).json({ error: SPAM_MESSAGES[rate.reason] });

  // Une étape dont le fichier n'a pas été remplacé reprend sa trace d'origine,
  // celle de la version que le formulaire vient d'afficher.
  const stagesRead = readStages(b.stages, (revision || submission).stages);
  if (stagesRead.error) return res.status(400).json({ error: stagesRead.error });
  const { stages } = stagesRead;

  const now = new Date().toISOString();

  // Pas encore publiée : la modification remplace directement la proposition,
  // la relecture avant publication n'a pas encore eu lieu.
  if (submission.status === "pending") {
    submission.info = info;
    submission.stages = stages;
    submission.editedAt = now;
    await saveSubmission(submission);
    await notifyAdmin(submission, stages, info, true);

    return res.status(200).json({
      ok: true,
      message:
        "Ta sortie est mise à jour. Elle attend toujours sa relecture avant publication.",
    });
  }

  // Déjà publiée : la version en ligne ne change pas tant que la modification
  // n'a pas été relue.
  await saveRevision({
    submissionId: submission.id,
    createdAt: now,
    author: submission.author,
    slug: submission.slug,
    info,
    stages,
  });
  await notifyAdmin(submission, stages, info, false);

  return res.status(200).json({
    ok: true,
    message:
      "Merci ! Ta modification a bien été transmise. Elle sera relue avant de remplacer la version en ligne, la sortie reste visible d'ici là.",
  });
}
