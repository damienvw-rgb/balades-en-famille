import { XMLParser } from "fast-xml-parser";

const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: "" });

// Distance en mètres entre deux points, formule de haversine
function distanceMeters(a, b) {
  const R = 6371000;
  const toRad = (deg) => (deg * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLon = toRad(b.lon - a.lon);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

/**
 * Transforme le XML d'un GPX en une liste de points { lat, lon, ele },
 * accompagnée des totaux : distance en km, dénivelés positif et négatif
 * en mètres.
 */
export function parseGpx(xmlText) {
  const doc = parser.parse(xmlText);
  const trk = doc?.gpx?.trk;
  const tracks = Array.isArray(trk) ? trk : [trk];

  const points = [];
  for (const t of tracks) {
    if (!t) continue;
    const segs = Array.isArray(t.trkseg) ? t.trkseg : [t.trkseg];
    for (const seg of segs) {
      if (!seg) continue;
      const pts = Array.isArray(seg.trkpt) ? seg.trkpt : [seg.trkpt];
      for (const p of pts) {
        if (!p) continue;
        points.push({
          lat: parseFloat(p.lat),
          lon: parseFloat(p.lon),
          ele: p.ele !== undefined ? parseFloat(p.ele) : null,
        });
      }
    }
  }

  let distanceM = 0;
  let elevationGain = 0;
  let elevationLoss = 0;

  for (let i = 1; i < points.length; i++) {
    distanceM += distanceMeters(points[i - 1], points[i]);
    if (points[i].ele !== null && points[i - 1].ele !== null) {
      const diff = points[i].ele - points[i - 1].ele;
      if (diff > 0) elevationGain += diff;
      else elevationLoss += Math.abs(diff);
    }
  }

  return {
    points,
    distanceKm: Math.round((distanceM / 1000) * 10) / 10,
    elevationGain: Math.round(elevationGain),
    elevationLoss: Math.round(elevationLoss),
  };
}
