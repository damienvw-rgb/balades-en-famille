import crypto from "crypto";
import { createToken, readToken } from "./tokens";

export const COOKIE = "admin_session";

export function adminConfigured() {
  return Boolean(process.env.ADMIN_PASSWORD);
}

/** Les deux variables sont nécessaires : le mot de passe et de quoi signer. */
export function missingConfig() {
  const missing = [];
  if (!process.env.ADMIN_PASSWORD) missing.push("ADMIN_PASSWORD");
  if (!process.env.APP_SECRET) missing.push("APP_SECRET");
  return missing;
}

export function checkPassword(candidate) {
  const expected = process.env.ADMIN_PASSWORD || "";
  if (!expected) return false;
  const a = Buffer.from(String(candidate));
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

export function sessionCookie() {
  const token = createToken({ kind: "admin" }, 60 * 60 * 12);
  const secure = process.env.NODE_ENV === "production" ? " Secure;" : "";
  return `${COOKIE}=${token}; Path=/; HttpOnly; SameSite=Strict;${secure} Max-Age=${60 * 60 * 12}`;
}

export function clearCookie() {
  return `${COOKIE}=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0`;
}

export function isAdmin(req) {
  const raw = req.headers.cookie || "";
  const match = raw.split(";").map((c) => c.trim()).find((c) => c.startsWith(`${COOKIE}=`));
  if (!match) return false;
  const payload = readToken(match.slice(COOKIE.length + 1));
  return Boolean(payload && payload.kind === "admin");
}

/** À placer en tête de chaque route d'administration. */
export function requireAdmin(req, res) {
  if (!adminConfigured()) {
    res.status(503).json({ error: "ADMIN_PASSWORD n'est pas configuré sur le serveur." });
    return false;
  }
  if (!isAdmin(req)) {
    res.status(401).json({ error: "Non authentifié." });
    return false;
  }
  return true;
}
