/**
 * Renvoi d'un lien de modification.
 *
 * Le lien reçu au moment de la publication finit par expirer, ou par se perdre
 * dans une boîte mail. Plutôt qu'un cul-de-sac, l'auteur redemande ici un lien
 * neuf pour chacune de ses sorties.
 *
 * La réponse est toujours la même, que l'adresse soit connue ou non : sinon ce
 * formulaire dirait à n'importe qui si une adresse a déjà proposé une sortie.
 */
import { listSubmissions } from "@/lib/store";
import { sendMail, usingSmtp } from "@/lib/mailer";
import { checkRateLimit, clientIp, SPAM_MESSAGES } from "@/lib/spam";
import { editUrl, rideUrl } from "@/lib/editLink";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

const REPONSE =
  "Si des sorties sont associées à cette adresse, un message vient de partir avec un lien de modification pour chacune.";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Méthode non autorisée." });
  }

  const email = String((req.body || {}).email || "").trim().toLowerCase();
  if (!EMAIL_RE.test(email)) {
    return res.status(400).json({ error: "Adresse email invalide." });
  }

  const rate = await checkRateLimit(`edit-link-${clientIp(req)}`);
  if (!rate.ok) return res.status(429).json({ error: SPAM_MESSAGES[rate.reason] });

  const mines = (await listSubmissions()).filter(
    (s) => s.authorEmail === email && ["pending", "approved"].includes(s.status)
  );

  if (mines.length > 0) {
    const lignes = mines.flatMap((s) => [
      `• ${s.info.title}${s.status === "approved" ? `\n  En ligne : ${rideUrl(s.slug)}` : "\n  En attente de relecture"}`,
      `  Modifier : ${editUrl(s.id)}`,
      "",
    ]);

    await sendMail({
      to: email,
      subject: mines.length > 1 ? "Tes liens de modification" : "Ton lien de modification",
      text: [
        `Bonjour ${mines[0].author},`,
        "",
        mines.length > 1
          ? "Voici de quoi retoucher chacune de tes sorties :"
          : "Voici de quoi retoucher ta sortie :",
        "",
        ...lignes,
        "Ces liens restent valables trois mois. Une correction sur une sortie",
        "déjà en ligne est relue avant de remplacer la version publiée.",
        "",
        "Si tu n'es pas à l'origine de cette demande, ignore ce message :",
        "rien n'a changé sur le site.",
      ].join("\n"),
    });
  }

  return res.status(200).json({
    ok: true,
    message: usingSmtp
      ? REPONSE
      : `${REPONSE} SMTP non configuré : le lien est affiché dans les logs du serveur.`,
  });
}
