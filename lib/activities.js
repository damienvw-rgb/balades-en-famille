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
// Les emojis féminins sont un choix délibéré, expliqué dans les mentions
// légales : les femmes restent sous-représentées dans la représentation du
// voyage à vélo et de l'aventure en plein air.
// ---------------------------------------------------------------------------
export const PARTICIPANT_EMOJI = { adults: "👩", children: "👧" };

/** "2👩 / 3👧 (8, 11 et 13 ans)" — les âges ne concernent que les enfants. */
export function formatParticipants(participants) {
  if (!participants) return null;
  const { adults, children } = participants;
  const parts = [];

  if (adults?.count) parts.push(`${adults.count}${PARTICIPANT_EMOJI.adults}`);

  if (children?.count) {
    const ages = formatAges(children.ages);
    parts.push(`${children.count}${PARTICIPANT_EMOJI.children}${ages ? ` (${ages})` : ""}`);
  }

  return parts.length > 0 ? parts.join(" / ") : null;
}

/** "8, 11 et 13 ans" */
export function formatAges(ages) {
  if (!ages || ages.length === 0) return null;
  if (ages.length === 1) return `${ages[0]} ans`;
  return `${ages.slice(0, -1).join(", ")} et ${ages[ages.length - 1]} ans`;
}

// ---------------------------------------------------------------------------
// Matériel : chaque ligne saisie reçoit un emoji déduit de son intitulé.
// ---------------------------------------------------------------------------
const GEAR_RULES = [
  [/\b(tente|tarp|abri)\b/i, "⛺"],
  [/\b(sac|sacoche|bagage|bikepacking)\b/i, "🎒"],
  [/\b(réchaud|rechaud|gaz|popote|casserole)\b/i, "🔥"],
  [/\b(eau|gourde|filtre|poche)\b/i, "💧"],
  [/\b(vtt|gravel|vélo|velo|bike|cargo)\b/i, "🚲"],
  [/\b(remorque|carriole|chariot)\b/i, "🛺"],
  [/\b(siège|siege|porte-bébé|porte-bebe)\b/i, "👶"],
  [/\b(casque)\b/i, "⛑️"],
  [/\b(bâton|baton|trekking)\b/i, "🥢"],
  [/\b(duvet|sac de couchage|matelas)\b/i, "🛏️"],
  [/\b(frontale|lampe|éclairage|eclairage)\b/i, "🔦"],
  [/\b(carte|gps|boussole|garmin)\b/i, "🧭"],
  [/\b(pluie|imper|veste|poncho)\b/i, "🧥"],
  [/\b(chaussure|botte|basket)\b/i, "🥾"],
  [/\b(pique-nique|repas|nourriture|ravitaillement|vivres)\b/i, "🥪"],
  [/\b(trousse|pharmacie|secours|premiers)\b/i, "🩹"],
  [/\b(outil|rustine|chambre à air|pompe|multitool)\b/i, "🔧"],
  [/\b(batterie|powerbank|chargeur|solaire)\b/i, "🔋"],
  [/\b(jumelle|appareil photo|caméra|camera)\b/i, "📷"],
  [/\b(crème|creme|solaire|lunettes)\b/i, "🕶️"],
  [/\b(maillot|serviette|nage)\b/i, "🩱"],
  [/\b(chien|animal)\b/i, "🐕"],
];

/** Déduit un emoji à partir de l'intitulé saisi, sinon une puce neutre. */
export function gearEmoji(label) {
  const text = String(label || "");
  for (const [pattern, emoji] of GEAR_RULES) {
    if (pattern.test(text)) return emoji;
  }
  return "▫️";
}

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
