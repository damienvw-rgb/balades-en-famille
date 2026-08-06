import { checkPassword, sessionCookie, clearCookie, adminConfigured, isAdmin, missingConfig } from "@/lib/admin";
import { secretConfigured } from "@/lib/tokens";
import { checkRateLimit, clientIp, SPAM_MESSAGES } from "@/lib/spam";

export default async function handler(req, res) {
  if (req.method === "GET") {
    // Le diagnostic sert à comprendre tout de suite ce qui manque côté serveur,
    // sans avoir à fouiller les logs Vercel.
    return res.status(200).json({
      authenticated: isAdmin(req),
      configured: adminConfigured(),
      missing: missingConfig(),
    });
  }

  if (req.method === "DELETE") {
    res.setHeader("Set-Cookie", clearCookie());
    return res.status(200).json({ ok: true });
  }

  if (req.method !== "POST") {
    res.setHeader("Allow", "GET, POST, DELETE");
    return res.status(405).json({ error: "Méthode non autorisée." });
  }

  if (!adminConfigured()) {
    return res.status(503).json({
      error: "ADMIN_PASSWORD n'est pas défini sur le serveur. Ajoute-le dans Vercel puis relance un déploiement.",
    });
  }

  // Sans APP_SECRET, la session ne peut pas être signée : mieux vaut le dire
  // que d'échouer sans message.
  if (!secretConfigured()) {
    return res.status(503).json({
      error: "APP_SECRET n'est pas défini sur le serveur. Ajoute-le dans Vercel puis relance un déploiement (les variables ne s'appliquent qu'au déploiement suivant).",
    });
  }

  // Limite les tentatives de mot de passe
  const rate = await checkRateLimit(`login-${clientIp(req)}`);
  if (!rate.ok) return res.status(429).json({ error: SPAM_MESSAGES[rate.reason] });

  if (!checkPassword(req.body?.password)) {
    return res.status(401).json({ error: "Mot de passe incorrect." });
  }

  try {
    res.setHeader("Set-Cookie", sessionCookie());
  } catch (err) {
    return res.status(500).json({ error: `Session impossible à créer : ${err.message}` });
  }
  return res.status(200).json({ ok: true });
}
