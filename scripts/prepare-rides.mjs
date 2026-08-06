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
const MERGED_NAME = "parcours-complet.gpx";

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

/**
 * Écrit une trace fusionnée pour chaque sortie à plusieurs étapes, afin que le
 * visiteur puisse récupérer l'itinéraire complet en un seul fichier.
 * Chaque étape reste un segment distinct : les GPS et Komoot les reconnaissent.
 */
async function buildMergedTracks() {
  const slugs = (await fs.readdir(OUT_DIR, { withFileTypes: true }))
    .filter((d) => d.isDirectory() && !d.name.startsWith("."))
    .map((d) => d.name);

  for (const slug of slugs) {
    const dir = path.join(OUT_DIR, slug);
    const files = (await fs.readdir(dir))
      .filter((f) => f.toLowerCase().endsWith(".gpx") && f !== MERGED_NAME)
      .sort((a, b) => a.localeCompare(b, "fr", { numeric: true }));

    const mergedPath = path.join(dir, MERGED_NAME);

    if (files.length < 2) {
      await fs.rm(mergedPath, { force: true });
      continue;
    }

    // Ordre des étapes déclaré dans info.json s'il existe
    let ordered = files;
    try {
      const info = JSON.parse(await fs.readFile(path.join(dir, "info.json"), "utf-8"));
      if (Array.isArray(info.stages) && info.stages.length > 0) {
        const declared = info.stages.map((s) => s.file).filter((f) => files.includes(f));
        if (declared.length > 0) ordered = declared;
      }
    } catch {
      /* pas d'info.json : ordre alphabétique */
    }

    const segments = [];
    for (const file of ordered) {
      const xml = await fs.readFile(path.join(dir, file), "utf-8");
      // On récupère les segments de points tels quels, sans les réécrire
      const matches = xml.match(/<trkseg[\s\S]*?<\/trkseg>/g) || [];
      for (const seg of matches) segments.push(seg);
    }

    if (segments.length === 0) {
      await fs.rm(mergedPath, { force: true });
      continue;
    }

    const name = slug.replace(/-/g, " ");
    const gpx = [
      '<?xml version="1.0" encoding="UTF-8"?>',
      '<gpx version="1.1" creator="Partage de balades familiales" xmlns="http://www.topografix.com/GPX/1/1">',
      "  <metadata>",
      `    <name>${name}</name>`,
      "  </metadata>",
      "  <trk>",
      `    <name>${name}</name>`,
      ...segments.map((seg) => `    ${seg.trim()}`),
      "  </trk>",
      "</gpx>",
      "",
    ].join("\n");

    await fs.writeFile(mergedPath, gpx, "utf-8");
  }
}

/**
 * Assemble les traces d'une sortie en un seul fichier, pour le visiteur qui
 * veut charger l'itinéraire complet dans son GPS en une fois. Chaque étape
 * reste un segment distinct, donc rien n'est perdu.
 */
async function buildMergedGpx(dir, slug) {
  let info;
  try {
    info = JSON.parse(await fs.readFile(path.join(dir, "info.json"), "utf-8"));
  } catch {
    return false;
  }

  let files;
  if (Array.isArray(info.stages) && info.stages.length > 0) {
    files = info.stages.map((s) => s.file).filter(Boolean);
  } else {
    files = (await fs.readdir(dir))
      .filter((f) => f.toLowerCase().endsWith(".gpx") && f !== MERGED_NAME)
      .sort((a, b) => a.localeCompare(b, "fr", { numeric: true }));
  }

  if (files.length < 2) {
    await fs.rm(path.join(dir, MERGED_NAME), { force: true });
    return false;
  }

  const tracks = [];
  for (const [i, file] of files.entries()) {
    let xml;
    try {
      xml = await fs.readFile(path.join(dir, file), "utf-8");
    } catch {
      continue;
    }
    const segments = xml.match(/<trkseg[\s\S]*?<\/trkseg>/g) || [];
    if (segments.length === 0) continue;

    const declared = info.stages?.[i]?.title;
    const name = escapeXml(declared || `Étape ${i + 1}`);
    tracks.push(`  <trk>\n    <name>${name}</name>\n${segments.join("\n")}\n  </trk>`);
  }

  if (tracks.length === 0) return false;

  const gpx = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<gpx version="1.1" creator="Partage de balades familiales" xmlns="http://www.topografix.com/GPX/1/1">',
    "  <metadata>",
    `    <name>${escapeXml(info.title || slug)}</name>`,
    "  </metadata>",
    tracks.join("\n"),
    "</gpx>",
    "",
  ].join("\n");

  await fs.writeFile(path.join(dir, MERGED_NAME), gpx, "utf-8");
  return true;
}

function escapeXml(text) {
  return String(text).replace(/[<>&'"]/g, (c) =>
    ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", "'": "&apos;", '"': "&quot;" }[c])
  );
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

  await buildMergedTracks();

  console.log(
    written.length > 0
      ? `[prepare] ${written.length} sortie(s) proposée(s) intégrée(s) : ${written.join(", ")}`
      : "[prepare] Aucune sortie proposée à intégrer."
  );

  // Fichier « parcours complet » pour toutes les sorties à plusieurs étapes,
  // qu'elles viennent du dépôt ou d'une proposition.
  const dirs = (await fs.readdir(OUT_DIR, { withFileTypes: true }))
    .filter((d) => d.isDirectory() && !d.name.startsWith("."))
    .map((d) => d.name);

  let merged = 0;
  for (const slug of dirs) {
    if (await buildMergedGpx(path.join(OUT_DIR, slug), slug)) merged += 1;
  }
  console.log(`[prepare] ${merged} parcours complet(s) généré(s).`);
}

main().catch((err) => {
  // Une panne de stockage ne doit jamais empêcher le site de se construire.
  console.warn(`[sync] Ignoré : ${err.message}`);
});
