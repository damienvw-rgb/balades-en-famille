import { useState } from "react";
import Head from "next/head";
import Link from "next/link";
import dynamic from "next/dynamic";
import { getRideSlugs, getRideDetail } from "@/lib/rides";
import { getActivity, getLodging, formatPlace, gearEmoji, truncate } from "@/lib/activities";
import { SITE_NAME, siteUrl } from "@/lib/site";
import ElevationProfile from "@/components/ElevationProfile";
import Participants from "@/components/Participants";
import Comments from "@/components/Comments";
import ThemeToggle from "@/components/ThemeToggle";

const RouteMap = dynamic(() => import("@/components/RouteMap"), { ssr: false });

export async function getStaticPaths() {
  return {
    paths: getRideSlugs().map((slug) => ({ params: { slug } })),
    fallback: false,
  };
}

export async function getStaticProps({ params }) {
  const ride = getRideDetail(params.slug);
  const activity = getActivity(ride.activity);
  const place = formatPlace(ride.country, ride.region);

  // Résumé destiné aux moteurs de recherche et aux aperçus de partage. Sans
  // description saisie, on compose une phrase à partir des chiffres de la
  // sortie : mieux vaut ça qu'un aperçu vide quand le lien circule.
  const summary = ride.description
    ? truncate(ride.description, 160).text
    : [
        `${activity.label} de ${ride.distanceKm} km`,
        place ? `en ${place}` : null,
        `avec ${ride.elevationGain} m de dénivelé positif`,
        ride.stageCount > 1 ? `, en ${ride.stageCount} étapes` : "",
      ]
        .filter(Boolean)
        .join(" ")
        .replace(" ,", ",") + ".";

  return {
    props: {
      ride,
      meta: {
        summary,
        url: `${siteUrl()}/rides/${ride.slug}`,
      },
    },
  };
}

function Lodging({ lodging }) {
  if (!lodging) return null;
  const meta = getLodging(lodging.type);
  // Sans type déclaré, getLodging renvoie le libellé générique « Logement » :
  // inutile de l'écrire deux fois, l'intitulé du bloc le dit déjà.
  const showType = Boolean(lodging.type);

  return (
    <div className="lodging">
      <span className="lodging-label">Où on a dormi</span>
      <p className="lodging-body">
        <span className="lodging-emoji" aria-hidden="true">{meta.emoji}</span>
        {showType && <span className="lodging-type">{meta.label}</span>}
        {lodging.text && <span className="lodging-text">{lodging.text}</span>}
      </p>
    </div>
  );
}

/** Une étape repliée par défaut : le titre sert de bouton d'ouverture. */
function Stage({ stage, index, defaultOpen }) {
  const [open, setOpen] = useState(defaultOpen);
  const panelId = `etape-${index}`;

  return (
    <section className={`stage${open ? " is-open" : ""}`}>
      <button
        type="button"
        className="stage-toggle"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((v) => !v)}
      >
        <span className="stage-dot" style={{ background: stage.color }} aria-hidden="true" />
        <span className="stage-toggle-title">{stage.title || `Étape ${index + 1}`}</span>
        <span className="stage-figures">
          {stage.distanceKm} km · +{stage.elevationGain} m
        </span>
        <span className="stage-chevron" aria-hidden="true">{open ? "−" : "+"}</span>
      </button>

      {open && (
        <div className="stage-panel" id={panelId}>
          {stage.description && <p className="stage-description">{stage.description}</p>}
          <Lodging lodging={stage.lodging} />

          <div className="elevation-wrap">
            <h4>Profil d'altitude</h4>
            <ElevationProfile
              elevations={stage.points.map((p) => p.ele)}
              color={stage.color}
            />
          </div>

          <a className="button-secondary" href={stage.gpxUrl} download>
            GPX de cette étape
          </a>
        </div>
      )}
    </section>
  );
}

export default function RidePage({ ride, meta }) {
  const activity = getActivity(ride.activity);
  const place = formatPlace(ride.country, ride.region);
  const multi = ride.stageCount > 1;
  const pageTitle = `${ride.title} · ${SITE_NAME}`;

  return (
    <>
      <Head>
        <title>{pageTitle}</title>
        <meta name="description" content={meta.summary} />
        <link rel="canonical" href={meta.url} />

        {/* Aperçu affiché quand le lien est partagé dans une conversation ou
            sur un réseau. Sans ces balises, il n'apparaissait rien du tout. */}
        <meta property="og:type" content="article" />
        <meta property="og:site_name" content={SITE_NAME} />
        <meta property="og:locale" content="fr_BE" />
        <meta property="og:title" content={ride.title} />
        <meta property="og:description" content={meta.summary} />
        <meta property="og:url" content={meta.url} />
        <meta name="twitter:card" content="summary" />
        <meta name="twitter:title" content={ride.title} />
        <meta name="twitter:description" content={meta.summary} />
      </Head>

      <div className="container">
        <div className="page-top">
          <Link href="/" className="back-link">← Retour au carnet</Link>
          <ThemeToggle />
        </div>

        <div className="ride-detail-header">
          <div className="card-top">
            <span className="activity-badge">
              <span aria-hidden="true">{activity.emoji}</span>
              {activity.label}
            </span>
            {multi && <span className="stage-badge">{ride.stageCount} étapes</span>}
            <Participants participants={ride.participants} seed={ride.slug} />
          </div>

          {place && <span className="region">{place}</span>}
          <h1>{ride.title}</h1>
          {ride.description && <p className="description">{ride.description}</p>}
          {ride.author && <p className="ride-author">Proposée par {ride.author}</p>}
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
          <RouteMap stages={ride.stages} activity={ride.activity} />
        </div>

        <div className="download-row">
          <a className="button-primary" href={ride.fullGpxUrl} download>
            {multi ? "Télécharger le parcours complet" : "Télécharger le GPX"}
          </a>
          {multi && (
            <span className="download-note">
              Toutes les étapes en un fichier, chacune restant une trace distincte.
            </span>
          )}
        </div>

        {ride.gear && ride.gear.length > 0 && (
          <div className="gear">
            <h3 className="gear-title">Matériel</h3>
            <ul className="gear-chips">
              {ride.gear.map((item, i) => (
                <li key={i} className="gear-chip">
                  <span aria-hidden="true">{item.emoji || gearEmoji(item.label)}</span>
                  {item.label}
                </li>
              ))}
            </ul>
          </div>
        )}

        {multi && <h2 className="section-title">Les étapes</h2>}

        <div className="stage-list">
          {ride.stages.map((stage, i) => (
            <Stage key={stage.file} stage={stage} index={i} defaultOpen={!multi} />
          ))}
        </div>

        <Comments ride={ride.slug} stages={ride.stages} />

        <footer className="site-footer">
          <span>
            <Link href="/mentions-legales">Mentions légales</Link>
            {" · "}
            <Link href="/contact">Contact</Link>
          </span>
        </footer>
      </div>
    </>
  );
}
