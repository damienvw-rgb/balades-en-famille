import { getActivity } from "@/lib/activities";

/**
 * Deux listes déroulantes sur une seule ligne, pour laisser la place au
 * contenu. Les options proposées sont uniquement celles réellement présentes
 * dans les sorties publiées.
 */
export default function Filters({
  activities,
  countries,
  activity,
  country,
  onActivityChange,
  onCountryChange,
  resultCount,
  totalCount,
}) {
  const showActivities = activities.length > 1;
  const showCountries = countries.length > 1;
  if (!showActivities && !showCountries) return null;

  const filtering = activity !== null || country !== null;

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
          }}
        >
          Réinitialiser
        </button>
      )}
    </div>
  );
}
