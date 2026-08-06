import Link from "next/link";
import { getActivity, formatPlace } from "@/lib/activities";
import Participants from "@/components/Participants";

export default function RideCard({ ride }) {
  const activity = getActivity(ride.activity);
  const place = formatPlace(ride.country, ride.region);

  return (
    <Link href={`/rides/${ride.slug}`} className="ride-card">
      <div className="card-top">
        <span className="activity-badge">
          <span aria-hidden="true">{activity.emoji}</span>
          {activity.label}
        </span>
        {ride.stageCount > 1 && (
          <span className="stage-badge">{ride.stageCount} étapes</span>
        )}
        <Participants participants={ride.participants} className="on-light" />
      </div>

      {place && <span className="region">{place}</span>}
      <h2>{ride.title}</h2>
      {ride.description && <p className="desc">{ride.description}</p>}

      <div className="stat-row">
        <div>
          <span className="stat-label">Distance</span>
          <span className="stat-value">{ride.distanceKm} km</span>
        </div>
        <div>
          <span className="stat-label">Dénivelé +</span>
          <span className="stat-value">{ride.elevationGain} m</span>
        </div>
      </div>
    </Link>
  );
}
