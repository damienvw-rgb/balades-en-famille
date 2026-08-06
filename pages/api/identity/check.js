import { checkIdentity } from "@/lib/identity";
import { checkRateLimit, clientIp } from "@/lib/spam";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/** Vérification à la volée pendant la saisie du formulaire. */
export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Méthode non autorisée." });
  }

  const { pseudo, email } = req.body || {};
  if (!EMAIL_RE.test(String(email || "")) || !pseudo) {
    return res.status(200).json({ ok: true });
  }

  const rate = await checkRateLimit(`identity-${clientIp(req)}`, true);
  if (!rate.ok) return res.status(200).json({ ok: true });

  return res.status(200).json(await checkIdentity(pseudo, email));
}
