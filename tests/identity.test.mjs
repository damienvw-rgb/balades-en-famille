import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

/**
 * lib/storage.js fixe son dossier .data/ d'après le répertoire courant, au
 * moment de l'import. On se place donc dans un dossier temporaire avant
 * d'importer, pour ne rien écrire dans le dépôt.
 */
process.env.APP_SECRET = "secret-de-test-uniquement";
delete process.env.BLOB_READ_WRITE_TOKEN;
delete process.env.BLOB_STORE_ID;

const origine = process.cwd();
const workdir = await fs.mkdtemp(path.join(os.tmpdir(), "identite-"));
process.chdir(workdir);

const { checkIdentity, bindIdentity, normalizePseudo } = await import("../lib/identity.js");

test.after(async () => {
  // Revenir au point de départ avant d'effacer : Windows verrouille le
  // répertoire courant d'un processus et refuse de le supprimer (EBUSY).
  process.chdir(origine);
  await fs.rm(workdir, { recursive: true, force: true });
});

test("normalizePseudo ignore casse, accents et espaces en trop", () => {
  assert.equal(normalizePseudo("  Élodie   B  "), "elodie b");
  assert.equal(normalizePseudo("ELODIE b"), "elodie b");
});

test("un pseudo libre est accepté", async () => {
  const verdict = await checkIdentity("Damien", "damien@example.com");
  assert.equal(verdict.ok, true);
  assert.equal(verdict.pseudo, "Damien");
});

test("un pseudo trop court est refusé", async () => {
  const verdict = await checkIdentity("D", "damien@example.com");
  assert.equal(verdict.ok, false);
});

test("un pseudo ne peut pas être une adresse email", async () => {
  // Sans cette garde, une adresse pouvait entrer dans l'espace des pseudos et
  // servir à deviner si elle avait déjà écrit sur le site.
  const verdict = await checkIdentity("quelquun@example.com", "quelquun@example.com");
  assert.equal(verdict.ok, false);
  assert.match(verdict.error, /adresse email/);
});

test("bindIdentity refuse une adresse en position de pseudo", async () => {
  // Garde-fou contre l'inversion des arguments : elle écrivait l'adresse en
  // clair dans le stockage, sous une clé de pseudo.
  await assert.rejects(
    () => bindIdentity("victime@example.com", "Damien"),
    /pseudo, email/
  );
});

test("une adresse déjà liée garde son pseudo et le suggère", async () => {
  await bindIdentity("Damien", "damien@example.com");

  const verdict = await checkIdentity("Autrechose", "damien@example.com");
  assert.equal(verdict.ok, false);
  assert.equal(verdict.suggestion, "Damien");
});

test("le même couple pseudo et adresse reste accepté", async () => {
  await bindIdentity("Damien", "damien@example.com");

  assert.equal((await checkIdentity("Damien", "damien@example.com")).ok, true);
  // La casse ne fait pas de la personne quelqu'un d'autre
  assert.equal((await checkIdentity("damien", "damien@example.com")).ok, true);
});

test("un pseudo pris par quelqu'un d'autre est refusé", async () => {
  await bindIdentity("Camille", "camille@example.com");

  const verdict = await checkIdentity("Camille", "intrus@example.com");
  assert.equal(verdict.ok, false);
  assert.match(verdict.error, /déjà utilisé/);
});
