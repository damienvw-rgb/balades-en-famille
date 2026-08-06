import Head from "next/head";
import Link from "next/link";
import dynamic from "next/dynamic";
import { getRideSlugs, getRideDetail } from "@/lib/rides";
import { getActivity, getLodging, formatPlace } from "@/lib/activities";
import ElevationProfile from "@/components/ElevationProfile";
import Participants from "@/components/Participants";
import GearList from "@/components/GearList";
import Comments from "@/components/Comments";

const RouteMap = dynamic(() => import("@/components/RouteMap"), { ssr: false });

export async function getStaticPaths() {
  return {
    paths: getRideSlugs().map((slug) => ({ params: { slug } })),
    fallback: false,
  };
}

export async function getStaticProps({ params }) {
  return { props: { ride: getRideDetail(params.slug) } };
}

function Lodging({ lodging }) {
  if (!lodging) return null;
  const meta = getLodging(lodging.type);

  return (
    <p className="lodging">
      <span aria-hidden="true">{meta.emoji}</span>
      <span className="lodging-type">{meta.label}</span>
      {lodging.text && <span className="lodging-text">{lodging.text}</span>}
    </p>
  );
}

export default function RidePage({ ride }) {
  const activity = getActivity(ride.activity);
  const place = formatPlace(ride.country, ride.region);
  const multi = ride.stageCount > 1;

  return (
    <>
      <Head>
        <title>{ride.title} · Nos balades en famille</title>
      </Head>

      <div className="container">
        <Link href="/" className="back-link">← Retour au carnet</Link>

        <div className="ride-detail-header">
          <div className="card-top">
            <span className="activity-badge">
              <span aria-hidden="true">{activity.emoji}</span>
              {activity.label}
            </span>
            {multi && <span className="stage-badge">{ride.stageCount} étapes</span>}
            <Participants participants={ride.participants} />
          </div>

          {place && <span className="region">{place}</span>}
          <h1>{ride.title}</h1>
          {ride.description && <p className="description">{ride.description}</p>}
          {ride.author && (
            <p className="ride-author">Proposée par {ride.author}</p>
          )}
        </div>

        <div className="stat-strip">
          <div>
            <span className="stat-label">{multi ? "Distance totale" : "Distance"}</span>
            <span className="stat-value">{ride.distanceKm} km</span>
          </div>
          <div>
            <span className="stat-label">Dénivelé +</span>
            <span className="stat-value">{ride.elevationGain} m</span>
          </div>
          <div>
            <span className="stat-label">Dénivelé -</span>
            <span className="stat-value">{ride.elevationLoss} m</span>
          </div>
          {ride.date && (
            <div>
              <span className="stat-label">Date</span>
              <span className="stat-value">{ride.date}</span>
            </div>
          )}
          {ride.difficulty && (
            <div>
              <span className="stat-label">Difficulté</span>
              <span className="stat-value">{ride.difficulty}</span>
            </div>
          )}
        </div>

        <div className="map-wrap">
          <RouteMap stages={ride.stages} />
        </div>

        <GearList gear={ride.gear} />

        {multi && <h2 className="section-title">Les étapes</h2>}

        <div className="stage-list">
          {ride.stages.map((stage) => (
            <section className="stage" key={stage.file}>
              {multi && (
                <div className="stage-head">
                  <span
                    className="stage-dot"
                    style={{ background: stage.color }}
                    aria-hidden="true"
                  />
                  <h3>{stage.title}</h3>
                  <span className="stage-figures">
                    {stage.distanceKm} km · +{stage.elevationGain} m
                  </span>
                </div>
              )}

              {stage.description && (
                <p className="stage-description">{stage.description}</p>
              )}

              <Lodging lodging={stage.lodging} />

              <div className="elevation-wrap">
                <h4>Profil d'altitude</h4>
                <ElevationProfile
                  elevations={stage.points.map((p) => p.ele)}
                  color={stage.color}
                />
              </div>

              <a className="download-link" href={stage.gpxUrl} download>
                Télécharger le GPX{multi ? ` · ${stage.title}` : ""}
              </a>
            </section>
          ))}
        </div>

        <Comments ride={ride.slug} stages={ride.stages} />
      </div>
    </>
  );
}
