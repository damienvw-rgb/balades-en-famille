import { useState, useMemo } from "react";
import Head from "next/head";
import { getRideSummaries } from "@/lib/rides";
import ContourDivider from "@/components/ContourDivider";
import Filters from "@/components/Filters";
import RideCard from "@/components/RideCard";
import Link from "next/link";

export async function getStaticProps() {
  const rides = getRideSummaries();

  // Les options de filtre sont dérivées des sorties publiées : une activité ou
  // un pays qui n'existe nulle part n'est jamais proposé.
  const activities = [...new Set(rides.map((r) => r.activity).filter(Boolean))].sort();
  const countries = [...new Set(rides.map((r) => r.country).filter(Boolean))].sort(
    (a, b) => a.localeCompare(b, "fr")
  );

  return { props: { rides, activities, countries } };
}

export default function Home({ rides, activities, countries }) {
  const [activity, setActivity] = useState(null);
  const [country, setCountry] = useState(null);

  // Les deux filtres se cumulent
  const visible = useMemo(
    () =>
      rides.filter(
        (r) =>
          (activity === null || r.activity === activity) &&
          (country === null || r.country === country)
      ),
    [rides, activity, country]
  );

  return (
    <>
      <Head>
        <title>Nos balades en famille</title>
        <meta
          name="description"
          content="Un carnet de route des sorties à vélo et randonnées parcourues en famille, avec cartes et profils d'altitude."
        />
      </Head>

      <div className="container">
        <header className="site-header">
          <h1>Nos balades en famille</h1>
          <p>
            Un carnet de route : les itinéraires parcourus à vélo et à pied, avec
            la carte, le profil d'altitude et les traces GPX à télécharger.
          </p>
          <ContourDivider />
        </header>

        {rides.length === 0 ? (
          <p className="empty-state">
            Aucune sortie pour le moment. Ajoute un dossier dans /public/rides/
            avec au moins un fichier .gpx et un info.json pour voir apparaître ta
            première sortie ici.
          </p>
        ) : (
          <>
            <Filters
              activities={activities}
              countries={countries}
              activity={activity}
              country={country}
              onActivityChange={setActivity}
              onCountryChange={setCountry}
              resultCount={visible.length}
              totalCount={rides.length}
            />

            {visible.length === 0 ? (
              <p className="empty-state">
                Aucune sortie ne correspond à cette combinaison de filtres.
                Essaie d'en retirer un.
              </p>
            ) : (
              <div className="ride-grid">
                {visible.map((ride) => (
                  <RideCard key={ride.slug} ride={ride} />
                ))}
              </div>
            )}
          </>
        )}
        <footer className="site-footer">
          <Link href="/mentions-legales">Mentions légales</Link>
          <span className="footer-cta">
            Un itinéraire à partager ?{" "}
            <Link href="/proposer" className="button-secondary">
              Proposer une sortie
            </Link>
          </span>
        </footer>
      </div>
    </>
  );
}
