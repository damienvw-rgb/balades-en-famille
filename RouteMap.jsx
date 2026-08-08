export default function ElevationProfile({ elevations, color = "#d9a441" }) {
  const values = elevations.filter((e) => e !== null && e !== undefined);

  if (values.length < 2) {
    return (
      <p className="no-elevation">
        Pas de données d'altitude dans ce fichier GPX.
      </p>
    );
  }

  const width = 1000;
  const height = 160;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;

  const points = values.map((v, i) => {
    const x = (i / (values.length - 1)) * width;
    const y = height - ((v - min) / range) * (height - 20) - 10;
    return [x, y];
  });

  const linePath = points
    .map(([x, y], i) => `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`)
    .join(" ");
  const areaPath = `${linePath} L${width},${height} L0,${height} Z`;

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="none"
      style={{ width: "100%", height: "160px", display: "block" }}
      role="img"
      aria-label={`Profil d'altitude, de ${Math.round(min)} à ${Math.round(max)} mètres`}
    >
      <path d={areaPath} fill={color} fillOpacity="0.18" />
      <path d={linePath} fill="none" stroke={color} strokeWidth="2.5" />
      <text x="4" y="16" fill="#b7c4b6" fontSize="11">{Math.round(max)} m</text>
      <text x="4" y={height - 4} fill="#b7c4b6" fontSize="11">{Math.round(min)} m</text>
    </svg>
  );
}
