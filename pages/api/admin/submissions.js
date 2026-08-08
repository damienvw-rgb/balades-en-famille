import { requireAdmin } from "@/lib/admin";
import { listSubmissions, getSubmission, saveSubmission, deleteSubmission, slugify } from "@/lib/store";
import { sendMail, siteUrl } from "@/lib/mailer";

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

export default async function handler(req, res) {
  if (!requireAdmin(req, res)) return;

  if (req.method === "GET") {
    // Les propositions dont l'adresse n'a pas été confirmée ne sont pas
    // montrées : elles n'ont pas franchi la vérification par email.
    const all = (await listSubmissions(req.query.status || null)).filter(
      (s) => s.status !== "unverified"
    );
    // On retire les traces GPX complètes de la liste : trop volumineuses.
    const light = all.map((s) => ({
      ...s,
      stages: s.stages.map(({ gpx, ...rest }) => ({ ...rest, gpxSize: gpx.length })),
    }));
    return res.status(200).json({ submissions: light });
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
          `${siteUrl()}/rides/${submission.slug}`,
        ].join("\n"),
      });
    }

    return res.status(200).json({ ok: true, slug: submission.slug, rebuild });
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
