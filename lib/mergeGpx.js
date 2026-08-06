/**
 * Assemble plusieurs traces en un seul fichier GPX, une piste par étape.
 * Permet de télécharger l'itinéraire complet en une fois, en plus des étapes
 * séparées. Généré à la volée, rien n'est stocké.
 */
function escapeXml(text) {
  return String(text).replace(/[<>&'"]/g, (c) =>
    ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", "'": "&apos;", '"': "&quot;" }[c])
  );
}

export function mergeGpx(title, stages) {
  const tracks = stages
    .map((stage, i) => {
      const points = stage.points
        .map(
          (p) =>
            `      <trkpt lat="${p.lat}" lon="${p.lon}">${
              p.ele !== null && p.ele !== undefined ? `<ele>${p.ele}</ele>` : ""
            }</trkpt>`
        )
        .join("\n");

      return [
        "  <trk>",
        `    <name>${escapeXml(stage.title || `Étape ${i + 1}`)}</name>`,
        `    <number>${i + 1}</number>`,
        "    <trkseg>",
        points,
        "    </trkseg>",
        "  </trk>",
      ].join("\n");
    })
    .join("\n");

  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<gpx version="1.1" creator="Partage de balades familiales" xmlns="http://www.topografix.com/GPX/1/1">',
    "  <metadata>",
    `    <name>${escapeXml(title)}</name>`,
    `    <time>${new Date().toISOString()}</time>`,
    "  </metadata>",
    tracks,
    "</gpx>",
    "",
  ].join("\n");
}
