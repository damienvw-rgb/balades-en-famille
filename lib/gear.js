/**
 * Attribution d'un pictogramme au matériel saisi par un visiteur.
 *
 * C'est le seul endroit du site où cette déduction est faite : le formulaire,
 * l'API et les pages de sortie appellent tous ce fichier, l'emoji affiché est
 * donc toujours le même pour un libellé donné.
 *
 * Trois principes :
 *
 * 1. Le libellé est mis à plat avant comparaison (minuscules, sans accents,
 *    ponctuation remplacée par des espaces). « Vélo », « velo » et « VÉLO »
 *    sont donc traités de la même façon.
 * 2. Les motifs ne s'accrochent qu'au début d'un mot, jamais à sa fin. Un
 *    pluriel ou un suffixe ne casse plus la reconnaissance : « 3 vélos bemoov »
 *    trouve bien « velo », « 4 sacoches » trouve bien « sacoche ».
 * 3. Quand plusieurs mots reconnus cohabitent, celui qui apparaît le plus tôt
 *    dans le libellé l'emporte. « 4 sacoches / fontes / vélo d'adulte » parle
 *    d'abord de sacoches : c'est donc le pictogramme des sacoches qui sort,
 *    pas celui du vélo.
 */

/** Minuscules, sans accents, ponctuation ramenée à des espaces. */
function flatten(text) {
  return String(text || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

/**
 * Chaque entrée est [liste de racines, emoji].
 * Les racines s'écrivent sans accent et au singulier : le pluriel et les
 * suffixes courants sont couverts automatiquement.
 * L'ordre ne sert qu'à départager deux racines trouvées à la même position.
 */
const RULES = [
  // Portage, avant le vélo : « sacoche de vélo » parle d'un sac, pas d'un vélo
  [["sacoche", "fonte", "bagagerie", "porte bagage", "portebagage", "panier"], "👜"],
  [["sac a dos", "sacados", "backpack", "sac", "besace", "musette"], "🎒"],
  [["remorque", "carriole", "chariot", "caddie", "chariote"], "🛺"],

  // Couchage et abri
  [["tente", "tarp", "abri", "bivouac", "tipi"], "⛺"],
  [["duvet", "sac de couchage", "matelas", "hamac", "oreiller", "couchage"], "🛏️"],

  // Cuisine et eau
  [["rechaud", "gaz", "popote", "casserole", "brulot", "cuisson", "gamelle"], "🔥"],
  [["gourde", "bidon", "filtre", "poche a eau", "hydratation", "eau"], "💧"],
  [["pique nique", "piquenique", "repas", "nourriture", "ravitaillement", "vivre",
    "barre", "lyophilis", "casse croute"], "🥪"],

  // Roulant
  [["vtt", "mountain bike", "tout suspendu"], "🚵"],
  [["velo", "bike", "gravel", "randonneuse", "cargo", "bicyclette", "monture",
    "tandem", "vae", "biporteur", "longtail"], "🚲"],
  [["trottinette"], "🛴"],
  [["suiveur", "barre de traction", "follow me", "trail gator", "trailgator"], "🚲"],

  // Enfants
  [["siege", "porte bebe", "portebebe", "rehausseur"], "👶"],
  [["poussette"], "🍼"],

  // Sécurité et protection
  [["casque", "helmet", "genouillere", "coudiere", "protection"], "⛑️"],
  [["gilet", "fluo", "reflechissant", "haute visibilite"], "🦺"],
  [["antivol", "cadenas", "chaine", "cable"], "🔒"],

  // Vêtements
  [["pluie", "impermeable", "poncho", "kway", "k way", "coupe vent", "coupevent",
    "veste", "cape"], "🧥"],
  [["gant", "bonnet", "buff", "polaire", "moufle", "cagoule"], "🧤"],
  [["chaussure", "bottine", "botte", "basket", "soulier", "godillot", "sandale",
    "chausson"], "🥾"],
  [["maillot", "nage", "serviette", "essuie"], "🩱"],

  // Marche
  [["baton", "trekking pole", "canne"], "🥢"],
  [["crampon", "piolet", "raquette"], "🧗"],

  // Orientation et électronique
  [["gps", "garmin", "wahoo", "compteur", "traceur", "boussole", "altimetre"], "🧭"],
  [["carte", "topo", "guide", "ign", "roadbook"], "🗺️"],
  [["frontale", "lampe", "eclairage", "phare", "feu", "torche"], "🔦"],
  [["batterie", "powerbank", "power bank", "chargeur", "dynamo", "panneau solaire",
    "solaire"], "🔋"],
  [["telephone", "gsm", "smartphone", "portable"], "📱"],
  [["appareil photo", "camera", "gopro", "jumelle", "drone"], "📷"],

  // Réparation et soins
  [["rustine", "chambre a air", "pompe", "demonte", "multi outil", "multioutil",
    "outil", "cle allen", "maillon", "derive chaine", "graisse", "lubrifiant"], "🔧"],
  [["trousse", "pharmacie", "secours", "premiers soins", "pansement",
    "medicament"], "🩹"],
  [["creme", "solaire", "lunette", "chapeau", "casquette"], "🕶️"],
  [["moustique", "repulsif", "tique"], "🦟"],

  // Divers
  [["chien", "animal", "chat"], "🐕"],
  [["livre", "carnet", "jeu", "cartes a jouer"], "📔"],
  [["papier", "passeport", "identite", "assurance"], "🪪"],
  [["argent", "monnaie", "cash"], "💶"],
];

/** Emoji utilisé quand aucune racine n'est reconnue. */
export const GEAR_FALLBACK = "🎒";

/**
 * Palette proposée au visiteur quand le pictogramme déduit ne lui convient
 * pas. L'ordre suit celui des règles, sans doublon, et le repli ferme la liste.
 */
export const GEAR_EMOJI_CHOICES = (() => {
  const seen = new Set();
  const out = [];
  for (const [, emoji] of RULES) {
    if (!seen.has(emoji)) {
      seen.add(emoji);
      out.push(emoji);
    }
  }
  for (const extra of ["🧺", "🪣", "🧻", "🧼", "🔌", "🎣", "🎿", "⛵", "🪁", "▫️", GEAR_FALLBACK]) {
    if (!seen.has(extra)) {
      seen.add(extra);
      out.push(extra);
    }
  }
  return out;
})();

/**
 * Cherche une racine en début de mot et renvoie sa position, ou -1.
 * Le texte reçu est déjà mis à plat, il est donc entouré d'espaces pour que
 * « velo » corresponde aussi bien au premier qu'au dernier mot.
 */
function rootPosition(flat, root) {
  const padded = ` ${flat} `;
  const index = padded.indexOf(` ${root}`);
  return index === -1 ? -1 : index;
}

/**
 * Déduit un pictogramme à partir d'un libellé libre.
 * Renvoie le repli si rien n'est reconnu.
 */
export function gearEmoji(label) {
  const flat = flatten(label);
  if (!flat) return GEAR_FALLBACK;

  let best = null;

  RULES.forEach(([roots, emoji], ruleIndex) => {
    for (const root of roots) {
      const position = rootPosition(flat, root);
      if (position === -1) continue;

      // Le mot le plus à gauche gagne. À position égale, la racine la plus
      // longue puis la règle la plus haute dans la liste l'emportent.
      const candidate = { position, length: root.length, ruleIndex, emoji };
      if (
        !best ||
        candidate.position < best.position ||
        (candidate.position === best.position && candidate.length > best.length) ||
        (candidate.position === best.position &&
          candidate.length === best.length &&
          candidate.ruleIndex < best.ruleIndex)
      ) {
        best = candidate;
      }
    }
  });

  return best ? best.emoji : GEAR_FALLBACK;
}

/** Vrai si l'emoji fourni fait partie de la palette proposée. */
export function isKnownGearEmoji(emoji) {
  return GEAR_EMOJI_CHOICES.includes(String(emoji));
}

/**
 * Normalise une liste de matériel en objets { emoji, label }.
 * Une chaîne simple reçoit l'emoji déduit. Un objet qui porte déjà un emoji
 * le conserve : c'est ainsi qu'un choix manuel du visiteur survit au build.
 */
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
        if (!label) return null;
        const chosen = item.emoji ? String(item.emoji).trim() : "";
        return { emoji: chosen || gearEmoji(label), label };
      }
      return null;
    })
    .filter(Boolean)
    .slice(0, 20);
  return out.length > 0 ? out : null;
}
