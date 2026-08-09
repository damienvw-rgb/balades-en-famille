import { useState, useMemo } from "react";
import Head from "next/head";
import Link from "next/link";
import { getRideSummaries } from "@/lib/rides";
import { sortDifficulties } from "@/lib/activities";
import Filters from "@/components/Filters";
import RideCard from "@/components/RideCard";
import ThemeToggle from "@/components/ThemeToggle";

export async function getStaticProps() {
  const rides = getRideSummaries();
  const activities = [...new Set(rides.map((r) => r.activity).filter(Boolean))].sort();
  const countries = [...new Set(rides.map((r) => r.country).filter(Boolean))].sort((a, b) =>
    a.localeCompare(b, "fr")
  );
  // Les difficultés gardent l'ordre du formulaire, du plus simple au plus
  // engagé : classées par ordre alphabétique, la liste n'aurait aucun sens.
  const difficulties = sortDifficulties(
    new Set(rides.map((r) => r.difficulty).filter(Boolean))
  );
  return { props: { rides, activities, countries, difficulties } };
}

export default function Home({ rides, activities, countries, difficulties }) {
  const [activity, setActivity] = useState(null);
  const [country, setCountry] = useState(null);
  const [difficulty, setDifficulty] = useState(null);

  const visible = useMemo(
    () =>
      rides.filter(
        (r) =>
          (activity === null || r.activity === activity) &&
          (country === null || r.country === country) &&
          (difficulty === null || r.difficulty === difficulty)
      ),
    [rides, activity, country, difficulty]
  );

  return (
    <>
      <Head>
        <title>Partage de balades familiales</title>
        <meta
          name="description"
          content="Un carnet de route de balades parcourues à vélo, à pied ou par tout autre moyen, pour donner des idées à d'autres familles."
        />
      </Head>

      <div className="container">
        {/* En-tête compact : le contenu doit venir vite.
            Le bouton « Proposer une sortie » vit dans le pied de page, il
            n'est pas repris ici : sur téléphone il poussait le titre vers le
            bas et laissait une bande vide en haut de l'écran. */}
        <header className="site-header compact">
          <div className="header-main">
            <h1>Partage de balades familiales</h1>
            <p>
              Un carnet de route de vos balades parcourues à vélo, à pied ou par
              tout autre moyen afin de donner des idées à d'autres familles.
            </p>
          </div>
          <div className="header-actions">
            <ThemeToggle />
          </div>
        </header>

        {rides.length === 0 ? (
          <p className="empty-state">
            Aucune sortie pour le moment. Ajoute un dossier dans /public/rides/
            avec au moins un fichier .gpx et un info.json.
          </p>
        ) : (
          <>
            <Filters
              activities={activities}
              countries={countries}
              difficulties={difficulties}
              activity={activity}
              country={country}
              difficulty={difficulty}
              onActivityChange={setActivity}
              onCountryChange={setCountry}
              onDifficultyChange={setDifficulty}
              resultCount={visible.length}
              totalCount={rides.length}
            />

            {visible.length === 0 ? (
              <p className="empty-state">
                Aucune sortie ne correspond à cette combinaison. Essaie de
                retirer un filtre.
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
          <span>
            <Link href="/mentions-legales">Mentions légales</Link>
            {" · "}
            <Link href="/contact">Contact</Link>
          </span>
          <Link href="/proposer" className="button-primary small">
            Proposer une sortie
          </Link>
        </footer>
      </div>
    </>
  );
}
