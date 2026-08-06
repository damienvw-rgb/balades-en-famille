/**
 * Attribution automatique d'un emoji au matériel saisi par un visiteur.
 * Le visiteur ne saisit que du texte, un champ par élément : l'emoji est
 * déduit ici, ce qui garde une présentation homogène sur tout le site.
 */
const RULES = [
  [/\b(vtt|mountain ?bike)\b/i, "🚵"],
  [/\b(v[ée]lo|bike|gravel|randonneuse|cargo)\b/i, "🚲"],
  [/\bremorque|carriole|chariot\b/i, "🛺"],
  [/\b(sacoche|bagagerie|porte-?bagage)\b/i, "👜"],
  [/\b(sac|sac ?[àa] ?dos|backpack)\b/i, "🎒"],
  [/\b(tente|tarp|abri)\b/i, "⛺"],
  [/\b(duvet|sac de couchage|matelas)\b/i, "🛏️"],
  [/\b(r[ée]chaud|gaz|popote|casserole)\b/i, "🔥"],
  [/\b(filtre|gourde|bidon|eau|hydratation)\b/i, "💧"],
  [/\b(casque|helmet)\b/i, "🪖"],
  [/\b(b[âa]ton|trekking pole)\b/i, "🥢"],
  [/\b(chaussure|bottine|basket)\b/i, "🥾"],
  [/\b(gps|garmin|wahoo|compteur|carte|boussole)\b/i, "🧭"],
  [/\b(lampe|frontale|[ée]clairage)\b/i, "🔦"],
  [/\b(pluie|imperm[ée]able|veste|poncho|coupe-vent)\b/i, "🧥"],
  [/\b(trousse|pharmacie|secours|premiers soins)\b/i, "🩹"],
  [/\b(outil|multi-?outil|chambre [àa] air|rustine|pompe|d[ée]monte)\b/i, "🔧"],
  [/\b(batterie|powerbank|dynamo|chargeur|panneau solaire)\b/i, "🔋"],
  [/\b(pique-?nique|repas|nourriture|ravitaillement|lyophilis)\b/i, "🍎"],
  [/\b(si[èe]ge|porte-?b[ée]b[ée]|suiveur|barre de traction)\b/i, "👧"],
  [/\b(jumelle|appareil photo|cam[ée]ra)\b/i, "📷"],
  [/\b(maillot|nage|serviette)\b/i, "🩱"],
  [/\b(cr[èè]me|solaire|lunettes)\b/i, "🕶️"],
];

const FALLBACK = "🎽";

export function gearEmoji(label) {
  const text = String(label || "");
  for (const [re, emoji] of RULES) {
    if (re.test(text)) return emoji;
  }
  return FALLBACK;
}

/** Normalise une liste de chaînes en objets { emoji, label }. */
export function normalizeGearItems(items) {
  if (!Array.isArray(items)) return null;
  const out = items
    .map((item) => {
      if (typeof item === "string") {
        const label = item.trim();
        return label ? { emoji: gearEmoji(label), label } : null;
      }
      if (item && item.label) {
        const label = String(item.label).trim();
        return label ? { emoji: item.emoji || gearEmoji(label), label } : null;
      }
      return null;
    })
    .filter(Boolean)
    .slice(0, 20);
  return out.length > 0 ? out : null;
}
