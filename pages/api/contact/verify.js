import { readToken } from "@/lib/tokens";
import { htmlPage } from "@/lib/htmlPage";
import { getMessage, saveMessage } from "@/lib/store";
import { sendMail } from "@/lib/mailer";

export default async function handler(req, res) {
  const payload = readToken(req.query.token);
  res.setHeader("Content-Type", "text/html; charset=utf-8");

  if (!payload || payload.kind !== "message") {
    return res.status(400).send(
      htmlPage("Lien invalide", "Ce lien de confirmation est incorrect ou a expiré.", "/contact", "Renvoyer un message")
    );
  }

  const message = await getMessage(payload.id);
  if (!message) {
    return res.status(404).send(htmlPage("Message introuvable", "Ce message n'existe plus.", "/"));
  }

  if (message.status !== "unverified") {
    return res.status(200).send(htmlPage("Déjà transmis", "Ce message a déjà été envoyé.", "/"));
  }

  message.status = "sent";
  message.verifiedAt = new Date().toISOString();
  await saveMessage(message);

  if (process.env.ADMIN_EMAIL) {
    await sendMail({
      to: process.env.ADMIN_EMAIL,
      // La réponse part directement vers l'expéditeur
      replyTo: message.email,
      subject: `[Contact] ${message.subjectLabel}`,
      text: [
        `Motif   : ${message.subjectLabel}`,
        `De      : ${message.name || "sans nom"} <${message.email}>`,
        "",
        message.body,
      ].join("\n"),
    });
  }

  return res.status(200).send(
    htmlPage("Message transmis", "Merci ! Le message est parti. Une réponse te parviendra à l'adresse que tu as confirmée.", "/")
  );
}
