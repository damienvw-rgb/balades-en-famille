import crypto from "crypto";

/**
 * Jetons de vérification signés (HMAC), sans stockage.
 * Le jeton porte lui-même sa charge utile et sa date d'expiration, donc aucune
 * table de jetons à gérer ni à purger.
 */

export function secretConfigured() {
  return Boolean(process.env.APP_SECRET);
}

function secret() {
  const value = process.env.APP_SECRET;
  if (value) return value;

  // En production l'absence de secret est une erreur de configuration : on la
  // signale explicitement plutôt que de signer avec une valeur devinable.
  if (process.env.NODE_ENV === "production") {
    throw new Error("APP_SECRET manquant");
  }
  return "dev-secret-non-securise";
}

function b64url(buf) {
  return Buffer.from(buf).toString("base64url");
}

export function createToken(payload, ttlSeconds = 60 * 60 * 48) {
  const body = b64url(
    JSON.stringify({ ...payload, exp: Date.now() + ttlSeconds * 1000 })
  );
  const sig = crypto.createHmac("sha256", secret()).update(body).digest("base64url");
  return `${body}.${sig}`;
}

export function readToken(token) {
  if (typeof token !== "string" || !token.includes(".")) return null;
  const [body, sig] = token.split(".");
  if (!body || !sig) return null;

  const expected = crypto
    .createHmac("sha256", secret())
    .update(body)
    .digest("base64url");

  // Comparaison à temps constant
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;

  let payload;
  try {
    payload = JSON.parse(Buffer.from(body, "base64url").toString("utf-8"));
  } catch {
    return null;
  }

  if (!payload.exp || payload.exp < Date.now()) return null;
  return payload;
}

/** Empreinte non réversible d'une adresse, pour dédoublonner sans la stocker en clair. */
export function hashEmail(email) {
  return crypto
    .createHmac("sha256", secret())
    .update(String(email).trim().toLowerCase())
    .digest("hex")
    .slice(0, 32);
}
