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
    submission.status = "rejected";
    submission.rejectedAt = new Date().toISOString();
    submission.rejectionReason = String(req.body.reason || "").slice(0, 500);
    await saveSubmission(submission);
    return res.status(200).json({ ok: true });
  }

  if (action === "delete") {
    await deleteSubmission(submissionId);
    return res.status(200).json({ ok: true });
  }

  return res.status(400).json({ error: "Action inconnue." });
}
