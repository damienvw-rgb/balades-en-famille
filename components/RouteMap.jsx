import { Fragment, useState } from "react";
import { MapContainer, TileLayer, Polyline, CircleMarker, Tooltip } from "react-leaflet";
import { mapLayerFor, stageLabel } from "@/lib/activities";

/**
 * Fonds de carte disponibles, tous libres et sans clé d'API.
 *
 * CyclOSM a été retiré : son intérêt, la mise en avant des itinéraires
 * cyclables, se retournait contre nous. Sur les zones denses il couvrait la
 * carte de lignes magenta et violettes qui rivalisaient avec la trace.
 */
const LAYERS = {
  topo: {
    label: "Relief",
    url: "https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png",
    attribution:
      'Fond <a href="https://opentopomap.org">OpenTopoMap</a> (CC-BY-SA), données &copy; OpenStreetMap',
    maxZoom: 17,
  },
  plan: {
    label: "Plan",
    url: "https://tile.openstreetmap.org/{z}/{x}/{y}.png",
    attribution: 'Fond et données &copy; OpenStreetMap',
    maxZoom: 19,
  },
};

/**
 * Épaisseur et liseré du tracé.
 *
 * Les fonds OpenStreetMap sont chargés : itinéraires cyclables en magenta,
 * routes en orange, bois en vert. Un simple trait de couleur s'y perdait, la
 * trace se confondant avec une route de teinte voisine. Chaque trace est donc
 * doublée d'un liseré plus large dessous, comme le font Komoot ou Strava.
 *
 * Le liseré est sombre et non blanc : tous les fonds proposés ici sont clairs,
 * un contour blanc n'y détacherait rien. Il reste légèrement transparent, pour
 * ne pas masquer la route suivie, et la trace se lit alors comme un objet posé
 * sur la carte quelle que soit sa couleur, y compris le jaune et le vert clair.
 *
 * Une première version plus discrète (5 px, liseré à 0.45) ne suffisait pas sur
 * les zones denses du Limbourg, où le fond aligne routes orange, itinéraires
 * cyclables magenta et limites administratives violettes.
 */
const TRACE_WEIGHT = 6;
const CASING_WEIGHT = TRACE_WEIGHT + 5;
const CASING_COLOR = "#0d1b24";
const CASING_OPACITY = 0.75;

export default function RouteMap({ stages, activity = null, visibleStages = null }) {
  // Le fond de départ dépend de l'activité : relief en randonnée, cyclable à
  // vélo, plan sinon. Le visiteur peut toujours en changer avec les boutons.
  const [layer, setLayer] = useState(() => mapLayerFor(activity));

  const drawable = stages.filter(
    (s) => s.points.length > 0 && (!visibleStages || visibleStages.includes(s.file))
  );
  const forBounds = drawable.length > 0 ? drawable : stages.filter((s) => s.points.length > 0);
  if (forBounds.length === 0) return null;

  const allPoints = forBounds.flatMap((s) => s.points);
  const lats = allPoints.map((p) => p.lat);
  const lons = allPoints.map((p) => p.lon);
  const bounds = [
    [Math.min(...lats), Math.min(...lons)],
    [Math.max(...lats), Math.max(...lons)],
  ];

  const multi = stages.length > 1;
  // Filet de sécurité : une clé inconnue ne doit jamais faire disparaître la carte.
  const tiles = LAYERS[layer] || LAYERS.plan;

  return (
    <div className="map-inner">
      <div className="layer-switch" role="group" aria-label="Fond de carte">
        {Object.entries(LAYERS).map(([key, meta]) => (
          <button
            key={key}
            type="button"
            className={`layer-button${layer === key ? " is-active" : ""}`}
            aria-pressed={layer === key}
            onClick={() => setLayer(key)}
          >
            {meta.label}
          </button>
        ))}
      </div>

      <MapContainer
        bounds={bounds}
        boundsOptions={{ padding: [30, 30] }}
        scrollWheelZoom={false}
        style={{ height: "100%", width: "100%" }}
      >
        <TileLayer
          key={layer}
          attribution={tiles.attribution}
          url={tiles.url}
          maxZoom={tiles.maxZoom}
        />

        {drawable.map((stage, i) => {
          const positions = stage.points.map((p) => [p.lat, p.lon]);
          const start = positions[0];
          const end = positions[positions.length - 1];
          // Le numéro se lit dans la sortie entière, pas dans le sous-ensemble
          // affiché : filtrer les étapes ne doit pas renuméroter celles qui restent.
          const rank = stages.findIndex((s) => s.file === stage.file);
          return (
            <Fragment key={stage.file}>
              {/* Liseré, sous la trace. Non interactif : le survol doit
                  atteindre la trace elle-même et non ce doublon plus large. */}
              <Polyline
                positions={positions}
                interactive={false}
                pathOptions={{
                  color: CASING_COLOR,
                  weight: CASING_WEIGHT,
                  opacity: CASING_OPACITY,
                  lineCap: "round",
                  lineJoin: "round",
                }}
              />
              <Polyline
                positions={positions}
                pathOptions={{
                  color: stage.color,
                  weight: TRACE_WEIGHT,
                  opacity: 1,
                  lineCap: "round",
                  lineJoin: "round",
                }}
              >
                {multi && (
                  <Tooltip sticky>
                    {stageLabel(stage.title, rank, stages.length)} · {stage.distanceKm} km
                  </Tooltip>
                )}
              </Polyline>
              {/* Départ creux, arrivée pleine : la distinction reste, les deux
                  pastilles grossissent juste assez pour ressortir du tracé.
                  L'arrivée est cerclée du liseré, un cercle blanc sur un fond
                  clair ne se voyait pas. */}
              <CircleMarker
                center={start}
                radius={7}
                pathOptions={{
                  color: stage.color,
                  fillColor: "#fff",
                  fillOpacity: 1,
                  weight: 4,
                  opacity: 1,
                }}
              />
              {i === drawable.length - 1 && (
                <CircleMarker
                  center={end}
                  radius={8}
                  pathOptions={{
                    color: CASING_COLOR,
                    fillColor: stage.color,
                    fillOpacity: 1,
                    weight: 3,
                    opacity: 0.85,
                  }}
                />
              )}
            </Fragment>
          );
        })}
      </MapContainer>
    </div>
  );
}
