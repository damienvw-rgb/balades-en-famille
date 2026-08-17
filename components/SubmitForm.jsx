import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { ACTIVITIES, LODGINGS } from "@/lib/activities";
import { countryList, regionList, OTHER, DIFFICULTIES } from "@/lib/geo";
import { gearEmoji } from "@/lib/gear";
import { postJson } from "@/lib/api";

const MAX_FILE_BYTES = 4 * 1024 * 1024;
const MAX_STAGES = 30;

const emptyStage = () => ({
  title: "", description: "", difficulty: "",
  lodgingType: "", lodgingText: "", gpx: "", fileName: "",
});

export default function SubmitForm() {
  const renderedAt = useRef(Date.now());
  const [form, setForm] = useState({
    title: "", activity: "", date: "",
    country: "", countryOther: "", region: "", regionOther: "",
    difficulty: "", description: "",
    adults: "", children: "",
    author: "", authorEmail: "", honeypot: "",
  });
  // Une étape est visible d'emblée : le cas courant est la sortie à la journée.
  const [stages, setStages] = useState([emptyStage()]);
  const [childAges, setChildAges] = useState([]);
  const [gear, setGear] = useState([""]);
  const [identity, setIdentity] = useState(null);
  const [state, setState] = useState({ status: "idle", message: null });

  const set = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }));

  const setStage = (i, field, value) =>
    setStages((list) => list.map((s, k) => (k === i ? { ...s, [field]: value } : s)));

  // Le nombre d'enfants pilote le nombre de champs d'âge
  useEffect(() => {
    const n = Math.max(0, Math.min(12, parseInt(form.children, 10) || 0));
    setChildAges((current) => Array.from({ length: n }, (_, i) => current[i] ?? ""));
  }, [form.children]);

  // Changer de pays remet la région à zéro
  useEffect(() => {
    setForm((f) => ({ ...f, region: "", regionOther: "" }));
  }, [form.country]);

  // Cohérence pseudo / email vérifiée pendant la saisie
  useEffect(() => {
    if (!form.authorEmail.includes("@")) return setIdentity(null);
    const timer = setTimeout(async () => {
      const { data } = await postJson("/api/identity/check", {
        email: form.authorEmail,
        pseudo: form.author,
      });
      setIdentity(data.status === "incomplet" ? null : data);
    }, 600);
    return () => clearTimeout(timer);
  }, [form.authorEmail, form.author]);

  const readFile = async (i, file) => {
    if (!file) return;
    if (!file.name.toLowerCase().endsWith(".gpx")) {
      return setState({ status: "error", message: "Seuls les fichiers .gpx sont acceptés." });
    }
    if (file.size > MAX_FILE_BYTES) {
      return setState({ status: "error", message: `${file.name} dépasse 4 Mo.` });
    }
    const text = await file.text();
    setStage(i, "gpx", text);
    setStage(i, "fileName", file.name);
    setState({ status: "idle", message: null });
  };

  const submit = async (e) => {
    e.preventDefault();

    if (!form.activity) return setState({ status: "error", message: "Choisis un type d'activité." });
    if (!form.country) return setState({ status: "error", message: "Choisis un pays." });
    if (form.country === OTHER && !form.countryOther.trim()) {
      return setState({ status: "error", message: "Précise le pays." });
    }
    if (stages.some((s) => !s.gpx)) {
      return setState({ status: "error", message: "Chaque étape a besoin de son fichier GPX." });
    }

    setState({ status: "sending", message: null });

    const payload = {
      ...form,
      country: form.country === OTHER ? form.countryOther.trim() : form.country,
      region: form.region === OTHER ? form.regionOther.trim() : form.region,
      participants: {
        adults: parseInt(form.adults, 10) || 0,
        children: childAges.map((a) => parseInt(a, 10)).filter((a) => Number.isFinite(a)),
        childCount: parseInt(form.children, 10) || 0,
      },
      gear: gear.map((g) => g.trim()).filter(Boolean),
      stages,
      renderedAt: renderedAt.current,
    };

    const { ok, data } = await postJson("/api/submissions", payload);
    if (!ok) {
      if (data.suggestion) setForm((f) => ({ ...f, author: data.suggestion }));
      return setState({ status: "error", message: data.error || "Envoi impossible." });
    }
    setState({ status: "sent", message: data.message });
  };

  if (state.status === "sent") {
    return (
      <div className="comment-form-done">
        <h2>Merci !</h2>
        <p>{state.message}</p>
        <Link href="/#vadrouilles" className="button-primary">Revenir au carnet</Link>
      </div>
    );
  }

  const regions = form.country && form.country !== OTHER ? regionList(form.country) : null;
  const multi = stages.length > 1;

  return (
    <form className="submit-form" onSubmit={submit}>
      <fieldset>
        <legend>La sortie</legend>

        <label className="field">
          <span>Titre <em>obligatoire</em></span>
          <input type="text" value={form.title} onChange={set("title")} required minLength={3} maxLength={120}
            placeholder="Boucle des étangs de Virelles" />
        </label>

        <div className="field-row">
          <label className="field">
            <span>Activité <em>obligatoire</em></span>
            <select value={form.activity} onChange={set("activity")} required>
              <option value="">Choisis…</option>
              {Object.entries(ACTIVITIES).map(([key, meta]) => (
                <option key={key} value={key}>{meta.emoji} {meta.label}</option>
              ))}
            </select>
          </label>

          <label className="field">
            <span>Date</span>
            <input type="date" value={form.date} onChange={set("date")} />
          </label>

          <label className="field">
            <span>Difficulté</span>
            <select value={form.difficulty} onChange={set("difficulty")}>
              <option value="">Non précisée</option>
              {DIFFICULTIES.map((d) => <option key={d} value={d}>{d}</option>)}
            </select>
          </label>
        </div>

        <div className="field-row">
          <label className="field">
            <span>Pays <em>obligatoire</em></span>
            <select value={form.country} onChange={set("country")} required>
              <option value="">Choisis…</option>
              {countryList().map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </label>

          {form.country === OTHER && (
            <label className="field">
              <span>Quel pays ? <em>obligatoire</em></span>
              <input type="text" value={form.countryOther} onChange={set("countryOther")} required maxLength={60} />
            </label>
          )}

          {regions && (
            <label className="field">
              <span>Région</span>
              <select value={form.region} onChange={set("region")}>
                <option value="">Non précisée</option>
                {regions.map((r) => <option key={r} value={r}>{r}</option>)}
              </select>
            </label>
          )}

          {(form.region === OTHER || form.country === OTHER) && (
            <label className="field">
              <span>Quelle région ?</span>
              <input type="text" value={form.regionOther} onChange={set("regionOther")} maxLength={60} />
            </label>
          )}
        </div>

        <label className="field">
          <span>Description</span>
          <textarea value={form.description} onChange={set("description")} rows={10} maxLength={6000}
            placeholder="Ce qui rend cette sortie intéressante, les points d'attention, les bons coins pour la pause…" />
          <small className="field-hint">
            Les premières lignes apparaissent sur la page d'accueil, le texte
            complet sur la page de la sortie.
          </small>
        </label>
      </fieldset>

      <fieldset>
        <legend>Qui était de la partie</legend>
        <p className="field-note">Facultatif, mais utile aux familles qui cherchent une sortie adaptée.</p>

        <div className="field-row">
          <label className="field">
            <span>Adultes</span>
            <input type="number" min="0" max="20" value={form.adults} onChange={set("adults")} placeholder="2" />
          </label>
          <label className="field">
            <span>Enfants</span>
            <input type="number" min="0" max="12" value={form.children} onChange={set("children")} placeholder="3" />
          </label>
        </div>

        {childAges.length > 0 && (
          <div className="ages-row">
            <span className="field-label-inline">Âge des enfants</span>
            <div className="ages-inputs">
              {childAges.map((age, i) => (
                <input key={i} type="number" min="0" max="25" value={age} placeholder={`#${i + 1}`}
                  aria-label={`Âge de l'enfant ${i + 1}`}
                  onChange={(e) =>
                    setChildAges((list) => list.map((a, k) => (k === i ? e.target.value : a)))
                  } />
              ))}
            </div>
          </div>
        )}
      </fieldset>

      <fieldset>
        <legend>Matériel</legend>
        <p className="field-note">
          Un élément par champ. Une icône est associée automatiquement à chacun.
        </p>

        {gear.map((item, i) => (
          <div className="gear-input-row" key={i}>
            <span className="gear-input-emoji" aria-hidden="true">
              {item.trim() ? gearEmoji(item) : "·"}
            </span>
            <input type="text" value={item} maxLength={60} placeholder="Sacoches, tente 3 places, réchaud…"
              aria-label={`Matériel ${i + 1}`}
              onChange={(e) => setGear((l) => l.map((g, k) => (k === i ? e.target.value : g)))} />
            {gear.length > 1 && (
              <button type="button" className="link-button"
                onClick={() => setGear((l) => l.filter((_, k) => k !== i))}>
                Retirer
              </button>
            )}
          </div>
        ))}

        {gear.length < 20 && (
          <button type="button" className="button-secondary" onClick={() => setGear((l) => [...l, ""])}>
            + Ajouter un élément
          </button>
        )}
      </fieldset>

      <fieldset>
        <legend>{multi ? "Les étapes" : "La trace"}</legend>
        <p className="field-note">
          Une seule trace pour une sortie à la journée. Ajoute une étape par jour
          pour un itinéraire au long cours.
        </p>

        {stages.map((stage, i) => (
          <div className="stage-fields" key={i}>
            <div className="stage-fields-head">
              <h4>{multi ? `Étape ${i + 1}` : "Trace GPX"}</h4>
              {multi && (
                <button type="button" className="link-button"
                  onClick={() => setStages((l) => l.filter((_, k) => k !== i))}>
                  Retirer
                </button>
              )}
            </div>

            <label className="field">
              <span>Fichier GPX <em>obligatoire</em></span>
              <input type="file" accept=".gpx" onChange={(e) => readFile(i, e.target.files?.[0])} />
              {stage.fileName && <small className="file-ok">✓ {stage.fileName}</small>}
            </label>

            <label className="field">
              <span>{multi ? "Titre de l'étape" : "Sous-titre"}</span>
              <input type="text" value={stage.title} maxLength={120}
                placeholder={multi ? `Jour ${i + 1} : ...` : "Facultatif"}
                onChange={(e) => setStage(i, "title", e.target.value)} />
            </label>

            <label className="field">
              <span>Description</span>
              <textarea value={stage.description} rows={7} maxLength={4000}
                onChange={(e) => setStage(i, "description", e.target.value)} />
            </label>

            <div className="field-row">
              <label className="field">
                <span>Difficulté de l'étape</span>
                <select value={stage.difficulty} onChange={(e) => setStage(i, "difficulty", e.target.value)}>
                  <option value="">Non précisée</option>
                  {DIFFICULTIES.map((d) => <option key={d} value={d}>{d}</option>)}
                </select>
              </label>

              <label className="field">
                <span>Logement</span>
                <select value={stage.lodgingType} onChange={(e) => setStage(i, "lodgingType", e.target.value)}>
                  <option value="">Non précisé</option>
                  {Object.entries(LODGINGS).map(([key, meta]) => (
                    <option key={key} value={key}>{meta.emoji} {meta.label}</option>
                  ))}
                </select>
              </label>

              <label className="field">
                <span>Précisions</span>
                <input type="text" value={stage.lodgingText} maxLength={500}
                  placeholder="Nom du lieu, réservation…"
                  onChange={(e) => setStage(i, "lodgingText", e.target.value)} />
              </label>
            </div>
          </div>
        ))}

        {stages.length < MAX_STAGES && (
          <button type="button" className="button-secondary"
            onClick={() => setStages((l) => [...l, emptyStage()])}>
            + Ajouter une étape
          </button>
        )}
      </fieldset>

      <fieldset>
        <legend>Toi</legend>
        <div className="field-row">
          <label className="field">
            <span>Pseudo <em>obligatoire</em></span>
            <input type="text" value={form.author} onChange={set("author")} required minLength={2} maxLength={40}
              placeholder="Affiché sur la sortie" />
          </label>
          <label className="field">
            <span>Email <em>obligatoire</em></span>
            <input type="email" value={form.authorEmail} onChange={set("authorEmail")} required
              placeholder="jamais affiché" />
          </label>
        </div>

        {identity?.message && (
          <p className={identity.status === "conflit" ? "identity-warn" : "identity-ok"}>
            {identity.message}
            {identity.suggestion && (
              <button type="button" className="link-button"
                onClick={() => setForm((f) => ({ ...f, author: identity.suggestion }))}>
                Utiliser « {identity.suggestion} »
              </button>
            )}
          </p>
        )}

        <p className="field-note">
          Un lien de confirmation te sera envoyé. Ton adresse n'apparaît nulle
          part sur le site : elle sert à te prévenir de la publication et des
          commentaires reçus. <Link href="/mentions-legales">En savoir plus</Link>
        </p>
      </fieldset>

      <div className="honeypot" aria-hidden="true">
        <label>
          Ne pas remplir
          <input type="text" tabIndex={-1} autoComplete="off" value={form.honeypot} onChange={set("honeypot")} />
        </label>
      </div>

      {state.status === "error" && <p className="comment-error">{state.message}</p>}

      <div className="form-actions">
        <button type="submit" className="button-primary" disabled={state.status === "sending"}>
          {state.status === "sending" ? "Envoi…" : "Proposer cette sortie"}
        </button>
      </div>
    </form>
  );
}
