import { MapContainer, TileLayer, Polyline, CircleMarker, Tooltip } from "react-leaflet";

export default function RouteMap({ stages }) {
  const drawable = stages.filter((s) => s.points.length > 0);
  if (drawable.length === 0) return null;

  const allPoints = drawable.flatMap((s) => s.points);
  const lats = allPoints.map((p) => p.lat);
  const lons = allPoints.map((p) => p.lon);
  const bounds = [
    [Math.min(...lats), Math.min(...lons)],
    [Math.max(...lats), Math.max(...lons)],
  ];

  const multi = drawable.length > 1;

  return (
    <MapContainer
      bounds={bounds}
      boundsOptions={{ padding: [30, 30] }}
      scrollWheelZoom={false}
      style={{ height: "100%", width: "100%" }}
    >
      <TileLayer
        attribution='Fond de carte &copy; <a href="https://opentopomap.org">OpenTopoMap</a> (CC-BY-SA), données &copy; OpenStreetMap'
        url="https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png"
        maxZoom={17}
      />

      {drawable.map((stage, i) => {
        const positions = stage.points.map((p) => [p.lat, p.lon]);
        const start = positions[0];
        const end = positions[positions.length - 1];
        return (
          <div key={stage.file}>
            <Polyline
              positions={positions}
              pathOptions={{ color: stage.color, weight: 4 }}
            >
              {multi && (
                <Tooltip sticky>
                  {stage.title} · {stage.distanceKm} km
                </Tooltip>
              )}
            </Polyline>
            <CircleMarker
              center={start}
              radius={5}
              pathOptions={{
                color: stage.color,
                fillColor: "#f2ecdd",
                fillOpacity: 1,
                weight: 3,
              }}
            />
            {/* Only the very last point gets a filled end marker */}
            {i === drawable.length - 1 && (
              <CircleMarker
                center={end}
                radius={6}
                pathOptions={{
                  color: stage.color,
                  fillColor: stage.color,
                  fillOpacity: 1,
                  weight: 2,
                }}
              />
            )}
          </div>
        );
      })}
    </MapContainer>
  );
}
