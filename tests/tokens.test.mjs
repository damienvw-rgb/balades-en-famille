import test from "node:test";
import assert from "node:assert/strict";

// Le secret doit être posé avant le premier import : lib/tokens.js le lit à
// l'appel, mais autant rendre l'intention explicite ici.
process.env.APP_SECRET = "secret-de-test-uniquement";

const { createToken, readToken, hashEmail, secretConfigured } = await import("../lib/tokens.js");

test("un jeton se relit tel qu'il a été écrit", () => {
  const token = createToken({ kind: "comment", ride: "boucle", id: "abc" });
  const payload = readToken(token);

  assert.equal(payload.kind, "comment");
  assert.equal(payload.ride, "boucle");
  assert.equal(payload.id, "abc");
});

test("un jeton retouché est refusé", () => {
  const token = createToken({ kind: "comment", id: "abc" });
  const [body, signature] = token.split(".");

  // Charge utile modifiée, signature d'origine conservée
  const forged = `${Buffer.from('{"kind":"admin"}').toString("base64url")}.${signature}`;
  assert.equal(readToken(forged), null);

  // Signature modifiée, charge utile d'origine conservée
  assert.equal(readToken(`${body}.${"a".repeat(signature.length)}`), null);
});

test("un jeton expiré est refusé", () => {
  const token = createToken({ kind: "comment" }, -1);
  assert.equal(readToken(token), null);
});

test("une entrée qui n'est pas un jeton est refusée sans lever d'erreur", () => {
  for (const value of [null, undefined, "", "sanspoint", 42, {}, "a.b"]) {
    assert.equal(readToken(value), null, `accepté à tort : ${JSON.stringify(value)}`);
  }
});

test("hashEmail est stable et insensible à la casse et aux espaces", () => {
  assert.equal(hashEmail("Alice@Example.COM  "), hashEmail("alice@example.com"));
  assert.notEqual(hashEmail("alice@example.com"), hashEmail("bob@example.com"));
});

test("hashEmail ne laisse pas transparaître l'adresse", () => {
  const hash = hashEmail("alice@example.com");
  assert.equal(hash.length, 32);
  assert.ok(!hash.includes("alice"));
  assert.ok(!hash.includes("@"));
});

test("secretConfigured voit le secret", () => {
  assert.equal(secretConfigured(), true);
});
