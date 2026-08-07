// ---------------------------------------------------------------------------
// Types d'activité (champ "activity")
// ---------------------------------------------------------------------------
export const ACTIVITIES = {
  velo: { emoji: "🚲", label: "Vélo" },
  vtt: { emoji: "🚵", label: "VTT" },
  rando: { emoji: "🥾", label: "Randonnée" },
  marche: { emoji: "🚶", label: "Marche" },
  gravel: { emoji: "🚴", label: "Gravel" },
  kayak: { emoji: "🛶", label: "Kayak" },
  ski: { emoji: "⛷️", label: "Ski" },
  raquettes: { emoji: "🌨️", label: "Raquettes" },
  cheval: { emoji: "🐴", label: "Cheval" },
  autre: { emoji: "🧭", label: "Autre" },
};

const ACTIVITY_FALLBACK = { emoji: "🧭", label: "Sortie" };

export function getActivity(key) {
  if (!key) return ACTIVITIES.velo;
  return ACTIVITIES[String(key).toLowerCase()] || ACTIVITY_FALLBACK;
}

// ---------------------------------------------------------------------------
// Niveaux de difficulté
// ---------------------------------------------------------------------------
export const DIFFICULTIES = [
  "Très facile",
  "Facile",
  "Modérée",
  "Sportive",
  "Difficile",
];

// ---------------------------------------------------------------------------
// Types de logement
// ---------------------------------------------------------------------------
export const LODGINGS = {
  bivouac: { emoji: "🏕️", label: "Bivouac" },
  camping: { emoji: "⛺", label: "Camping" },
  wtmg: { emoji: "🌻", label: "Welcome To My Garden" },
  warmshowers: { emoji: "🚿", label: "Warmshowers" },
  hotel: { emoji: "🏨", label: "Hôtel" },
  gite: { emoji: "🏡", label: "Gîte" },
  refuge: { emoji: "🛖", label: "Refuge" },
  auberge: { emoji: "🛏️", label: "Auberge de jeunesse" },
  amis: { emoji: "🏠", label: "Chez des amis" },
  van: { emoji: "🚐", label: "Van ou camping-car" },
  train: { emoji: "🚆", label: "Train de nuit" },
  maison: { emoji: "🏘️", label: "Retour à la maison" },
};

const LODGING_FALLBACK = { emoji: "🛌", label: "Logement" };

export function getLodging(key) {
  if (!key) return LODGING_FALLBACK;
  return LODGINGS[String(key).toLowerCase()] || LODGING_FALLBACK;
}

// ---------------------------------------------------------------------------
// Participants
//
// Le pictogramme masculin ou féminin est tiré au hasard, à partir d'une
// empreinte du contexte (le plus souvent le slug de la sortie). Le tirage est
// donc varié d'une sortie à l'autre mais stable d'un rechargement à l'autre :
// le serveur et le navigateur affichent la même chose, sans quoi React
// signalerait une différence d'hydratation et l'emoji clignoterait.
//
// Ce choix est expliqué dans les mentions légales.
// ---------------------------------------------------------------------------
export const PARTICIPANT_EMOJI = {
  adults: ["👩", "👨"],
  children: ["👧", "👦"],
};

/** Empreinte entière positive et stable d'une chaîne (variante de FNV-1a). */
function fingerprint(text) {
  let hash = 2166136261;
  const value = String(text || "");
  for (let i = 0; i < value.length; i += 1) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return Math.abs(hash);
}

/** Tire le pictogramme d'un groupe, au hasard mais toujours le même pour un seed donné. */
export function participantEmoji(group, seed = "") {
  const list = PARTICIPANT_EMOJI[group] || PARTICIPANT_EMOJI.adults;
  return list[fingerprint(`${seed}|${group}`) % list.length];
}

/** "2 adultes", "1 enfant" : le pluriel suit le nombre. */
export function participantLabel(group, count) {
  const singular = group === "children" ? "enfant" : "adulte";
  return `${count} ${singular}${count > 1 ? "s" : ""}`;
}

/**
 * Décompose les participants en groupes prêts à afficher.
 * Renvoie null si personne n'est renseigné, pour ne rien afficher du tout.
 */
export function participantGroups(participants, seed = "") {
  if (!participants) return null;
  const { adults, children } = participants;
  const groups = [];

  if (adults?.count) {
    groups.push({
      group: "adults",
      count: adults.count,
      emoji: participantEmoji("adults", seed),
      label: participantLabel("adults", adults.count),
      ages: null,
    });
  }

  if (children?.count) {
    groups.push({
      group: "children",
      count: children.count,
      emoji: participantEmoji("children", seed),
      label: participantLabel("children", children.count),
      ages: formatAges(children.ages),
    });
  }

  return groups.length > 0 ? groups : null;
}

/** Version texte, utile pour un titre de page ou un email : "2👩 / 3👧 (8, 11 et 13 ans)". */
export function formatParticipants(participants, seed = "") {
  const groups = participantGroups(participants, seed);
  if (!groups) return null;
  return groups
    .map((g) => `${g.count}${g.emoji}${g.ages ? ` (${g.ages})` : ""}`)
    .join(" / ");
}

/** "8, 11 et 13 ans" */
export function formatAges(ages) {
  if (!ages || ages.length === 0) return null;
  if (ages.length === 1) return `${ages[0]} ans`;
  return `${ages.slice(0, -1).join(", ")} et ${ages[ages.length - 1]} ans`;
}

// ---------------------------------------------------------------------------
// Matériel
//
// La déduction du pictogramme vit dans lib/gear.js, qui est le seul endroit du
// site à la faire. Le ré-export garde les anciens imports valides.
// ---------------------------------------------------------------------------
export { gearEmoji, GEAR_EMOJI_CHOICES, GEAR_FALLBACK, isKnownGearEmoji } from "./gear";

// ---------------------------------------------------------------------------
// Couleurs des étapes
// ---------------------------------------------------------------------------
export const STAGE_COLORS = [
  "#c1542d", "#d9a441", "#6f9464", "#4f7fa8", "#96628c", "#3f8f8a",
];

export function stageColor(index) {
  return STAGE_COLORS[index % STAGE_COLORS.length];
}

// ---------------------------------------------------------------------------
// Mise en forme
// ---------------------------------------------------------------------------

/** "Belgique · Brabant flamand" */
export function formatPlace(country, region) {
  return [country, region].filter(Boolean).join(" · ");
}

/** Coupe proprement au dernier mot entier, sans casser une phrase en plein milieu. */
export function truncate(text, max = 155) {
  const clean = String(text || "").trim();
  if (clean.length <= max) return { text: clean, truncated: false };
  const cut = clean.slice(0, max);
  const lastSpace = cut.lastIndexOf(" ");
  return {
    text: `${cut.slice(0, lastSpace > max * 0.6 ? lastSpace : max).trimEnd()}…`,
    truncated: true,
  };
}
