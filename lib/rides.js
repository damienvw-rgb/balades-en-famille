import fs from "fs";
import path from "path";
import { parseGpx } from "./gpx";
import { stageColor, truncate } from "./activities";
import { normalizeGearItems } from "./gear";

const RIDES_DIR = path.join(process.cwd(), "public", "rides");

export function getRideSlugs() {
  if (!fs.existsSync(RIDES_DIR)) return [];
  return fs
    .readdirSync(RIDES_DIR, { withFileTypes: true })
    .filter((d) => d.isDirectory() && !d.name.startsWith("."))
    .map((d) => d.name);
}

// ---------------------------------------------------------------------------
// Normalisation des champs optionnels
// Tout champ absent devient null, et les composants ne l'affichent pas.
// ---------------------------------------------------------------------------

/**
 * Accepte soit un nombre (2), soit un tableau d'âges ([8, 11]).
 * Renvoie { count, ages } ou null si personne.
 */
function normalizeGroup(value) {
  if (Array.isArray(value)) {
    const ages = value.filter((a) => typeof a === "number");
    if (value.length === 0) return null;
    return { count: value.length, ages };
  }
  if (typeof value === "number" && value > 0) {
    return { count: value, ages: [] };
  }
  return null;
}

function normalizeParticipants(raw) {
  if (!raw) return null;
  const adults = normalizeGroup(raw.adults);
  const children = normalizeGroup(raw.children);
  if (!adults && !children) return null;
  return { adults, children };
}

/** Accepte "Camping Sarathei" ou { type: "camping", text: "..." }. */
function normalizeLodging(raw) {
  if (!raw) return null;
  if (typeof raw === "string") {
    return raw.trim() ? { type: null, text: raw.trim() } : null;
  }
  const text = (raw.text || raw.name || "").trim();
  if (!raw.type && !text) return null;
  return { type: raw.type || null, text: text || null };
}

// ---------------------------------------------------------------------------
// Lecture des sorties
// ---------------------------------------------------------------------------

function loadInfo(slug) {
  const infoPath = path.join(RIDES_DIR, slug, "info.json");
  const raw = fs.existsSync(infoPath)
    ? JSON.parse(fs.readFileSync(infoPath, "utf-8"))
    : {};

  return {
    title: raw.title || slug,
    activity: raw.activity || "velo",
    date: raw.date || null,
    country: raw.country || null,
    region: raw.region || null,
    difficulty: raw.difficulty || null,
    description: raw.description || "",
    tags: Array.isArray(raw.tags) ? raw.tags : [],
    author: raw.author || null,
    submissionId: raw.submissionId || null,
    participants: normalizeParticipants(raw.participants),
    gear: normalizeGearItems(raw.gear),
    declaredStages: Array.isArray(raw.stages) ? raw.stages : null,
  };
}

/**
 * Determines the ordered list of GPX files for an outing.
 * A "stages" block in info.json wins. Otherwise every .gpx in the folder is
 * picked up in natural filename order, so etape-1.gpx / etape-2.gpx just works.
 *
 * An untitled stage keeps an empty title rather than a "Étape 2" placeholder:
 * the display layer already prefixes every stage with its number through
 * stageLabel(), and a placeholder here would come back as "Étape 2 · Étape 2".
 */
function resolveStageFiles(slug, info) {
  if (info.declaredStages && info.declaredStages.length > 0) {
    return info.declaredStages.map((stage) => ({
      file: stage.file,
      title: stage.title || "",
      description: stage.description || "",
      lodging: normalizeLodging(stage.lodging),
    }));
  }

  const files = fs
    .readdirSync(path.join(RIDES_DIR, slug))
    .filter((f) => f.toLowerCase().endsWith(".gpx") && f !== "parcours-complet.gpx")
    .sort((a, b) => a.localeCompare(b, "fr", { numeric: true }));

  return files.map((file) => ({
    file,
    title: "",
    description: "",
    lodging: null,
  }));
}

function loadStages(slug, info) {
  const dir = path.join(RIDES_DIR, slug);
  return resolveStageFiles(slug, info)
    .map((stage, i) => {
      const gpxPath = path.join(dir, stage.file);
      if (!fs.existsSync(gpxPath)) {
        console.warn(`GPX introuvable, etape ignoree : ${slug}/${stage.file}`);
        return null;
      }
      return {
        ...stage,
        ...parseGpx(fs.readFileSync(gpxPath, "utf-8")),
        color: stageColor(i),
        gpxUrl: `/rides/${slug}/${stage.file}`,
      };
    })
    .filter(Boolean);
}

function fullGpxUrl(slug, stages) {
  // Fichier fusionné écrit au build (voir scripts/prepare-rides.mjs).
  // Pour une sortie à trace unique, on pointe directement dessus.
  return stages.length > 1
    ? `/rides/${slug}/parcours-complet.gpx`
    : stages[0]?.gpxUrl || null;
}

function totals(stages) {
  return {
    distanceKm:
      Math.round(stages.reduce((sum, s) => sum + s.distanceKm, 0) * 10) / 10,
    elevationGain: stages.reduce((sum, s) => sum + s.elevationGain, 0),
    elevationLoss: stages.reduce((sum, s) => sum + s.elevationLoss, 0),
    stageCount: stages.length,
  };
}

// Lightweight summary for the home page grid (drops the point lists)
export function getRideSummaries() {
  return getRideSlugs()
    .map((slug) => {
      const info = loadInfo(slug);
      const stages = loadStages(slug, info);
      const { declaredStages, ...rest } = info;
      const short = truncate(info.description, 155);
      return {
        slug,
        ...rest,
        // Version courte pour la grille : la fiche complète garde le texte entier
        description: short.text,
        descriptionTruncated: short.truncated,
        hasMergedGpx: stages.length > 1,
        ...totals(stages),
      };
    })
    .filter((ride) => ride.stageCount > 0)
    .sort((a, b) => (b.date || "").localeCompare(a.date || ""));
}

// Full detail for one outing, including every stage's track points
export function getRideDetail(slug) {
  const info = loadInfo(slug);
  const stages = loadStages(slug, info);
  const { declaredStages, ...rest } = info;
  return {
    slug,
    ...rest,
    stages,
    ...totals(stages),
    fullGpxUrl: fullGpxUrl(slug, stages),
  };
}


// ---------------------------------------------------------------------------
// Utilisé par les routes API (notification de l'auteur d'une sortie)
// ---------------------------------------------------------------------------

export async function getAllRideSlugs() {
  return getRideSlugs();
}

/**
 * Renvoie de quoi prévenir l'auteur d'une sortie qu'elle a été commentée.
 * Pour une sortie proposée par un visiteur, l'adresse est relue depuis le
 * stockage : elle n'est jamais écrite dans public/, donc jamais servie au
 * navigateur. Pour une sortie du dépôt, c'est l'administrateur qui est prévenu.
 */
export async function getRideAuthor(slug) {
  if (!getRideSlugs().includes(slug)) return null;

  const info = loadInfo(slug);
  let authorEmail = process.env.ADMIN_EMAIL || null;

  if (info.submissionId) {
    try {
      const { getSubmission } = await import("./store");
      const submission = await getSubmission(info.submissionId);
      if (submission?.authorEmail) authorEmail = submission.authorEmail;
    } catch {
      /* on retombe sur l'administrateur */
    }
  }

  return { title: info.title, author: info.author, authorEmail };
}
