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
          content="Le slow travel en famille. Des idées de balades, de voyages et d'aventures pour explorer ensemble, à votre rythme."
        />
      </Head>

      {/* Bandeau d'accueil.
          La photo est posée en fond CSS et non dans une balise img : si
          public/banniere.jpg est absent, on retombe silencieusement sur le
          dégradé de repli au lieu d'afficher une image cassée. Le voile sombre
          par dessus garantit le contraste du texte blanc quelle que soit la
          zone de la photo qui se retrouve derrière. */}
      <header className="hero">
        <div className="hero-media" aria-hidden="true" />
        <div className="hero-veil" aria-hidden="true" />

        <div className="hero-tools">
          <ThemeToggle />
        </div>

        <div className="hero-inner">
          <h1 className="hero-title">Familles en vadrouille</h1>
          <p className="hero-tagline">Le slow travel en famille.</p>
          {/* Deux blocs plutôt qu'un <br /> : sur téléphone les lignes
              repassent en flux normal et se recollent avec une espace, ce
              qu'un saut de ligne masqué ne sait pas faire. */}
          <p className="hero-lede">
            <span>Des idées de balades, de voyages et d'aventures</span>{" "}
            <span>pour explorer ensemble, à votre rythme.</span>
          </p>
          <div className="hero-actions">
            <a href="#vadrouilles" className="hero-cta solid">
              Découvrir les vadrouilles
            </a>
            <Link href="/proposer" className="hero-cta ghost">
              Partager la nôtre
            </Link>
          </div>
        </div>
      </header>

      {/* La cible du bouton « Découvrir les vadrouilles ». L'ancre est posée
          sur la section entière, pas sur les filtres, pour qu'elle existe
          aussi quand aucune sortie n'est encore publiée. */}
      <div className="container" id="vadrouilles">
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
