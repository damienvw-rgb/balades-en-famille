import { useEffect, useRef, useState } from "react";
import { gearEmoji, GEAR_EMOJI_CHOICES } from "@/lib/gear";

/**
 * Saisie du matériel, un élément par ligne.
 *
 * Le pictogramme est déduit du texte au fur et à mesure de la frappe. S'il ne
 * convient pas, un clic dessus ouvre une palette et le choix remplace la
 * déduction. Le retour à « automatique » est toujours possible.
 *
 * Chaque élément vaut { label, emoji }, emoji restant vide tant que le visiteur
 * n'a rien choisi : ainsi une correction ultérieure des règles de déduction
 * profite aux sorties qui n'ont pas forcé de pictogramme.
 */
export default function GearPicker({ gear, onChange, max = 20 }) {
  const [openAt, setOpenAt] = useState(null);
  const listRef = useRef(null);

  // La palette se referme au clic à l'extérieur ou sur la touche Échap.
  useEffect(() => {
    if (openAt === null) return undefined;

    const onPointerDown = (event) => {
      if (listRef.current && !listRef.current.contains(event.target)) setOpenAt(null);
    };
    const onKeyDown = (event) => {
      if (event.key === "Escape") setOpenAt(null);
    };

    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [openAt]);

  const update = (index, patch) =>
    onChange(gear.map((item, k) => (k === index ? { ...item, ...patch } : item)));

  const remove = (index) => {
    onChange(gear.filter((_, k) => k !== index));
    setOpenAt(null);
  };

  return (
    <div className="gear-picker" ref={listRef}>
      {gear.map((item, i) => {
        const label = (item.label || "").trim();
        const suggested = label ? gearEmoji(label) : "▫️";
        const shown = item.emoji || suggested;
        const isOpen = openAt === i;

        return (
          <div className="gear-input-row" key={i}>
            <div className="gear-emoji-wrap">
              <button
                type="button"
                className={`gear-emoji-button${item.emoji ? " is-chosen" : ""}`}
                onClick={() => setOpenAt(isOpen ? null : i)}
                aria-expanded={isOpen}
                aria-haspopup="true"
                title="Changer le pictogramme"
                aria-label={`Changer le pictogramme de l'élément ${i + 1}`}
              >
                {shown}
              </button>

              {isOpen && (
                <div className="gear-emoji-palette">
                  <div className="gear-emoji-grid">
                    {GEAR_EMOJI_CHOICES.map((emoji) => (
                      <button
                        key={emoji}
                        type="button"
                        className={`gear-emoji-choice${item.emoji === emoji ? " is-active" : ""}`}
                        onClick={() => {
                          update(i, { emoji });
                          setOpenAt(null);
                        }}
                        aria-label={`Choisir ${emoji}`}
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>

                  <button
                    type="button"
                    className="link-button gear-emoji-auto"
                    onClick={() => {
                      update(i, { emoji: "" });
                      setOpenAt(null);
                    }}
                  >
                    Revenir au choix automatique ({suggested})
                  </button>
                </div>
              )}
            </div>

            <input
              type="text"
              value={item.label}
              maxLength={60}
              placeholder="Tente 3 places, sacoches, filtre à eau…"
              onChange={(e) => update(i, { label: e.target.value })}
            />

            {gear.length > 1 && (
              <button
                type="button"
                className="link-button"
                onClick={() => remove(i)}
                aria-label={`Retirer l'élément ${i + 1}`}
              >
                Retirer
              </button>
            )}
          </div>
        );
      })}

      {gear.length < max && (
        <button
          type="button"
          className="button-secondary"
          onClick={() => onChange([...gear, { label: "", emoji: "" }])}
        >
          + Ajouter un élément
        </button>
      )}
    </div>
  );
}
