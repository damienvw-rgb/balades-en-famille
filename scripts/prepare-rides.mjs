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
const CORRECTIONS = path.join(process.cwd(), "corrections.json");

// Le pilote Blob s'active exactement dans les mêmes conditions que
// lib/storage.js, sinon le build et le runtime ne lisent pas la même chose.
const usingBlob = Boolean(
  process.env.BLOB_READ_WRITE_TOKEN || process.env.BLOB_STORE_ID
);

/**
 * Lit un blob privé et le décode en JSON.
 *
 * Le store est en mode privé : ses URL ne sont pas récupérables par un simple
 * fetch, elles répondent 403. Il faut passer par get() du SDK, comme dans
 * lib/storage.js. C'est aussi ce qui garantit qu'une proposition, qui contient
 * l'adresse email de son auteur, n'est jamais servie depuis une URL publique.
 */
async function readJson(get, pathname) {
  const result = await get(pathname, {
    access: "private",
    useCache: false, // on veut la dernière version, pas le cache CDN
  });
  if (!result || result.statusCode !== 200 || !result.stream) return null;
  return await new Response(result.stream).json();
}

async function loadSubmissions() {
  if (usingBlob) {
    const { list, get } = await import("@vercel/blob");
    const out = [];
    let found = 0;
    let unreadable = 0;
    let cursor;

    // list() est paginé : sans boucle, on perd les entrées au delà de la
    // première page dès que le nombre de propositions grandit.
    do {
      const page = await list({ prefix: "submissions/", cursor, limit: 250 });
      for (const b of page.blobs) {
        found += 1;
        try {
          const value = await readJson(get, b.pathname);
          if (value) out.push(value);
          else unreadable += 1;
        } catch (err) {
          unreadable += 1;
          console.warn(`[prepare] ${b.pathname} illisible : ${err.message}`);
        }
      }
      cursor = page.cursor;
    } while (cursor);

    console.log(`[prepare] Stockage Blob : ${found} proposition(s) trouvée(s).`);

    // Une lecture qui échoue en silence est ce qui rend ce genre de panne
    // invisible : le build réussit et le site sort incomplet, sans un mot.
    // On ne fait pas échouer le build pour autant, sinon une entrée corrompue
    // dépublierait toutes les autres sorties déjà en ligne.
    if (unreadable > 0) {
      console.warn(
        `[prepare] ATTENTION : ${unreadable} proposition(s) sur ${found} illisibles. ` +
          "Vérifie que le store Blob est bien en mode privé et que " +
          "BLOB_READ_WRITE_TOKEN est disponible au moment du build."
      );
    }

    return out;
  }

  // Repli local : les mêmes fichiers que le pilote de développement
  console.log("[prepare] Aucun stockage Blob configuré, repli sur .data/.");
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

/**
 * Corrections à appliquer aux sorties proposées, lues dans corrections.json.
 *
 * Une sortie proposée par un visiteur vit dans le stockage, pas dans le dépôt :
 * on ne peut donc pas la retoucher à la main comme un info.json. Ce fichier
 * permet de corriger un champ après coup, sans réécrire la proposition
 * d'origine ni redemander quoi que ce soit à son auteur.
 *
 * Format : { "slug-de-la-sortie": { "difficulty": "Difficile" } }
 *
 * Absent ou illisible, on continue sans corriger : ce n'est jamais une raison
 * de faire échouer un build.
 */
async function loadCorrections() {
  try {
    const value = JSON.parse(await fs.readFile(CORRECTIONS, "utf-8"));
    return value && typeof value === "object" ? value : {};
  } catch (err) {
    if (err.code !== "ENOENT") {
      console.warn(`[prepare] corrections.json illisible, ignoré : ${err.message}`);
    }
    return {};
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
      '<gpx version="1.1" creator="Famille en vadrouille" xmlns="http://www.topografix.com/GPX/1/1">',
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
    '<gpx version="1.1" creator="Famille en vadrouille" xmlns="http://www.topografix.com/GPX/1/1">',
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
  const corrections = await loadCorrections();
  const applied = [];
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

    // La correction est repérée par le slug d'origine, celui que tu vois dans
    // l'adresse de la sortie, pas par le slug suffixé en cas de collision.
    const fix = corrections[s.slug];
    if (fix && typeof fix === "object") applied.push(s.slug);

    const info = {
      ...s.info,
      ...(fix && typeof fix === "object" ? fix : {}),
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
      : `[prepare] Aucune sortie proposée à intégrer (${submissions.length} proposition(s) lue(s), ${approved.length} approuvée(s)).`
  );

  // Une correction déclarée pour un slug qui n'existe plus passerait autrement
  // totalement inaperçue : on dit ce qui a servi et ce qui n'a servi à rien.
  const declared = Object.keys(corrections);
  if (declared.length > 0) {
    const unused = declared.filter((slug) => !applied.includes(slug));
    console.log(`[prepare] ${applied.length} correction(s) appliquée(s) sur ${declared.length} déclarée(s).`);
    if (unused.length > 0) {
      console.warn(`[prepare] Correction sans sortie correspondante : ${unused.join(", ")}`);
    }
  }

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
