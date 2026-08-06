import { getActivity } from "@/lib/activities";

function Pill({ active, onClick, children }) {
  return (
    <button
      type="button"
      className={`filter-pill${active ? " is-active" : ""}`}
      aria-pressed={active}
      onClick={onClick}
    >
      {children}
    </button>
  );
}

/**
 * Deux filtres cumulatifs : type d'activité et pays.
 * Les options proposées sont uniquement celles réellement présentes dans les
 * sorties publiées, donc pas de "Ski" tant qu'aucune sortie n'est du ski.
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
  // Un filtre à une seule valeur possible ne sert à rien
  const showActivities = activities.length > 1;
  const showCountries = countries.length > 1;
  if (!showActivities && !showCountries) return null;

  const filtering = activity !== null || country !== null;

  return (
    <div className="filters">
      {showActivities && (
        <div className="filter-row">
          <span className="filter-label" id="filter-activity">Activité</span>
          <div className="filter-pills" role="group" aria-labelledby="filter-activity">
            <Pill active={activity === null} onClick={() => onActivityChange(null)}>
              Toutes
            </Pill>
            {activities.map((key) => {
              const meta = getActivity(key);
              return (
                <Pill
                  key={key}
                  active={activity === key}
                  onClick={() => onActivityChange(activity === key ? null : key)}
                >
                  <span aria-hidden="true">{meta.emoji}</span>
                  {meta.label}
                </Pill>
              );
            })}
          </div>
        </div>
      )}

      {showCountries && (
        <div className="filter-row">
          <span className="filter-label" id="filter-country">Pays</span>
          <div className="filter-pills" role="group" aria-labelledby="filter-country">
            <Pill active={country === null} onClick={() => onCountryChange(null)}>
              Tous
            </Pill>
            {countries.map((name) => (
              <Pill
                key={name}
                active={country === name}
                onClick={() => onCountryChange(country === name ? null : name)}
              >
                {name}
              </Pill>
            ))}
          </div>
        </div>
      )}

      {filtering && (
        <p className="filter-summary" aria-live="polite">
          {resultCount} sortie{resultCount > 1 ? "s" : ""} sur {totalCount}
          <button
            type="button"
            className="filter-reset"
            onClick={() => {
              onActivityChange(null);
              onCountryChange(null);
            }}
          >
            Tout afficher
          </button>
        </p>
      )}
    </div>
  );
}
