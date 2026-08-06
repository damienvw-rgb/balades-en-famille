import Head from "next/head";
import Link from "next/link";
import { getRideSummaries } from "@/lib/rides";
import ContourDivider from "@/components/ContourDivider";

export async function getStaticProps() {
  const rides = getRideSummaries();
  return { props: { rides } };
}

export default function Home({ rides }) {
  return (
    <>
      <Head>
        <title>Mes balades à vélo</title>
        <meta
          name="description"
          content="Un carnet de route des balades à vélo parcourues, avec cartes et profils d'altitude."
        />
      </Head>

      <div className="container">
        <header className="site-header">
          <h1>Mes balades à vélo</h1>
          <p>
            Un carnet de route : les itinéraires parcourus en famille, avec la carte,
            le profil d'altitude et le fichier GPX à télécharger pour chacun.
          </p>
          <ContourDivider />
        </header>

        {rides.length === 0 ? (
          <p className="empty-state">
            Aucune balade pour le moment. Ajoute un dossier dans /public/rides/
            avec un route.gpx et un info.json pour voir apparaître ta première balade ici.
          </p>
        ) : (
          <div className="ride-grid">
            {rides.map((ride) => (
              <Link key={ride.slug} href={`/rides/${ride.slug}`} className="ride-card">
                <span className="region">{ride.region}</span>
                <h2>{ride.title}</h2>
                <p className="desc">{ride.description}</p>
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
            ))}
          </div>
        )}
      </div>
    </>
  );
}
