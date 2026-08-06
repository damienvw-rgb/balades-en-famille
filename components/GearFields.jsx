import { gearEmoji } from "@/lib/gearEmoji";

/**
 * Un champ par équipement : l'emoji est déduit automatiquement du libellé,
 * le visiteur n'a donc rien à choisir et l'affichage reste homogène.
 */
export default function GearFields({ gear, onChange, max = 12 }) {
  const set = (i, value) => onChange(gear.map((g, k) => (k === i ? value : g)));
  const add = () => onChange([...gear, ""]);
  const remove = (i) => onChange(gear.filter((_, k) => k !== i));

  return (
    <div className="gear-fields">
      {gear.map((item, i) => (
        <div className="gear-field-row" key={i}>
          <span className="gear-field-emoji" aria-hidden="true">
            {item.trim() ? gearEmoji(item) : "·"}
          </span>
          <input
            type="text"
            value={item}
            maxLength={60}
            placeholder="Tente 3 places, sacoches, réchaud…"
            onChange={(e) => set(i, e.target.value)}
          />
          {gear.length > 1 && (
            <button
              type="button"
              className="link-button"
              onClick={() => remove(i)}
              aria-label={`Retirer l'équipement ${i + 1}`}
            >
              Retirer
            </button>
          )}
        </div>
      ))}

      {gear.length < max && (
        <button type="button" className="button-secondary" onClick={add}>
          + Ajouter un équipement
        </button>
      )}

      <p className="field-note">
        Un équipement par ligne. L'emoji est ajouté automatiquement à partir de
        ce que tu écris.
      </p>
    </div>
  );
}
