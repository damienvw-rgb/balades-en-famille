/**
 * Couche de stockage à deux pilotes.
 *
 *  - En production sur Vercel : Vercel Blob (produit maison, 1 Go gratuit sur
 *    le plan Hobby, aucun compte tiers à créer).
 *  - En local, ou tant que BLOB_READ_WRITE_TOKEN n'est pas défini : de simples
 *    fichiers JSON dans .data/, ce qui permet de tout tester sans rien brancher.
 *
 * Le reste de l'application ne sait pas lequel des deux est actif.
 */
import fs from "fs/promises";
import path from "path";

const LOCAL_DIR = path.join(process.cwd(), ".data");

export const usingBlob = Boolean(process.env.BLOB_READ_WRITE_TOKEN);

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

const blob = {
  async get(key) {
    const { head } = await blobModule();
    try {
      const meta = await head(`${key}.json`);
      const res = await fetch(meta.url, { cache: "no-store" });
      if (!res.ok) return null;
      return await res.json();
    } catch {
      return null;
    }
  },
  async put(key, value) {
    const { put } = await blobModule();
    await put(`${key}.json`, JSON.stringify(value), {
      access: "public",
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
    const { blobs } = await list({ prefix: `${prefix}/` });
    const out = [];
    for (const b of blobs) {
      try {
        const res = await fetch(b.url, { cache: "no-store" });
        if (res.ok) out.push(await res.json());
      } catch {
        /* on ignore une entrée illisible plutôt que de tout faire échouer */
      }
    }
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
  driverName: usingBlob ? "vercel-blob" : "fichiers locaux (.data/)",
};
