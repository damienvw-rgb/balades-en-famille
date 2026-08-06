/**
 * Attribue un emoji à un équipement à partir de son libellé.
 * Le visiteur saisit du texte, l'emoji est déduit ici : il n'a pas à choisir
 * dans une liste, et la présentation reste homogène sur tout le site.
 */
const RULES = [
  [/\b(sacoche|bagage|porte-?bagage)/i, "👜"],
  [/\b(sac|bagage à dos|backpack)/i, "🎒"],
  [/\btente|bivouac|tarp\b/i, "⛺"],
  [/\b(duvet|sac de couchage|matelas)/i, "🛌"],
  [/\b(réchaud|rechaud|gaz|popote|casserole)/i, "🔥"],
  [/\b(filtre|gourde|eau|bidon|hydratation)/i, "💧"],
  [/\b(vtt|tout ?suspendu|gravel)/i, "🚵"],
  [/\b(vélo|velo|bike|cargo)/i, "🚲"],
  [/\b(remorque|carriole|chariot)/i, "🛺"],
  [/\b(casque|protection|genouillère)/i, "⛑️"],
  [/\b(bâton|baton|trekking pole)/i, "🥢"],
  [/\b(chaussure|godillot|basket|soulier)/i, "🥾"],
  [/\b(gps|garmin|wahoo|compteur|traceur)/i, "🧭"],
  [/\b(carte|topo|guide)/i, "🗺️"],
  [/\b(frontale|lampe|éclairage|eclairage)/i, "🔦"],
  [/\b(batterie|powerbank|chargeur|dynamo)/i, "🔋"],
  [/\b(pluie|imperméable|impermeable|poncho|k-?way)/i, "🌧️"],
  [/\b(crème|creme|solaire|lunette)/i, "🕶️"],
  [/\b(trousse|secours|pharmacie|médicament)/i, "🩹"],
  [/\b(rustine|chambre à air|pompe|démonte|multi-?outil|outil)/i, "🔧"],
  [/\b(pique-?nique|repas|nourriture|ravitaillement|barre)/i, "🥪"],
  [/\b(siège|siege|porte-?bébé|porte-?bebe)/i, "👶"],
  [/\b(jumelle|appareil photo|caméra|camera)/i, "📷"],
  [/\b(antivol|cadenas|cable)/i, "🔒"],
  [/\b(gant|bonnet|buff|veste|polaire)/i, "🧤"],
];

const FALLBACK = "🎒";

export function gearEmoji(label) {
  const text = String(label || "");
  for (const [pattern, emoji] of RULES) {
    if (pattern.test(text)) return emoji;
  }
  return FALLBACK;
}
