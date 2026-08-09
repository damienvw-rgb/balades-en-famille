import { requireAdmin } from "@/lib/admin";
import {
  listSubmissions,
  getSubmission,
  saveSubmission,
  deleteSubmission,
  listRevisions,
  getRevision,
  deleteRevision,
  slugify,
} from "@/lib/store";
import { sendMail, siteUrl } from "@/lib/mailer";
import { editUrl, rideUrl } from "@/lib/editLink";

/** Demande à Vercel de reconstruire le site pour publier la sortie approuvée. */
async function triggerRebuild() {
  const hook = process.env.VERCEL_DEPLOY_HOOK_URL;
  if (!hook) return { triggered: false, reason: "aucun-deploy-hook" };
  try {
    await fetch(hook, { method: "POST" });
    return { triggered: true };
  } catch {
    return { triggered: false, reason: "appel-echoue" };
  }
}

/** Les traces GPX sont trop volumineuses pour la liste affichée dans /admin. */
function sansTraces(stages) {
  return stages.map(({ gpx, ...rest }) => ({ ...rest, gpxSize: gpx.length }));
}

export default async function handler(req, res) {
  if (!requireAdmin(req, res)) return;

  if (req.method === "GET") {
    // Les propositions dont l'adresse n'a pas été confirmée ne sont pas
    // montrées : elles n'ont pas franchi la vérification par email.
    const all = (await listSubmissions(req.query.status || null)).filter(
      (s) => s.status !== "unverified"
    );
    const light = all.map((s) => ({ ...s, stages: sansTraces(s.stages) }));

    // Modifications proposées par leurs auteurs sur des sorties déjà en ligne.
    const revisions = (await listRevisions()).map((r) => ({
      ...r,
      stages: sansTraces(r.stages),
    }));

    return res.status(200).json({ submissions: light, revisions });
  }

  if (req.method !== "POST") {
    res.setHeader("Allow", "GET, POST");
    return res.status(405).json({ error: "Méthode non autorisée." });
  }

  const { action, submissionId, slug } = req.body || {};
  const submission = await getSubmission(submissionId);
  if (!submission) return res.status(404).json({ error: "Proposition introuvable." });

  if (action === "approve") {
    submission.status = "approved";
    submission.slug = slugify(slug || submission.slug || submission.info.title);
    submission.approvedAt = new Date().toISOString();
    await saveSubmission(submission);

    const rebuild = await triggerRebuild();

    if (submission.authorEmail) {
      await sendMail({
        to: submission.authorEmail,
        subject: `Ta sortie « ${submission.info.title} » est publiée`,
        text: [
          `Bonjour ${submission.author},`,
          "",
          "Ta proposition a été relue et publiée. Merci du partage !",
          "",
          "Elle est visible ici :",
          rideUrl(submission.slug),
          "",
          "Une faute, une précision oubliée, une trace à remplacer ? Tu peux la",
          "retoucher toi-même par cette adresse, à garder pour toi :",
          editUrl(submission.id),
          "",
          "Ce lien reste valable trois mois. Tes corrections sont relues avant de",
          "remplacer la version en ligne, qui reste visible d'ici là.",
        ].join("\n"),
      });
    }

    return res.status(200).json({ ok: true, slug: submission.slug, rebuild });
  }

  // Modification proposée par l'auteur d'une sortie déjà publiée : elle
  // remplace la version en ligne, ce qui demande une reconstruction du site.
  if (action === "applyEdit") {
    const revision = await getRevision(submissionId);
    if (!revision) return res.status(404).json({ error: "Modification introuvable." });

    submission.info = revision.info;
    submission.stages = revision.stages;
    submission.editedAt = new Date().toISOString();
    await saveSubmission(submission);
    await deleteRevision(submissionId);

    const rebuild = await triggerRebuild();

    if (submission.authorEmail) {
      await sendMail({
        to: submission.authorEmail,
        subject: `Ta modification de « ${submission.info.title} » est en ligne`,
        text: [
          `Bonjour ${submission.author},`,
          "",
          "Ta correction a été relue et publiée.",
          "",
          rideUrl(submission.slug),
          "",
          "Pour une prochaine retouche :",
          editUrl(submission.id),
        ].join("\n"),
      });
    }

    return res.status(200).json({ ok: true, rebuild });
  }

  if (action === "discardEdit") {
    const revision = await getRevision(submissionId);
    if (!revision) return res.status(404).json({ error: "Modification introuvable." });

    await deleteRevision(submissionId);

    const reason = String(req.body.reason || "").slice(0, 500);

    if (submission.authorEmail) {
      await sendMail({
        to: submission.authorEmail,
        subject: `Ta modification de « ${submission.info.title} » n'a pas été retenue`,
        text: [
          `Bonjour ${submission.author},`,
          "",
          "Ta correction n'a pas été appliquée. La sortie reste en ligne dans sa",
          "version précédente.",
          ...(reason ? ["", `Motif : ${reason}`] : []),
          "",
          "Tu peux en proposer une autre par cette adresse :",
          editUrl(submission.id),
        ].join("\n"),
      });
    }

    return res.status(200).json({ ok: true });
  }

  if (action === "reject") {
    // Une sortie déjà approuvée est en ligne : la refuser doit la retirer du
    // carnet, donc reconstruire le site. Une proposition encore en attente n'a
    // jamais été publiée, inutile de déclencher un déploiement pour rien.
    const etaitPubliee = submission.status === "approved";

    submission.status = "rejected";
    submission.rejectedAt = new Date().toISOString();
    submission.rejectionReason = String(req.body.reason || "").slice(0, 500);
    await saveSubmission(submission);
    // Une modification en attente n'a plus lieu d'être relue.
    await deleteRevision(submissionId);

    const rebuild = etaitPubliee
      ? await triggerRebuild()
      : { triggered: false, reason: "jamais-publiee" };

    return res.status(200).json({ ok: true, rebuild });
  }

  if (action === "delete") {
    // Retirer la proposition du stockage ne suffit pas : les pages du carnet
    // sont statiques, le dossier public/rides/<slug> a été écrit par
    // prepare-rides.mjs au dernier build. Sans reconstruction, la sortie reste
    // en ligne alors qu'elle a disparu de /admin.
    const etaitPubliee = submission.status === "approved";

    await deleteSubmission(submissionId);

    const rebuild = etaitPubliee
      ? await triggerRebuild()
      : { triggered: false, reason: "jamais-publiee" };

    return res.status(200).json({ ok: true, rebuild });
  }

  return res.status(400).json({ error: "Action inconnue." });
}
