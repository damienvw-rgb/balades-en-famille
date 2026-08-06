export default function GearList({ gear }) {
  if (!gear || gear.length === 0) return null;

  return (
    <div className="gear">
      <h3 className="gear-title">Matériel</h3>
      <ul className="gear-chips">
        {gear.map((item, i) => (
          <li key={i} className="gear-chip">
            {item.emoji && <span aria-hidden="true">{item.emoji}</span>}
            {item.label}
          </li>
        ))}
      </ul>
    </div>
  );
}
