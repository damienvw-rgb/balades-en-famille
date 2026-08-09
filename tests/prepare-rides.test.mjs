import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { execFile } from "node:child_process";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";

const run = promisify(execFile);
const SCRIPT = fileURLToPath(new URL("../scripts/prepare-rides.mjs", import.meta.url));

const GPX = `<?xml version="1.0"?><gpx><trk><trkseg>
<trkpt lat="50.0" lon="4.0"><ele>100</ele></trkpt>
<trkpt lat="50.1" lon="4.1"><ele>150</ele></trkpt>
</trkseg></trk></gpx>`;

function submission({ id, author, slug, title, createdAt, stages = 1 }) {
  return {
    id,
    status: "approved",
    createdAt,
    slug,
    author,
    authorEmail: `${author.toLowerCase()}@example.com`,
    info: { title, activity: "velo", country: "Belgique" },
    stages: Array.from({ length: stages }, (_, i) => ({
      file: `etape-${i + 1}.gpx`,
      title: stages > 1 ? `Étape ${i + 1}` : "",
      description: "",
      lodging: null,
      gpx: GPX,
      distanceKm: 12,
      elevationGain: 50,
    })),
  };
}

/** Prépare un dossier de travail, y écrit les propositions et lance le script. */
async function prepare(submissions, { existingRides = [] } = {}) {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "prepare-"));
  await fs.mkdir(path.join(dir, ".data", "submissions"), { recursive: true });

  for (const s of submissions) {
    const body = typeof s === "string" ? s : JSON.stringify(s, null, 2);
    const name = typeof s === "string" ? `corrompu-${Math.random()}.json` : `${s.id}.json`;
    await fs.writeFile(path.join(dir, ".data", "submissions", name), body);
  }

  // Sorties ajoutées à la main dans le dépôt, qui gardent la priorité
  for (const slug of existingRides) {
    const rideDir = path.join(dir, "public", "rides", slug);
    await fs.mkdir(rideDir, { recursive: true });
    await fs.writeFile(path.join(rideDir, "info.json"), JSON.stringify({ title: "Du dépôt" }));
    await fs.writeFile(path.join(rideDir, "etape-1.gpx"), GPX);
  }

  // Les avertissements passent par console.warn, donc par la sortie d'erreur :
  // on garde les deux flux, sinon un test croirait à tort qu'il n'y a rien.
  const { stdout, stderr } = await run(process.execPath, [SCRIPT], { cwd: dir });
  const slugs = await fs.readdir(path.join(dir, "public", "rides"));

  const authorOf = async (slug) => {
    const info = JSON.parse(
      await fs.readFile(path.join(dir, "public", "rides", slug, "info.json"), "utf-8")
    );
    return info.author;
  };

  return {
    dir,
    stdout,
    output: `${stdout}\n${stderr}`,
    slugs: slugs.filter((s) => !s.startsWith(".")),
    authorOf,
  };
}

test("deux sorties au même titre gardent chacune la sienne", async (t) => {
  const { dir, slugs, authorOf } = await prepare([
    submission({ id: "aaaaaaaa-1111", author: "Alice", slug: "boucle", title: "Boucle", createdAt: "2024-01-01" }),
    submission({ id: "bbbbbbbb-2222", author: "Bob", slug: "boucle", title: "Boucle", createdAt: "2024-06-01" }),
  ]);
  t.after(() => fs.rm(dir, { recursive: true, force: true }));

  assert.equal(slugs.length, 2, `deux dossiers attendus, obtenu : ${slugs.join(", ")}`);

  // La plus ancienne garde l'adresse courte, la suivante reçoit un suffixe
  assert.ok(slugs.includes("boucle"));
  assert.equal(await authorOf("boucle"), "Alice");

  const autre = slugs.find((s) => s !== "boucle");
  assert.equal(await authorOf(autre), "Bob");
});

test("l'attribution des adresses ne dépend pas de l'ordre de lecture", async (t) => {
  // Mêmes propositions, écrites dans l'autre sens : le tri par date doit
  // donner exactement le même résultat, sinon une sortie déjà en ligne
  // changerait d'adresse d'un build à l'autre.
  const { dir, authorOf } = await prepare([
    submission({ id: "bbbbbbbb-2222", author: "Bob", slug: "boucle", title: "Boucle", createdAt: "2024-06-01" }),
    submission({ id: "aaaaaaaa-1111", author: "Alice", slug: "boucle", title: "Boucle", createdAt: "2024-01-01" }),
  ]);
  t.after(() => fs.rm(dir, { recursive: true, force: true }));

  assert.equal(await authorOf("boucle"), "Alice");
});

test("une sortie du dépôt garde son adresse", async (t) => {
  const { dir, slugs, authorOf } = await prepare(
    [submission({ id: "cccccccc-3333", author: "Chris", slug: "boucle", title: "Boucle", createdAt: "2024-01-01" })],
    { existingRides: ["boucle"] }
  );
  t.after(() => fs.rm(dir, { recursive: true, force: true }));

  assert.equal(slugs.length, 2);
  assert.equal(await authorOf("boucle"), undefined, "la sortie du dépôt a été écrasée");
});

test("une proposition corrompue n'emporte pas les autres", async (t) => {
  const { dir, slugs, output } = await prepare([
    submission({ id: "dddddddd-4444", author: "Dana", slug: "lac", title: "Lac", createdAt: "2024-01-01" }),
    '{ "id": "casse",',
  ]);
  t.after(() => fs.rm(dir, { recursive: true, force: true }));

  assert.deepEqual(slugs, ["lac"]);
  assert.match(output, /illisible/);
});

test("une sortie à plusieurs étapes reçoit son parcours complet", async (t) => {
  const { dir, stdout } = await prepare([
    submission({ id: "eeeeeeee-5555", author: "Eve", slug: "traversee", title: "Traversée", createdAt: "2024-01-01", stages: 3 }),
  ]);
  t.after(() => fs.rm(dir, { recursive: true, force: true }));

  const merged = await fs.readFile(
    path.join(dir, "public", "rides", "traversee", "parcours-complet.gpx"),
    "utf-8"
  );

  // Une piste par étape, pour que les GPS les distinguent
  assert.equal((merged.match(/<trk>/g) || []).length, 3);
  assert.match(stdout, /1 parcours complet/);
});

test("une sortie à trace unique n'a pas de parcours complet", async (t) => {
  const { dir } = await prepare([
    submission({ id: "ffffffff-6666", author: "Flo", slug: "sortie", title: "Sortie", createdAt: "2024-01-01" }),
  ]);
  t.after(() => fs.rm(dir, { recursive: true, force: true }));

  const files = await fs.readdir(path.join(dir, "public", "rides", "sortie"));
  assert.ok(!files.includes("parcours-complet.gpx"));
});

test("l'adresse email de l'auteur n'entre jamais dans public/", async (t) => {
  // Règle 1 du projet, vérifiée sur ce qui est réellement écrit sur le disque
  const { dir } = await prepare([
    submission({ id: "99999999-7777", author: "Gaby", slug: "foret", title: "Forêt", createdAt: "2024-01-01" }),
  ]);
  t.after(() => fs.rm(dir, { recursive: true, force: true }));

  const info = await fs.readFile(
    path.join(dir, "public", "rides", "foret", "info.json"),
    "utf-8"
  );
  assert.ok(!info.includes("@"), `une adresse a fuité dans info.json : ${info}`);
  assert.ok(info.includes("Gaby"), "le pseudo doit rester affiché");
});
