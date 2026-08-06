// ---------------------------------------------------------------------------
// Types d'activité (champ "activity" dans info.json)
// ---------------------------------------------------------------------------
export const ACTIVITIES = {
  velo: { emoji: "🚲", label: "Vélo" },
  rando: { emoji: "🥾", label: "Randonnée" },
  marche: { emoji: "🚶", label: "Marche" },
  vtt: { emoji: "🚵", label: "VTT" },
  kayak: { emoji: "🛶", label: "Kayak" },
  ski: { emoji: "⛷️", label: "Ski" },
};

const ACTIVITY_FALLBACK = { emoji: "📍", label: "Sortie" };

export function getActivity(key) {
  if (!key) return ACTIVITIES.velo;
  return ACTIVITIES[String(key).toLowerCase()] || ACTIVITY_FALLBACK;
}

// ---------------------------------------------------------------------------
// Types de logement (champ "lodging.type" d'une étape)
// ---------------------------------------------------------------------------
export const LODGINGS = {
  bivouac: { emoji: "🏕️", label: "Bivouac" },
  camping: { emoji: "⛺", label: "Camping" },
  hotel: { emoji: "🏨", label: "Hôtel" },
  gite: { emoji: "🏡", label: "Gîte" },
  refuge: { emoji: "🛖", label: "Refuge" },
  auberge: { emoji: "🛏️", label: "Auberge" },
  amis: { emoji: "🏠", label: "Chez des amis" },
  van: { emoji: "🚐", label: "Van" },
  maison: { emoji: "🏘️", label: "Retour à la maison" },
};

const LODGING_FALLBACK = { emoji: "🛌", label: "Logement" };

export function getLodging(key) {
  if (!key) return LODGING_FALLBACK;
  return LODGINGS[String(key).toLowerCase()] || LODGING_FALLBACK;
}

// ---------------------------------------------------------------------------
// Participants
// ---------------------------------------------------------------------------
export const PARTICIPANT_EMOJI = { adults: "🧑", children: "🧒" };

// ---------------------------------------------------------------------------
// Couleurs attribuées aux étapes successives d'une même sortie
// ---------------------------------------------------------------------------
export const STAGE_COLORS = [
  "#c1542d",
  "#d9a441",
  "#8fae87",
  "#6a8caf",
  "#a9739b",
  "#5f9ea0",
];

export function stageColor(index) {
  return STAGE_COLORS[index % STAGE_COLORS.length];
}

// ---------------------------------------------------------------------------
// Mise en forme
// ---------------------------------------------------------------------------

/** "Belgique · Brabant flamand", ou l'un des deux si l'autre manque. */
export function formatPlace(country, region) {
  return [country, region].filter(Boolean).join(" · ");
}

/** "8, 11 et 13 ans" */
export function formatAges(ages) {
  if (!ages || ages.length === 0) return null;
  if (ages.length === 1) return `${ages[0]} ans`;
  const head = ages.slice(0, -1).join(", ");
  return `${head} et ${ages[ages.length - 1]} ans`;
}
