import { checkPassword, sessionCookie, clearCookie, adminConfigured, isAdmin } from "@/lib/admin";
import { checkRateLimit, clientIp, SPAM_MESSAGES } from "@/lib/spam";

export default async function handler(req, res) {
  if (req.method === "GET") {
    return res.status(200).json({ authenticated: isAdmin(req), configured: adminConfigured() });
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
    return res.status(503).json({ error: "ADMIN_PASSWORD n'est pas configuré sur le serveur." });
  }

  // Limite les tentatives de mot de passe
  const rate = await checkRateLimit(`login-${clientIp(req)}`);
  if (!rate.ok) return res.status(429).json({ error: SPAM_MESSAGES[rate.reason] });

  if (!checkPassword(req.body?.password)) {
    return res.status(401).json({ error: "Mot de passe incorrect." });
  }

  res.setHeader("Set-Cookie", sessionCookie());
  return res.status(200).json({ ok: true });
}
