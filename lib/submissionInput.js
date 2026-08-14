/**
 * Lecture et validation des champs d'une sortie envoyée par un visiteur.
 *
 * Le dépôt d'une nouvelle sortie et la modification d'une sortie existante
 * acceptent exactement les mêmes champs : tout est ici, pour qu'une règle
 * ajoutée d'un côté s'applique automatiquement de l'autre.
 */
import { ACTIVITIES, DIFFICULTIES } from "./activities";
import { gearEmoji, isKnownGearEmoji } from "./gear";
import { parseGpx } from "./gpx";

export const MAX_STAGES = 30;

/** Place laissée aux textes libres, partagée avec les formulaires. */
export const MAX_DESCRIPTION = 6000;
export const MAX_STAGE_DESCRIPTION = 4000;

/** { adults: 2, children: [8, 11], childrenCount: 3 } vers la forme du site. */
export function normalizeParticipants(raw) {
  if (!raw) return null;
  const adults = Math.max(0, Math.min(12, parseInt(raw.adults, 10) || 0));

  const ages = Array.isArray(raw.children)
    ? raw.children
        .map((a) => parseInt(a, 10))
        .filter((n) => Number.isFinite(n) && n >= 0 && n <= 25)
    : [];
  const declared = Math.max(0, Math.min(12, parseInt(raw.childrenCount, 10) || 0));
  const childrenCount = Math.max(declared, ages.length);

  if (adults === 0 && childrenCount === 0) return null;

  const out = {};
  if (adults > 0) out.adults = adults;
  // Les âges ne sont conservés que s'ils sont tous renseignés, sinon on ne
  // garde que le nombre : mieux vaut pas d'âge du tout qu'une liste incomplète.
  if (childrenCount > 0) {
    out.children = ages.length === childrenCount ? ages : childrenCount;
  }
  return out;
}

/**
 * Chaque ligne saisie reçoit son pictogramme.
 * Il est déduit de l'intitulé, sauf si le visiteur en a choisi un dans la
 * palette du formulaire. Le choix n'est retenu que s'il fait partie de cette
 * palette : rien d'arbitraire ne peut ainsi finir dans un fichier de public/.
 */
export function normalizeGear(raw) {
  if (!Array.isArray(raw)) return null;
  const items = raw
    .map((item) => {
      const source = typeof item === "string" ? { label: item } : item || {};
      const label = String(source.label || "").trim().slice(0, 60);
      if (!label) return null;
      const chosen = String(source.emoji || "").trim();
      return { emoji: isKnownGearEmoji(chosen) ? chosen : gearEmoji(label), label };
    })
    .filter(Boolean)
    .slice(0, 20);
  return items.length > 0 ? items : null;
}

/**
 * Champs descriptifs de la sortie.
 * Renvoie { info } ou { error }, jamais les deux.
 */
export function readInfo(body) {
  const title = String(body.title || "").trim();
  if (title.length < 3) return { error: "Donne un titre à ta sortie." };

  const activity = String(body.activity || "").trim().toLowerCase();
  if (!activity || !ACTIVITIES[activity]) return { error: "Choisis un type d'activité." };

  const country = String(body.country || "").trim();
  if (country.length < 2) return { error: "Le pays est obligatoire." };

  const difficulty = String(body.difficulty || "").trim();

  return {
    info: {
      title: title.slice(0, 120),
      activity,
      date: String(body.date || "").trim() || null,
      country,
      region: String(body.region || "").trim() || null,
      difficulty: DIFFICULTIES.includes(difficulty) ? difficulty : null,
      description: String(body.description || "").trim().slice(0, MAX_DESCRIPTION),
      participants: normalizeParticipants(body.participants),
      gear: normalizeGear(body.gear),
    },
  };
}

/**
 * Étapes et traces GPX.
 *
 * `previous` porte les étapes déjà enregistrées, lors d'une modification : une
 * étape dont le fichier n'a pas été remplacé reprend sa trace d'origine, qu'elle
 * désigne par son indice dans `source`. La trace n'est alors pas relue, ses
 * mesures sont déjà connues.
 *
 * Renvoie { stages } ou { error }.
 */
export function readStages(raw, previous = null) {
  const list = Array.isArray(raw) ? raw.slice(0, MAX_STAGES) : [];
  if (list.length === 0) return { error: "Ajoute au moins un fichier GPX." };

  const stages = [];

  for (const [i, stage] of list.entries()) {
    const gpx = String(stage.gpx || "");
    let trace = null;

    if (gpx) {
      if (!gpx.includes("<trkpt") && !gpx.includes("<rtept")) {
        return { error: `Le fichier de l'étape ${i + 1} ne contient aucun point de trace.` };
      }
      let parsed;
      try {
        parsed = parseGpx(gpx);
      } catch {
        return { error: `Fichier GPX illisible à l'étape ${i + 1}.` };
      }
      if (parsed.points.length < 2) {
        return { error: `Trace trop courte à l'étape ${i + 1}.` };
      }
      trace = {
        gpx,
        distanceKm: parsed.distanceKm,
        elevationGain: parsed.elevationGain,
      };
    } else if (previous) {
      const index = parseInt(stage.source, 10);
      const kept = Number.isInteger(index) ? previous[index] : null;
      if (!kept) return { error: `L'étape ${i + 1} attend un fichier GPX.` };
      trace = {
        gpx: kept.gpx,
        distanceKm: kept.distanceKm,
        elevationGain: kept.elevationGain,
      };
    }

    if (!trace) return { error: `L'étape ${i + 1} attend un fichier GPX.` };

    const declaredTitle = String(stage.title || "").trim().slice(0, 120);

    stages.push({
      // Les fichiers sont renumérotés à chaque envoi : l'ordre des étapes reste
      // celui du formulaire, même après un ajout ou une suppression au milieu.
      file: `etape-${i + 1}.gpx`,
      title: declaredTitle || (list.length > 1 ? `Étape ${i + 1}` : ""),
      description: String(stage.description || "").trim().slice(0, MAX_STAGE_DESCRIPTION),
      lodging:
        stage.lodgingType || stage.lodgingText
          ? {
              type: String(stage.lodgingType || "").trim() || null,
              text: String(stage.lodgingText || "").trim().slice(0, 500) || null,
            }
          : null,
      ...trace,
    });
  }

  return { stages };
}

/** Distance totale arrondie au dixième, pour les emails et les récapitulatifs. */
export function totalKm(stages) {
  return Math.round(stages.reduce((sum, s) => sum + (s.distanceKm || 0), 0) * 10) / 10;
}
