import { getActivity } from "@/lib/activities";

/**
 * Les listes déroulantes tiennent sur une seule ligne, pour laisser la place au
 * contenu. Les options proposées sont uniquement celles réellement présentes
 * dans les sorties publiées : un filtre qui ne renverrait rien n'est jamais
 * affiché.
 */
export default function Filters({
  activities,
  countries,
  difficulties,
  activity,
  country,
  difficulty,
  onActivityChange,
  onCountryChange,
  onDifficultyChange,
  resultCount,
  totalCount,
}) {
  const showActivities = activities.length > 1;
  const showCountries = countries.length > 1;
  const showDifficulties = difficulties.length > 1;
  if (!showActivities && !showCountries && !showDifficulties) return null;

  const filtering = activity !== null || country !== null || difficulty !== null;

  return (
    <div className="filters">
      {showActivities && (
        <label className="filter-select">
          <span className="sr-only">Filtrer par activité</span>
          <select
            value={activity || ""}
            onChange={(e) => onActivityChange(e.target.value || null)}
          >
            <option value="">Toutes les activités</option>
            {activities.map((key) => {
              const meta = getActivity(key);
              return (
                <option key={key} value={key}>
                  {meta.emoji} {meta.label}
                </option>
              );
            })}
          </select>
        </label>
      )}

      {showCountries && (
        <label className="filter-select">
          <span className="sr-only">Filtrer par pays</span>
          <select
            value={country || ""}
            onChange={(e) => onCountryChange(e.target.value || null)}
          >
            <option value="">Tous les pays</option>
            {countries.map((name) => (
              <option key={name} value={name}>{name}</option>
            ))}
          </select>
        </label>
      )}

      {showDifficulties && (
        <label className="filter-select">
          <span className="sr-only">Filtrer par difficulté</span>
          <select
            value={difficulty || ""}
            onChange={(e) => onDifficultyChange(e.target.value || null)}
          >
            <option value="">Toutes les difficultés</option>
            {difficulties.map((name) => (
              <option key={name} value={name}>{name}</option>
            ))}
          </select>
        </label>
      )}

      <span className="filter-count" aria-live="polite">
        {filtering ? `${resultCount} / ${totalCount}` : `${totalCount} sorties`}
      </span>

      {filtering && (
        <button
          type="button"
          className="filter-reset"
          onClick={() => {
            onActivityChange(null);
            onCountryChange(null);
            onDifficultyChange(null);
          }}
        >
          Réinitialiser
        </button>
      )}
    </div>
  );
}
