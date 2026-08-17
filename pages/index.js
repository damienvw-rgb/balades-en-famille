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
        <title>Familles en vadrouille</title>
        <meta
          name="description"
          content="Des idées de balades, de voyages et d'aventures en famille, pour explorer ensemble, à votre rythme."
        />
      </Head>

      {/* En-tête d'accueil : du texte et rien d'autre. Le titre occupe la
          première ligne avec la bascule de thème à son extrémité droite, la
          phrase d'accroche vient dessous. */}
      <header className="home-header">
        <div className="container home-header-inner">
          <div className="home-header-top">
            <h1 className="home-title">Familles en vadrouille</h1>
            <ThemeToggle />
          </div>

          <p className="home-lede">
            Des idées de balades, de voyages et d'aventures pour explorer
            ensemble, à votre rythme.
          </p>
        </div>
      </header>

      <div className="container">
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

        {/* « Proposer une sortie » est la seule action du site : elle vit ici,
            en bouton, une fois les sorties parcourues — et pas noyée parmi les
            liens de service à sa gauche. */}
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
