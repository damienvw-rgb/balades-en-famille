/**
 * Couche de stockage à deux pilotes.
 *
 *  - En production sur Vercel : Vercel Blob, en mode PRIVÉ. Les données
 *    déposées par les visiteurs contiennent des adresses email, elles ne
 *    doivent jamais être lisibles depuis une URL publique.
 *  - En local, ou tant que BLOB_READ_WRITE_TOKEN n'est pas défini : de simples
 *    fichiers JSON dans .data/, ce qui permet de tout tester sans rien brancher.
 *
 * Le reste de l'application ne sait pas lequel des deux est actif.
 */
import fs from "fs/promises";
import path from "path";

const LOCAL_DIR = path.join(process.cwd(), ".data");

// Le pilote Blob s'active dès qu'un token d'écriture est présent. BLOB_STORE_ID
// couvre le cas où l'accès se fait par jeton OIDC plutôt que par token statique.
export const usingBlob = Boolean(
  process.env.BLOB_READ_WRITE_TOKEN || process.env.BLOB_STORE_ID
);

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

// --- Pilote Vercel Blob (store privé) ---------------------------------------

async function blobModule() {
  return import("@vercel/blob");
}

/**
 * Lit un blob privé et le décode en JSON.
 * get() renvoie un flux, pas une URL : c'est justement ce qui garantit que le
 * contenu ne transite jamais par une adresse publique.
 */
async function readJson(pathname) {
  const { get } = await blobModule();
  try {
    const result = await get(pathname, {
      access: "private",
      useCache: false, // on veut toujours la dernière version, pas le cache CDN
    });
    if (!result || result.statusCode !== 200 || !result.stream) return null;
    return await new Response(result.stream).json();
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
      access: "private",
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
    // list() est paginé : sans boucle, on perd les entrées au delà de la
    // première page dès que le nombre de propositions grandit.
    do {
      const page = await list({ prefix: `${prefix}/`, cursor, limit: 250 });
      for (const b of page.blobs) {
        const value = await readJson(b.pathname);
        // On ignore une entrée illisible plutôt que de tout faire échouer.
        if (value) out.push(value);
      }
      cursor = page.cursor;
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
  driverName: usingBlob ? "vercel-blob (privé)" : "fichiers locaux (.data/)",
};
