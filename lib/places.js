/**
 * Pays et régions proposés dans le formulaire.
 * "autre" est toujours disponible et bascule sur un champ libre, donc cette
 * liste n'a pas besoin d'être exhaustive : elle sert de raccourci.
 */
export const PLACES = {
  Belgique: [
    "Anvers", "Brabant flamand", "Brabant wallon", "Bruxelles", "Flandre-Occidentale",
    "Flandre-Orientale", "Hainaut", "Liège", "Limbourg", "Luxembourg", "Namur",
    "Ardennes", "Côte belge", "Campine",
  ],
  France: [
    "Auvergne-Rhône-Alpes", "Bourgogne-Franche-Comté", "Bretagne", "Centre-Val de Loire",
    "Corse", "Grand Est", "Hauts-de-France", "Île-de-France", "Normandie",
    "Nouvelle-Aquitaine", "Occitanie", "Pays de la Loire", "Provence-Alpes-Côte d'Azur",
  ],
  "Pays-Bas": [
    "Drenthe", "Flevoland", "Frise", "Gueldre", "Groningue", "Limbourg néerlandais",
    "Brabant-Septentrional", "Hollande-Septentrionale", "Overijssel", "Utrecht",
    "Zélande", "Hollande-Méridionale",
  ],
  Allemagne: [
    "Bade-Wurtemberg", "Bavière", "Berlin", "Brandebourg", "Brême", "Hambourg",
    "Hesse", "Mecklembourg-Poméranie", "Basse-Saxe", "Rhénanie-du-Nord-Westphalie",
    "Rhénanie-Palatinat", "Sarre", "Saxe", "Saxe-Anhalt", "Schleswig-Holstein",
    "Thuringe", "Eifel", "Forêt-Noire", "Moselle",
  ],
  Luxembourg: ["Ardennes luxembourgeoises", "Guttland", "Moselle", "Terres Rouges"],
  Suisse: [
    "Appenzell", "Argovie", "Berne", "Grisons", "Jura", "Lucerne", "Tessin",
    "Valais", "Vaud", "Zurich", "Oberland bernois", "Engadine",
  ],
  Italie: [
    "Abruzzes", "Calabre", "Campanie", "Émilie-Romagne", "Frioul-Vénétie Julienne",
    "Latium", "Ligurie", "Lombardie", "Marches", "Piémont", "Pouilles", "Sardaigne",
    "Sicile", "Toscane", "Trentin-Haut-Adige", "Ombrie", "Vénétie", "Dolomites",
  ],
  Espagne: [
    "Andalousie", "Aragon", "Asturies", "Baléares", "Canaries", "Cantabrie",
    "Castille-et-León", "Catalogne", "Galice", "Navarre", "Pays basque", "Valence",
    "Pyrénées", "Camino de Santiago",
  ],
  Autriche: [
    "Burgenland", "Carinthie", "Basse-Autriche", "Haute-Autriche", "Salzbourg",
    "Styrie", "Tyrol", "Vorarlberg", "Vienne",
  ],
  Portugal: ["Algarve", "Alentejo", "Centre", "Nord", "Lisbonne", "Madère", "Açores"],
  "Royaume-Uni": ["Angleterre", "Écosse", "Pays de Galles", "Irlande du Nord", "Cornouailles"],
  Irlande: ["Connacht", "Leinster", "Munster", "Ulster", "Wild Atlantic Way"],
  Danemark: ["Jutland", "Fionie", "Sjælland", "Bornholm"],
  Norvège: ["Nord", "Ouest", "Est", "Sud", "Lofoten"],
  Suède: ["Götaland", "Svealand", "Norrland", "Gotland"],
  Pologne: ["Basse-Silésie", "Mazovie", "Petite-Pologne", "Poméranie", "Varmie-Mazurie"],
  "République tchèque": ["Bohême", "Moravie", "Silésie"],
  Slovénie: ["Haute-Carniole", "Littoral", "Styrie slovène", "Alpes juliennes"],
  Croatie: ["Istrie", "Dalmatie", "Slavonie", "Kvarner"],
};

export const COUNTRIES = Object.keys(PLACES).sort((a, b) => a.localeCompare(b, "fr"));

export const OTHER = "Autre";

export function regionsFor(country) {
  return PLACES[country] ? [...PLACES[country]].sort((a, b) => a.localeCompare(b, "fr")) : [];
}

/** Niveaux de difficulté proposés, du plus simple au plus engagé. */
export const DIFFICULTIES = [
  "Très facile",
  "Facile",
  "Modérée",
  "Sportive",
  "Difficile",
  "Très difficile",
];
