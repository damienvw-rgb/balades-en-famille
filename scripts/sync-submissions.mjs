/**
 * Exécuté avant chaque build (voir "build" dans package.json).
 *
 * Récupère les sorties approuvées depuis le stockage et les écrit dans
 * public/rides/, exactement au même format que les sorties ajoutées à la main.
 * Tout le reste du site les traite donc de façon identique : cartes, filtres,
 * profils d'altitude, rien de particulier à prévoir.
 *
 * Sans stockage configuré, le script ne fait rien et le build se poursuit.
 */
import fs from "fs/promises";
import path from "path";

const OUT_DIR = path.join(process.cwd(), "public", "rides");
const MANIFEST = path.join(OUT_DIR, ".generated.json");

async function loadSubmissions() {
  const token = process.env.BLOB_READ_WRITE_TOKEN;

  if (token) {
    const { list } = await import("@vercel/blob");
    const { blobs } = await list({ prefix: "submissions/" });
    const out = [];
    for (const b of blobs) {
      const res = await fetch(b.url, { cache: "no-store" });
      if (res.ok) out.push(await res.json());
    }
    return out;
  }

  // Repli local : les mêmes fichiers que le pilote de développement
  const dir = path.join(process.cwd(), ".data", "submissions");
  try {
    const names = await fs.readdir(dir);
    const out = [];
    for (const name of names.filter((n) => n.endsWith(".json"))) {
      out.push(JSON.parse(await fs.readFile(path.join(dir, name), "utf-8")));
    }
    return out;
  } catch {
    return [];
  }
}

/** Supprime les dossiers issus d'un build précédent, sans toucher aux tiens. */
async function cleanPrevious() {
  try {
    const previous = JSON.parse(await fs.readFile(MANIFEST, "utf-8"));
    for (const slug of previous.slugs || []) {
      await fs.rm(path.join(OUT_DIR, slug), { recursive: true, force: true });
    }
  } catch {
    /* premier build */
  }
}

async function main() {
  await fs.mkdir(OUT_DIR, { recursive: true });
  await cleanPrevious();

  let submissions = [];
  try {
    submissions = await loadSubmissions();
  } catch (err) {
    console.warn(`[sync] Stockage inaccessible, build sans les sorties proposées : ${err.message}`);
    await fs.writeFile(MANIFEST, JSON.stringify({ slugs: [] }, null, 2));
    return;
  }

  const approved = submissions.filter((s) => s.status === "approved");
  const written = [];

  for (const s of approved) {
    // Une sortie ajoutée à la main dans le dépôt a toujours la priorité
    let slug = s.slug;
    try {
      await fs.access(path.join(OUT_DIR, slug, "info.json"));
      if (!written.includes(slug)) {
        slug = `${slug}-${s.id.slice(0, 6)}`;
      }
    } catch {
      /* le dossier n'existe pas, on garde le slug */
    }

    const dir = path.join(OUT_DIR, slug);
    await fs.mkdir(dir, { recursive: true });

    const info = {
      ...s.info,
      author: s.author,
      // L'adresse de l'auteur reste hors de public/ : elle est lue depuis le
      // stockage au moment d'envoyer une notification, jamais servie au client.
      submissionId: s.id,
      stages: s.stages.map(({ gpx, distanceKm, elevationGain, ...rest }) => rest),
    };

    if (s.stages.length === 1 && !s.stages[0].title && !s.stages[0].lodging) {
      delete info.stages;
    }

    await fs.writeFile(path.join(dir, "info.json"), JSON.stringify(info, null, 2), "utf-8");

    for (const stage of s.stages) {
      await fs.writeFile(path.join(dir, stage.file), stage.gpx, "utf-8");
    }

    written.push(slug);
  }

  await fs.writeFile(MANIFEST, JSON.stringify({ slugs: written }, null, 2), "utf-8");

  console.log(
    written.length > 0
      ? `[sync] ${written.length} sortie(s) proposée(s) intégrée(s) : ${written.join(", ")}`
      : "[sync] Aucune sortie proposée à intégrer."
  );
}

main().catch((err) => {
  // Une panne de stockage ne doit jamais empêcher le site de se construire.
  console.warn(`[sync] Ignoré : ${err.message}`);
});
