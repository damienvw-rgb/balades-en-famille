import { Fragment, useState } from "react";
import { MapContainer, TileLayer, Polyline, CircleMarker, Tooltip } from "react-leaflet";
import { mapLayerFor } from "@/lib/activities";

/**
 * Fonds de carte disponibles, tous libres et sans clé d'API.
 * CyclOSM est le plus proche du rendu de Komoot : mêmes données OpenStreetMap,
 * mise en avant des itinéraires cyclables, relief discret.
 */
const LAYERS = {
  cyclosm: {
    label: "Cyclable",
    url: "https://{s}.tile-cyclosm.openstreetmap.fr/cyclosm/{z}/{x}/{y}.png",
    attribution:
      'Fond <a href="https://www.cyclosm.org">CyclOSM</a>, données &copy; OpenStreetMap',
    maxZoom: 18,
  },
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

export default function RouteMap({ stages, activity = null }) {
  // Le fond de départ dépend de l'activité : relief en randonnée, cyclable à
  // vélo, plan sinon. Le visiteur peut toujours en changer avec les boutons.
  const [layer, setLayer] = useState(() => mapLayerFor(activity));

  const drawable = stages.filter((s) => s.points.length > 0);
  if (drawable.length === 0) return null;

  const allPoints = drawable.flatMap((s) => s.points);
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
          return (
            // Fragment et non div : les enfants de MapContainer sont des
            // couches Leaflet, pas des éléments du DOM. Un div se retrouverait
            // inséré dans le conteneur de la carte, par dessus les tuiles.
            <Fragment key={stage.file}>
              <Polyline positions={positions} pathOptions={{ color: stage.color, weight: 4 }}>
                {multi && (
                  <Tooltip sticky>
                    {stage.title} · {stage.distanceKm} km
                  </Tooltip>
                )}
              </Polyline>
              <CircleMarker
                center={start}
                radius={5}
                pathOptions={{ color: stage.color, fillColor: "#fff", fillOpacity: 1, weight: 3 }}
              />
              {i === drawable.length - 1 && (
                <CircleMarker
                  center={end}
                  radius={6}
                  pathOptions={{ color: stage.color, fillColor: stage.color, fillOpacity: 1, weight: 2 }}
                />
              )}
            </Fragment>
          );
        })}
      </MapContainer>
    </div>
  );
}
