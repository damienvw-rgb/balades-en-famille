import { readToken } from "@/lib/tokens";
import { htmlPage as page } from "@/lib/htmlPage";
import { getComment, saveComment } from "@/lib/store";
import { sendMail, siteUrl } from "@/lib/mailer";
import { getRideAuthor } from "@/lib/rides";

export default async function handler(req, res) {
  const payload = readToken(req.query.token);
  res.setHeader("Content-Type", "text/html; charset=utf-8");

  if (!payload || payload.kind !== "comment") {
    return res
      .status(400)
      .send(page("Lien invalide", "Ce lien de confirmation est incorrect ou a expiré. Les liens sont valables 48 heures.", "/"));
  }

  const comment = await getComment(payload.ride, payload.id);
  if (!comment) {
    return res.status(404).send(page("Commentaire introuvable", "Ce commentaire n'existe plus.", "/"));
  }

  const rideUrl = `/rides/${comment.ride}`;

  if (comment.status === "published") {
    return res.status(200).send(page("Déjà publié", "Ce commentaire était déjà en ligne.", rideUrl));
  }

  comment.status = "published";
  comment.verifiedAt = new Date().toISOString();
  await saveComment(comment);

  // Prévenir l'auteur de la sortie, et l'administrateur du site
  const author = await getRideAuthor(comment.ride);
  const recipients = new Set(
    [author?.authorEmail, process.env.ADMIN_EMAIL].filter(Boolean)
  );

  const excerpt =
    comment.body.length > 400 ? `${comment.body.slice(0, 400)}…` : comment.body;

  for (const to of recipients) {
    await sendMail({
      to,
      subject: `Nouveau commentaire sur « ${author?.title || comment.ride} »`,
      text: [
        `${comment.pseudo} vient de commenter${comment.stage ? ` l'étape « ${comment.stage} »` : ""} :`,
        "",
        excerpt,
        "",
        `Voir la page : ${siteUrl()}${rideUrl}`,
        `Modérer : ${siteUrl()}/admin`,
      ].join("\n"),
    });
  }

  return res
    .status(200)
    .send(page("Commentaire publié", "Merci, ton commentaire est en ligne. Ton adresse email reste privée.", rideUrl));
}
