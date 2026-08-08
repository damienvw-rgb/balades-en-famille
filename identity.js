import { useState, useEffect, useRef } from "react";

/**
 * Couple pseudo / email, avec vérification en direct.
 * Un pseudo appartient à une adresse : cette vérification évite qu'un visiteur
 * s'exprime sous le nom d'un autre, sur les commentaires comme sur les sorties.
 */
export default function IdentityFields({
  pseudo, email, onPseudoChange, onEmailChange,
  pseudoLabel = "Pseudo", note = null,
}) {
  const [check, setCheck] = useState(null);
  const timer = useRef(null);

  useEffect(() => {
    clearTimeout(timer.current);
    if (!pseudo || !email) {
      setCheck(null);
      return;
    }
    // On laisse la personne finir de taper avant d'interroger le serveur
    timer.current = setTimeout(async () => {
      try {
        const res = await fetch("/api/identity/check", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ pseudo, email }),
        });
        setCheck(await res.json());
      } catch {
        setCheck(null);
      }
    }, 600);
    return () => clearTimeout(timer.current);
  }, [pseudo, email]);

  const problem = check && !check.ok && !check.incomplete;
  const known = check && check.ok && check.known;

  return (
    <>
      <div className="field-row">
        <label className="field">
          <span>{pseudoLabel} <em>obligatoire</em></span>
          <input
            type="text"
            value={pseudo}
            onChange={(e) => onPseudoChange(e.target.value)}
            required
            minLength={2}
            maxLength={40}
            aria-invalid={problem ? "true" : undefined}
            placeholder="Comment veux-tu apparaître ?"
          />
        </label>

        <label className="field">
          <span>Email <em>obligatoire</em></span>
          <input
            type="email"
            value={email}
            onChange={(e) => onEmailChange(e.target.value)}
            required
            aria-invalid={problem ? "true" : undefined}
            placeholder="jamais affiché"
          />
        </label>
      </div>

      {problem && (
        <p className="identity-warning">
          {check.message}
          {check.suggestion && (
            <button
              type="button"
              className="link-button"
              onClick={() => onPseudoChange(check.suggestion)}
            >
              Utiliser « {check.suggestion} »
            </button>
          )}
        </p>
      )}

      {known && (
        <p className="identity-ok">On se connaît, bon retour parmi nous.</p>
      )}

      {note && <p className="field-note">{note}</p>}
    </>
  );
}
