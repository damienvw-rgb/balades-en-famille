import fs from "fs";
import path from "path";
import { parseGpx } from "./gpx";

const RIDES_DIR = path.join(process.cwd(), "public", "rides");

export function getRideSlugs() {
  if (!fs.existsSync(RIDES_DIR)) return [];
  return fs
    .readdirSync(RIDES_DIR, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name);
}

function loadInfo(slug) {
  const infoPath = path.join(RIDES_DIR, slug, "info.json");
  if (!fs.existsSync(infoPath)) {
    return {
      title: slug,
      date: null,
      region: "",
      difficulty: "",
      description: "",
      tags: [],
    };
  }
  return JSON.parse(fs.readFileSync(infoPath, "utf-8"));
}

function loadGpxStats(slug) {
  const gpxPath = path.join(RIDES_DIR, slug, "route.gpx");
  const xml = fs.readFileSync(gpxPath, "utf-8");
  return parseGpx(xml);
}

// Lightweight summary for the home page grid (no full point list)
export function getRideSummaries() {
  return getRideSlugs()
    .map((slug) => {
      const info = loadInfo(slug);
      const { points, distanceKm, elevationGain } = loadGpxStats(slug);
      return {
        slug,
        ...info,
        distanceKm,
        elevationGain,
        elevationProfile: points
          .filter((p) => p.ele !== null)
          .map((p) => p.ele),
      };
    })
    .sort((a, b) => (b.date || "").localeCompare(a.date || ""));
}

// Full detail for a single ride page (includes the track points for the map)
export function getRideDetail(slug) {
  const info = loadInfo(slug);
  const stats = loadGpxStats(slug);
  return {
    slug,
    ...info,
    ...stats,
  };
}
