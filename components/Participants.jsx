import { formatParticipants } from "@/lib/activities";

/**
 * Affiche « 2👩 / 3👧 (8, 11 et 13 ans) ».
 * Les âges ne concernent que les enfants : ceux des adultes ne sont jamais
 * demandés ni affichés.
 */
export default function Participants({ participants, className = "" }) {
  const text = formatParticipants(participants);
  if (!text) return null;

  return <span className={`people ${className}`.trim()}>{text}</span>;
}
