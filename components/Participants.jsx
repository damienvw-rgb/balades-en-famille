import { PARTICIPANT_EMOJI, formatAges } from "@/lib/activities";

// Au-delà de ce nombre, on remplace la file d'emojis par "🧒 ×7"
const MAX_EMOJI = 6;

function Group({ kind, group }) {
  if (!group) return null;

  const emoji = PARTICIPANT_EMOJI[kind];
  const noun = kind === "adults" ? "adulte" : "enfant";
  const plural = group.count > 1 ? "s" : "";
  const agesText = formatAges(group.ages);

  // Libellé complet au survol : "2 enfants · 8 et 11 ans"
  const title = agesText
    ? `${group.count} ${noun}${plural} · ${agesText}`
    : `${group.count} ${noun}${plural}`;

  const compact = group.count > MAX_EMOJI;

  return (
    <span className="people-group" title={title}>
      {compact ? (
        <>
          <span aria-hidden="true">{emoji}</span>
          <span className="people-count">×{group.count}</span>
        </>
      ) : (
        Array.from({ length: group.count }).map((_, i) => (
          <span
            key={i}
            aria-hidden="true"
            // Âge individuel au survol quand il est connu
            title={group.ages[i] !== undefined ? `${group.ages[i]} ans` : undefined}
          >
            {emoji}
          </span>
        ))
      )}
      <span className="sr-only">{title}</span>
    </span>
  );
}

export default function Participants({ participants, className = "" }) {
  if (!participants) return null;
  const { adults, children } = participants;
  if (!adults && !children) return null;

  return (
    <div className={`people ${className}`.trim()}>
      <Group kind="adults" group={adults} />
      <Group kind="children" group={children} />
    </div>
  );
}
