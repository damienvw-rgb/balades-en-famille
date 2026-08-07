/**
 * Couche de stockage à deux pilotes.
 *
 *  - En production sur Vercel : Vercel Blob (produit maison, 1 Go gratuit sur
 *    le plan Hobby, aucun compte tiers à créer).
 *  - En local, ou tant qu'aucun store Blob n'est branché : de simples fichiers
 *    JSON dans .data/, ce qui permet de tout tester sans rien configurer.
 *
 * Le reste de l'application ne sait pas lequel des deux est actif.
 *
 * Store PRIVÉ par défaut. Les données stockées ici contiennent des adresses
 * email (identités, commentaires, propositions, messages de contact). Un store
 * public les rendrait lisibles par quiconque devine l'URL, d'autant plus que
 * les clés n'ont pas de suffixe aléatoire. Le mode privé est donc le bon choix,
 * et il est irréversible une fois le store créé : on ne relit jamais un blob
 * par un fetch direct sur son URL, mais toujours par get() du SDK, qui
 * s'authentifie tout seul.
 */
import fs from "fs/promises";
import path from "path";

const LOCAL_DIR = path.join(process.cwd(), ".data");

/**
 * Le pilote Blob s'active dès qu'une des deux authentifications est disponible :
 *  - BLOB_READ_WRITE_TOKEN, le jeton statique du store
 *  - BLOB_STORE_ID, injecté automatiquement par Vercel, utilisé avec OIDC
 * Sans l'un ni l'autre, on retombe sur les fichiers locaux.
 */
export const usingBlob = Boolean(
  process.env.BLOB_READ_WRITE_TOKEN || process.env.BLOB_STORE_ID
);

/**
 * Mode d'accès du store. Privé sauf si BLOB_ACCESS vaut explicitement "public".
 * Doit correspondre au mode choisi à la création du store dans Vercel, sinon
 * chaque écriture est refusée.
 */
const ACCESS = process.env.BLOB_ACCESS === "public" ? "public" : "private";

// --- Pilote local -----------------------------------------------------------

function localPath(key) {
  return path.join(LOCAL_DIR, `${key}.json`);
}

const local = {
  async get(key) {
    try {
      return JSON.parse(await fs.readFile(localPath(key), "utf-8"));
    } catch {
      return null;
    }
  },
  async put(key, value) {
    const file = localPath(key);
    await fs.mkdir(path.dirname(file), { recursive: true });
    await fs.writeFile(file, JSON.stringify(value, null, 2), "utf-8");
    return value;
  },
  async del(key) {
    try {
      await fs.unlink(localPath(key));
    } catch {
      /* déjà absent */
    }
  },
  async list(prefix) {
    const dir = path.join(LOCAL_DIR, prefix);
    let names;
    try {
      names = await fs.readdir(dir);
    } catch {
      return [];
    }
    const out = [];
    for (const name of names.filter((n) => n.endsWith(".json"))) {
      const value = await local.get(`${prefix}/${name.replace(/\.json$/, "")}`);
      if (value) out.push(value);
    }
    return out;
  },
};

// --- Pilote Vercel Blob -----------------------------------------------------

async function blobModule() {
  return import("@vercel/blob");
}

/**
 * Lit un blob et le rend en objet.
 * useCache: false garantit qu'on relit bien la dernière version écrite et non
 * une copie de cache, ce qui compte pour un compteur de propositions ou un fil
 * de commentaires qui vient de changer.
 */
async function readJson(pathname) {
  const { get } = await blobModule();
  try {
    const res = await get(pathname, { access: ACCESS, useCache: false });
    if (!res || res.statusCode !== 200 || !res.stream) return null;
    return await new Response(res.stream).json();
  } catch {
    return null;
  }
}

const blob = {
  async get(key) {
    return readJson(`${key}.json`);
  },
  async put(key, value) {
    const { put } = await blobModule();
    await put(`${key}.json`, JSON.stringify(value), {
      access: ACCESS,
      contentType: "application/json",
      addRandomSuffix: false,
      allowOverwrite: true,
    });
    return value;
  },
  async del(key) {
    const { del } = await blobModule();
    try {
      await del(`${key}.json`);
    } catch {
      /* déjà absent */
    }
  },
  async list(prefix) {
    const { list } = await blobModule();
    const out = [];
    let cursor;

    // La liste est paginée : on boucle tant que Vercel annonce une suite.
    do {
      const page = await list({ prefix: `${prefix}/`, cursor });
      for (const b of page.blobs) {
        // On relit par pathname, jamais par URL : sur un store privé, l'URL
        // seule ne donne aucun accès.
        const value = await readJson(b.pathname);
        // On ignore une entrée illisible plutôt que de tout faire échouer.
        if (value) out.push(value);
      }
      cursor = page.hasMore ? page.cursor : undefined;
    } while (cursor);

    return out;
  },
};

// --- API publique -----------------------------------------------------------

const driver = usingBlob ? blob : local;

export const storage = {
  get: (key) => driver.get(key),
  put: (key, value) => driver.put(key, value),
  del: (key) => driver.del(key),
  list: (prefix) => driver.list(prefix),
  driverName: usingBlob
    ? `vercel-blob (${ACCESS})`
    : "fichiers locaux (.data/)",
};
