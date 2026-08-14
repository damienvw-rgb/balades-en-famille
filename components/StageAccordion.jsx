import { useState } from "react";
import { getLodging, stageLabel } from "@/lib/activities";
import ElevationProfile from "@/components/ElevationProfile";

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

/**
 * Les étapes sont repliées par défaut : la page reste lisible d'un coup d'œil,
 * et le détail s'ouvre au clic sur le titre de l'étape.
 */
export default function StageAccordion({ stages, onHover }) {
  const [open, setOpen] = useState(() => new Set());

  const toggle = (file) =>
    setOpen((current) => {
      const next = new Set(current);
      next.has(file) ? next.delete(file) : next.add(file);
      return next;
    });

  const allOpen = open.size === stages.length;

  return (
    <div className="stage-accordion">
      <div className="accordion-tools">
        <button
          type="button"
          className="link-button"
          onClick={() => setOpen(allOpen ? new Set() : new Set(stages.map((s) => s.file)))}
        >
          {allOpen ? "Tout replier" : "Tout déplier"}
        </button>
      </div>

      {stages.map((stage, i) => {
        const isOpen = open.has(stage.file);
        const panelId = `etape-${i + 1}`;

        return (
          <section className="stage-item" key={stage.file}>
            <h3 className="stage-trigger-wrap">
              <button
                type="button"
                className={`stage-trigger${isOpen ? " is-open" : ""}`}
                aria-expanded={isOpen}
                aria-controls={panelId}
                onClick={() => toggle(stage.file)}
                onMouseEnter={() => onHover?.(stage.file)}
                onMouseLeave={() => onHover?.(null)}
                onFocus={() => onHover?.(stage.file)}
                onBlur={() => onHover?.(null)}
              >
                <span className="stage-dot" style={{ background: stage.color }} aria-hidden="true" />
                <span className="stage-trigger-title">{stageLabel(stage.title, i, stages.length)}</span>
                <span className="stage-trigger-figures">
                  {stage.distanceKm} km · +{stage.elevationGain} m
                </span>
                <span className="stage-chevron" aria-hidden="true">{isOpen ? "▾" : "▸"}</span>
              </button>
            </h3>

            {isOpen && (
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

                <a className="download-link" href={stage.gpxUrl} download>
                  Télécharger cette étape
                </a>
              </div>
            )}
          </section>
        );
      })}
    </div>
  );
}
