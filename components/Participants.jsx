import { Fragment } from "react";
import { participantGroups } from "@/lib/activities";

/**
 * Affiche « 2👩 / 3👧 (8, 11 et 13 ans) ».
 *
 * Le pictogramme masculin ou féminin est tiré au hasard à partir du seed (le
 * slug de la sortie), pas fixé une fois pour toutes. Au survol, une infobulle
 * donne le décompte en toutes lettres, accordé au singulier ou au pluriel.
 *
 * Les âges ne concernent que les enfants : ceux des adultes ne sont jamais
 * demandés ni affichés.
 */
export default function Participants({ participants, seed = "", className = "" }) {
  const groups = participantGroups(participants, seed);
  if (!groups) return null;

  return (
    <span className={`people ${className}`.trim()}>
      {groups.map((group, i) => (
        <Fragment key={group.group}>
          {i > 0 && <span aria-hidden="true"> / </span>}
          <span className="people-group" title={group.label}>
            {group.count}
            <span className="people-emoji" role="img" aria-label={group.label}>
              {group.emoji}
            </span>
          </span>
          {group.ages && <span className="people-ages"> ({group.ages})</span>}
        </Fragment>
      ))}
    </span>
  );
}
