import test from "node:test";
import assert from "node:assert/strict";
import { inspectContent, clientIp, SPAM_MESSAGES } from "../lib/spam.js";

/** Un envoi normal : lu pendant dix secondes, champ piège vide. */
const honest = (body) => ({
  body,
  honeypot: "",
  renderedAt: Date.now() - 10_000,
});

test("laisse passer un message ordinaire", () => {
  const verdict = inspectContent(honest("Belle balade, on l'a faite avec les enfants."));
  assert.equal(verdict.ok, true);
});

test("rejette un champ piège rempli", () => {
  const verdict = inspectContent({ ...honest("Bonjour"), honeypot: "robot" });
  assert.deepEqual(verdict, { ok: false, reason: "honeypot" });
});

test("rejette un formulaire renvoyé trop vite", () => {
  const verdict = inspectContent({ ...honest("Bonjour"), renderedAt: Date.now() - 500 });
  assert.equal(verdict.reason, "trop-rapide");
});

test("accepte deux liens, refuse le troisième", () => {
  assert.equal(inspectContent(honest("Voir https://a.be et https://b.be")).ok, true);
  assert.equal(
    inspectContent(honest("https://a.be https://b.be https://c.be")).reason,
    "trop-de-liens"
  );
});

test("repère le spam malgré les substitutions de caractères", () => {
  // v1agra doit être ramené à viagra par la normalisation
  assert.equal(inspectContent(honest("Achete du v1agra pas cher")).reason, "contenu-suspect");
});

test("refuse un long message tout en majuscules", () => {
  const verdict = inspectContent(honest("REGARDEZ CETTE OFFRE EXCEPTIONNELLE AUJOURD'HUI"));
  assert.equal(verdict.reason, "tout-en-majuscules");
});

test("laisse passer un cri court", () => {
  assert.equal(inspectContent(honest("SUPERBE !")).ok, true);
});

test("refuse un message vide et un message trop long", () => {
  assert.equal(inspectContent(honest("")).reason, "message-vide");
  assert.equal(inspectContent(honest("a".repeat(4001))).reason, "message-trop-long");
});

test("chaque motif de refus a son message en français", () => {
  for (const reason of [
    "honeypot", "trop-rapide", "message-vide", "message-trop-long",
    "trop-de-liens", "contenu-suspect", "tout-en-majuscules", "trop-d-envois",
  ]) {
    assert.ok(SPAM_MESSAGES[reason], `message manquant pour ${reason}`);
  }
});

test("clientIp retient la première adresse de x-forwarded-for", () => {
  const ip = clientIp({
    headers: { "x-forwarded-for": "203.0.113.7, 70.41.3.18" },
    socket: { remoteAddress: "10.0.0.1" },
  });
  assert.equal(ip, "203.0.113.7");
});

test("clientIp retombe sur la socket sans en-tête", () => {
  const ip = clientIp({ headers: {}, socket: { remoteAddress: "10.0.0.1" } });
  assert.equal(ip, "10.0.0.1");
});
