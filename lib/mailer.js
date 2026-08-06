/**
 * Envoi d'emails à deux pilotes.
 *
 *  - SMTP (Gmail avec un mot de passe d'application) dès que SMTP_USER et
 *    SMTP_PASS sont définis. Aucun compte tiers à créer.
 *  - Sinon, les messages sont écrits dans la console : le parcours complet
 *    reste testable en local sans rien configurer.
 */

export const usingSmtp = Boolean(process.env.SMTP_USER && process.env.SMTP_PASS);

async function transport() {
  const nodemailer = (await import("nodemailer")).default;
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST || "smtp.gmail.com",
    port: Number(process.env.SMTP_PORT || 465),
    secure: String(process.env.SMTP_SECURE ?? "true") === "true",
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
  });
}

export async function sendMail({ to, subject, text, html }) {
  if (!usingSmtp) {
    console.log(
      [
        "",
        "──────── EMAIL (mode console, SMTP non configuré) ────────",
        `À       : ${to}`,
        `Objet   : ${subject}`,
        "",
        text,
        "──────────────────────────────────────────────────────────",
        "",
      ].join("\n")
    );
    return { delivered: false, reason: "smtp-non-configure" };
  }

  const from = process.env.SMTP_FROM || process.env.SMTP_USER;
  await (await transport()).sendMail({ from, to, subject, text, html });
  return { delivered: true };
}

export function siteUrl() {
  if (process.env.NEXT_PUBLIC_SITE_URL) {
    return process.env.NEXT_PUBLIC_SITE_URL.replace(/\/$/, "");
  }
  if (process.env.VERCEL_PROJECT_PRODUCTION_URL) {
    return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`;
  }
  return "http://localhost:3000";
}
