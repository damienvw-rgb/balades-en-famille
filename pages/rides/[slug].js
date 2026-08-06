import Head from "next/head";
import Link from "next/link";
import dynamic from "next/dynamic";
import { getRideSlugs, getRideDetail } from "@/lib/rides";
import ElevationProfile from "@/components/ElevationProfile";

const RouteMap = dynamic(() => import("@/components/RouteMap"), { ssr: false });

export async function getStaticPaths() {
  const slugs = getRideSlugs();
  return {
    paths: slugs.map((slug) => ({ params: { slug } })),
    fallback: false,
  };
}

export async function getStaticProps({ params }) {
  const ride = getRideDetail(params.slug);
  return { props: { ride } };
}

export default function RidePage({ ride }) {
  const elevations = ride.points.map((p) => p.ele);

  return (
    <>
      <Head>
        <title>{ride.title} — Mes balades à vélo</title>
      </Head>

      <div className="container">
        <Link href="/" className="back-link">← Retour au carnet</Link>

        <div className="ride-detail-header">
          <span className="region">{ride.region}</span>
          <h1>{ride.title}</h1>
          <p className="description">{ride.description}</p>
        </div>

        <div className="stat-strip">
          <div>
            <span className="stat-label">Distance</span>
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
          <RouteMap points={ride.points} />
        </div>

        <div className="elevation-wrap">
          <h3>Profil d'altitude</h3>
          <ElevationProfile elevations={elevations} />
        </div>

        <a className="download-link" href={`/rides/${ride.slug}/route.gpx`} download>
          Télécharger le GPX
        </a>
      </div>
    </>
  );
}
