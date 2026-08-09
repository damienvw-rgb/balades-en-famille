import { readToken } from "@/lib/tokens";
import { htmlPage } from "@/lib/htmlPage";
import { getSubmission, saveSubmission } from "@/lib/store";
import { bindIdentity } from "@/lib/identity";
import { sendMail, siteUrl } from "@/lib/mailer";
import { formatPlace } from "@/lib/activities";

export default async function handler(req, res) {
  const payload = readToken(req.query.token);
  res.setHeader("Content-Type", "text/html; charset=utf-8");

  if (!payload || payload.kind !== "submission") {
    return res
      .status(400)
      .send(htmlPage("Lien invalide", "Ce lien de confirmation est incorrect ou a expiré. Les liens restent valables 48 heures.", "/proposer", "Reproposer une sortie"));
  }

  const submission = await getSubmission(payload.id);
  if (!submission) {
    return res.status(404).send(htmlPage("Proposition introuvable", "Cette proposition n'existe plus.", "/"));
  }

  if (submission.status !== "unverified") {
    return res
      .status(200)
      .send(htmlPage("Déjà confirmée", "Cette proposition a déjà été transmise. Elle sera publiée après relecture.", "/"));
  }

  // La proposition entre maintenant dans la file de modération
  submission.status = "pending";
  submission.verifiedAt = new Date().toISOString();
  await saveSubmission(submission);

  // L'adresse est confirmée : le pseudo lui est réservé sur tout le site.
  // L'ordre des arguments compte, bindIdentity attend (pseudo, email).
  await bindIdentity(submission.author, submission.authorEmail);

  if (process.env.ADMIN_EMAIL) {
    const totalKm =
      Math.round(submission.stages.reduce((t, s) => t + (s.distanceKm || 0), 0) * 10) / 10;

    await sendMail({
      to: process.env.ADMIN_EMAIL,
      subject: `Nouvelle sortie proposée : « ${submission.info.title} »`,
      text: [
        `${submission.author} propose une sortie et a confirmé son adresse.`,
        "",
        `Titre    : ${submission.info.title}`,
        `Lieu     : ${formatPlace(submission.info.country, submission.info.region) || "non précisé"}`,
        `Étapes   : ${submission.stages.length}`,
        `Distance : ${totalKm} km`,
        "",
        "Elle attend ta validation avant d'être publiée :",
        `${siteUrl()}/admin`,
      ].join("\n"),
    });
  }

  return res
    .status(200)
    .send(htmlPage(
      "Proposition transmise",
      "Merci ! Ta sortie va être relue avant publication. Tu recevras un email dès qu'elle sera en ligne.",
      "/"
    ));
}
