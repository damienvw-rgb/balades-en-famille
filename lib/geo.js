/**
 * Pays et régions proposés dans le formulaire.
 * Chaque pays liste ses subdivisions usuelles ; le choix « Autre » ouvre un
 * champ libre, pour ne bloquer personne.
 */
export const OTHER = "__autre__";

export const COUNTRIES = {
  Belgique: [
    "Anvers", "Brabant flamand", "Brabant wallon", "Bruxelles", "Flandre occidentale",
    "Flandre orientale", "Hainaut", "Liège", "Limbourg", "Luxembourg", "Namur",
    "Ardennes", "Côte belge",
  ],
  France: [
    "Auvergne-Rhône-Alpes", "Bourgogne-Franche-Comté", "Bretagne", "Centre-Val de Loire",
    "Corse", "Grand Est", "Hauts-de-France", "Île-de-France", "Normandie",
    "Nouvelle-Aquitaine", "Occitanie", "Pays de la Loire", "Provence-Alpes-Côte d'Azur",
  ],
  Allemagne: [
    "Bade-Wurtemberg", "Bavière", "Berlin", "Brandebourg", "Brême", "Eifel", "Hambourg",
    "Hesse", "Basse-Saxe", "Mecklembourg-Poméranie", "Rhénanie-du-Nord-Westphalie",
    "Rhénanie-Palatinat", "Sarre", "Saxe", "Saxe-Anhalt", "Schleswig-Holstein",
    "Forêt-Noire", "Thuringe",
  ],
  "Pays-Bas": [
    "Drenthe", "Flevoland", "Frise", "Gueldre", "Groningue", "Limbourg", "Brabant-Septentrional",
    "Hollande-Septentrionale", "Overijssel", "Utrecht", "Zélande", "Hollande-Méridionale",
  ],
  Luxembourg: ["Ardennes luxembourgeoises", "Gutland", "Moselle", "Minett"],
  Suisse: [
    "Appenzell", "Argovie", "Berne", "Grisons", "Jura", "Tessin", "Valais", "Vaud",
    "Zurich", "Oberland bernois", "Engadine",
  ],
  Italie: [
    "Abruzzes", "Calabre", "Campanie", "Émilie-Romagne", "Frioul-Vénétie Julienne", "Latium",
    "Ligurie", "Lombardie", "Marches", "Piémont", "Pouilles", "Sardaigne", "Sicile",
    "Toscane", "Trentin-Haut-Adige", "Ombrie", "Vénétie", "Dolomites",
  ],
  Espagne: [
    "Andalousie", "Aragon", "Asturies", "Baléares", "Canaries", "Cantabrie", "Castille-et-León",
    "Castille-La Manche", "Catalogne", "Estrémadure", "Galice", "Madrid", "Murcie",
    "Navarre", "Pays basque", "La Rioja", "Valence",
  ],
  Autriche: [
    "Burgenland", "Carinthie", "Basse-Autriche", "Haute-Autriche", "Salzbourg",
    "Styrie", "Tyrol", "Vorarlberg", "Vienne",
  ],
  Portugal: ["Algarve", "Alentejo", "Centre", "Lisbonne", "Nord", "Açores", "Madère"],
  "Royaume-Uni": ["Angleterre", "Écosse", "Pays de Galles", "Irlande du Nord"],
  Irlande: ["Connacht", "Leinster", "Munster", "Ulster"],
  Danemark: ["Jutland", "Fionie", "Seeland", "Bornholm"],
  Suède: ["Götaland", "Svealand", "Norrland"],
  Norvège: ["Est", "Ouest (fjords)", "Sud", "Trøndelag", "Nord"],
  Slovénie: ["Alpes juliennes", "Littoral", "Carniole", "Styrie slovène"],
  Croatie: ["Istrie", "Dalmatie", "Kvarner", "Slavonie", "Zagreb"],
  Pologne: ["Basse-Silésie", "Mazurie", "Petite-Pologne", "Poméranie", "Tatras"],
  "Tchéquie": ["Bohême", "Moravie", "Silésie"],
};

export const COUNTRY_NAMES = Object.keys(COUNTRIES).sort((a, b) =>
  a.localeCompare(b, "fr")
);

export function regionsFor(country) {
  return COUNTRIES[country] || [];
}
