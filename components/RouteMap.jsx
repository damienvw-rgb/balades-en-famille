import { useState } from "react";
import { MapContainer, TileLayer, Polyline, CircleMarker, Tooltip } from "react-leaflet";

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

export default function RouteMap({ stages, visibleStages = null }) {
  const [layer, setLayer] = useState("cyclosm");

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
  const tiles = LAYERS[layer];

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
            <div key={stage.file}>
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
            </div>
          );
        })}
      </MapContainer>
    </div>
  );
}
