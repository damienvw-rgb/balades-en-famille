import { MapContainer, TileLayer, Polyline, CircleMarker } from "react-leaflet";

export default function RouteMap({ points }) {
  const positions = points.map((p) => [p.lat, p.lon]);

  if (positions.length === 0) {
    return null;
  }

  const lats = positions.map((p) => p[0]);
  const lons = positions.map((p) => p[1]);
  const bounds = [
    [Math.min(...lats), Math.min(...lons)],
    [Math.max(...lats), Math.max(...lons)],
  ];

  const start = positions[0];
  const end = positions[positions.length - 1];

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
      <Polyline positions={positions} pathOptions={{ color: "#c1542d", weight: 4 }} />
      <CircleMarker center={start} radius={6} pathOptions={{ color: "#8fae87", fillColor: "#8fae87", fillOpacity: 1 }} />
      <CircleMarker center={end} radius={6} pathOptions={{ color: "#d9a441", fillColor: "#d9a441", fillOpacity: 1 }} />
    </MapContainer>
  );
}
