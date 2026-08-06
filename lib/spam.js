import { storage } from "./storage";
import { hashEmail } from "./tokens";

/**
 * Filtrage anti-spam en plusieurs couches, sans service tiers :
 *   1. champ piège invisible rempli uniquement par les robots
 *   2. formulaire soumis trop vite pour avoir été lu par un humain
 *   3. densité de liens et longueur du message
 *   4. mots-clés typiques du spam
 *   5. limitation du nombre d'envois par adresse IP
 */

const MIN_SECONDS_ON_FORM = 4;
const MAX_LINKS = 2;
const MAX_LENGTH = 4000;
const MIN_LENGTH = 2;
const RATE_LIMIT_COUNT = 5;
const RATE_LIMIT_COUNT_SOFT = 60;
const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000;

const SPAM_PATTERNS = [
  /\b(viagra|cialis|casino|porn|xxx)\b/i,
  /\b(crypto|bitcoin|forex)\s+(invest|profit|trading|signal)/i,
  /\b(seo|backlink)s?\s+(service|package|cheap)/i,
  /\bclick\s+here\s+to\s+(win|claim|earn)/i,
  /\b(loan|payday)\s+(approved|guaranteed)/i,
];

function countLinks(text) {
  return (text.match(/https?:\/\/|www\./gi) || []).length;
}

/** Une seule graphie possible du même caractère, pour déjouer les substitutions. */
function normalize(text) {
  return text
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[0@]/g, "o")
    .replace(/[1!|]/g, "i")
    .replace(/\$/g, "s");
}

export function inspectContent({ body, honeypot, renderedAt }) {
  // 1. Champ piège : invisible à l'écran, donc seul un robot le remplit.
  if (honeypot) return { ok: false, reason: "honeypot" };

  // 2. Délai de lecture minimal
  if (renderedAt) {
    const elapsed = (Date.now() - Number(renderedAt)) / 1000;
    if (Number.isFinite(elapsed) && elapsed < MIN_SECONDS_ON_FORM) {
      return { ok: false, reason: "trop-rapide" };
    }
  }

  const text = String(body || "").trim();

  if (text.length < MIN_LENGTH) return { ok: false, reason: "message-vide" };
  if (text.length > MAX_LENGTH) return { ok: false, reason: "message-trop-long" };
  if (countLinks(text) > MAX_LINKS) return { ok: false, reason: "trop-de-liens" };

  const probe = normalize(text);
  if (SPAM_PATTERNS.some((re) => re.test(probe))) {
    return { ok: false, reason: "contenu-suspect" };
  }

  // Message entièrement en majuscules et un peu long
  const letters = text.replace(/[^A-Za-zÀ-ÿ]/g, "");
  if (letters.length > 25 && letters === letters.toUpperCase()) {
    return { ok: false, reason: "tout-en-majuscules" };
  }

  return { ok: true };
}

export async function checkRateLimit(ip, soft = false) {
  const key = `ratelimit/${hashEmail(ip || "inconnu")}`;
  const now = Date.now();
  const record = (await storage.get(key)) || { hits: [] };
  const hits = record.hits.filter((t) => now - t < RATE_LIMIT_WINDOW_MS);

  if (hits.length >= (soft ? RATE_LIMIT_COUNT_SOFT : RATE_LIMIT_COUNT)) {
    return { ok: false, reason: "trop-d-envois" };
  }

  hits.push(now);
  await storage.put(key, { hits });
  return { ok: true };
}

export function clientIp(req) {
  const forwarded = req.headers["x-forwarded-for"];
  if (typeof forwarded === "string") return forwarded.split(",")[0].trim();
  return req.socket?.remoteAddress || "inconnu";
}

export const SPAM_MESSAGES = {
  honeypot: "Ce message a été identifié comme automatique.",
  "trop-rapide": "Prends le temps de relire, puis renvoie le formulaire.",
  "message-vide": "Le message est vide.",
  "message-trop-long": "Le message dépasse 4000 caractères.",
  "trop-de-liens": "Deux liens maximum par message.",
  "contenu-suspect": "Ce message a été identifié comme du spam.",
  "tout-en-majuscules": "Merci d'éviter d'écrire tout en majuscules.",
  "trop-d-envois": "Trop d'envois en peu de temps, réessaie dans une heure.",
};
