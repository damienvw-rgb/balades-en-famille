import test from "node:test";
import assert from "node:assert/strict";
import { parseGpx } from "../lib/gpx.js";

/** Petit GPX à un seul segment, pour ne pas répéter le XML partout. */
function gpx(points) {
  const trkpts = points
    .map(
      ({ lat, lon, ele }) =>
        `<trkpt lat="${lat}" lon="${lon}">${ele === undefined ? "" : `<ele>${ele}</ele>`}</trkpt>`
    )
    .join("");
  return `<?xml version="1.0"?><gpx><trk><trkseg>${trkpts}</trkseg></trk></gpx>`;
}

test("relève tous les points d'une trace", () => {
  const { points } = parseGpx(gpx([
    { lat: 50.0, lon: 4.0, ele: 100 },
    { lat: 50.1, lon: 4.0, ele: 150 },
  ]));

  assert.equal(points.length, 2);
  assert.deepEqual(points[0], { lat: 50.0, lon: 4.0, ele: 100 });
});

test("mesure la distance en kilomètres", () => {
  // Un dixième de degré de latitude vaut environ 11,1 km
  const { distanceKm } = parseGpx(gpx([
    { lat: 50.0, lon: 4.0 },
    { lat: 50.1, lon: 4.0 },
  ]));

  assert.ok(distanceKm > 11 && distanceKm < 11.2, `distance inattendue : ${distanceKm}`);
});

test("sépare le dénivelé positif du négatif", () => {
  const { elevationGain, elevationLoss } = parseGpx(gpx([
    { lat: 50.0, lon: 4.0, ele: 100 },
    { lat: 50.01, lon: 4.0, ele: 180 },
    { lat: 50.02, lon: 4.0, ele: 130 },
  ]));

  assert.equal(elevationGain, 80);
  assert.equal(elevationLoss, 50);
});

test("ignore le dénivelé quand l'altitude manque", () => {
  const { elevationGain, elevationLoss, points } = parseGpx(gpx([
    { lat: 50.0, lon: 4.0 },
    { lat: 50.01, lon: 4.0 },
  ]));

  assert.equal(elevationGain, 0);
  assert.equal(elevationLoss, 0);
  assert.equal(points[0].ele, null);
});

test("réunit les points de plusieurs segments et de plusieurs pistes", () => {
  const xml =
    '<?xml version="1.0"?><gpx>' +
    '<trk><trkseg><trkpt lat="50.0" lon="4.0"/><trkpt lat="50.1" lon="4.0"/></trkseg>' +
    '<trkseg><trkpt lat="50.2" lon="4.0"/></trkseg></trk>' +
    '<trk><trkseg><trkpt lat="50.3" lon="4.0"/></trkseg></trk></gpx>';

  assert.equal(parseGpx(xml).points.length, 4);
});

test("un GPX sans trace ne fait pas échouer la lecture", () => {
  const { points, distanceKm } = parseGpx('<?xml version="1.0"?><gpx></gpx>');

  assert.deepEqual(points, []);
  assert.equal(distanceKm, 0);
});
