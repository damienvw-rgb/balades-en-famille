import { useState, useRef, useEffect } from "react";
import Head from "next/head";
import Link from "next/link";
import { ACTIVITIES, LODGINGS, DIFFICULTIES } from "@/lib/activities";
import { COUNTRY_NAMES, regionsFor, OTHER } from "@/lib/geo";
import ThemeToggle from "@/components/ThemeToggle";
import GearPicker from "@/components/GearPicker";

const MAX_FILE_BYTES = 4 * 1024 * 1024;

const emptyStage = () => ({
  title: "", description: "", lodgingType: "", lodgingText: "",
  gpx: "", fileName: "",
});

export default function Proposer() {
  const renderedAt = useRef(Date.now());
  const [form, setForm] = useState({
    title: "", activity: "", date: "",
    country: "", countryOther: "", region: "", regionOther: "",
    difficulty: "", description: "",
    adults: "", children: "",
    author: "", authorEmail: "", honeypot: "",
  });
  const [childAges, setChildAges] = useState([]);
  // Un élément de matériel vaut { label, emoji }. emoji reste vide tant que
  // le visiteur laisse le pictogramme déduit automatiquement du libellé.
  const [gear, setGear] = useState([{ label: "", emoji: "" }]);
  const [stages, setStages] = useState([emptyStage()]);
  const [identity, setIdentity] = useState(null);
  const [state, setState] = useState({ status: "idle", message: null });

  const set = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }));
  const setStage = (i, field, value) =>
    setStages((l) => l.map((s, k) => (k === i ? { ...s, [field]: value } : s)));

  // Le nombre de champs d'âge suit le nombre d'enfants annoncé
  useEffect(() => {
    const n = Math.max(0, Math.min(12, parseInt(form.children, 10) || 0));
    setChildAges((prev) => Array.from({ length: n }, (_, i) => prev[i] ?? ""));
  }, [form.children]);

  // Cohérence pseudo / email
  useEffect(() => {
    if (!form.author || !form.authorEmail.includes("@")) {
      setIdentity(null);
      return;
    }
    const timer = setTimeout(async () => {
      try {
        const res = await fetch("/api/identity/check", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ pseudo: form.author, email: form.authorEmail }),
        });
        const data = await res.json();
        setIdentity(data.ok ? null : data);
      } catch {
        setIdentity(null);
      }
    }, 600);
    return () => clearTimeout(timer);
  }, [form.author, form.authorEmail]);

  const readFile = async (i, file) => {
    if (!file) return;
    if (!file.name.toLowerCase().endsWith(".gpx")) {
      setState({ status: "error", message: "Seuls les fichiers .gpx sont acceptés." });
      return;
    }
    if (file.size > MAX_FILE_BYTES) {
      setState({ status: "error", message: `${file.name} dépasse 4 Mo.` });
      return;
    }
    setStage(i, "gpx", await file.text());
    setStage(i, "fileName", file.name);
    setState({ status: "idle", message: null });
  };

  const regions = regionsFor(form.country);

  const submit = async (e) => {
    e.preventDefault();
    if (stages.some((s) => !s.gpx)) {
      setState({ status: "error", message: "Chaque étape a besoin de son fichier GPX." });
      return;
    }
    setState({ status: "sending", message: null });

    const payload = {
      ...form,
      country: form.country === OTHER ? form.countryOther : form.country,
      region: form.region === OTHER ? form.regionOther : form.region,
      participants: {
        adults: parseInt(form.adults, 10) || 0,
        children: childAges.map((a) => parseInt(a, 10)).filter((n) => !Number.isNaN(n)),
        childrenCount: parseInt(form.children, 10) || 0,
      },
      gear: gear
        .map((g) => ({ label: (g.label || "").trim(), emoji: g.emoji || "" }))
        .filter((g) => g.label),
      stages,
      renderedAt: renderedAt.current,
    };

    try {
      const res = await fetch("/api/submissions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        setState({ status: "error", message: data.error || "Envoi impossible." });
        return;
      }
      setState({ status: "sent", message: data.message });
    } catch {
      setState({ status: "error", message: "Envoi impossible, réessaie plus tard." });
    }
  };

  if (state.status === "sent") {
    return (
      <>
        <Head><title>Proposition envoyée</title></Head>
        <div className="container narrow">
          <div className="site-header"><h1>Merci !</h1><p>{state.message}</p></div>
          <Link href="/" className="button-primary">Revenir au carnet</Link>
        </div>
      </>
    );
  }

  const multi = stages.length > 1;

  return (
    <>
      <Head>
        <title>Proposer une sortie</title>
        <meta name="robots" content="noindex" />
      </Head>

      <div className="container narrow">
        <div className="page-top">
          <Link href="/" className="back-link">← Retour au carnet</Link>
          <ThemeToggle />
        </div>

        <header className="site-header compact">
          <div className="header-main">
            <h1>Proposer une sortie</h1>
            <p>
              Partage un itinéraire que tu as parcouru. Il sera relu avant
              publication.
            </p>
          </div>
        </header>

        <form className="submit-form" onSubmit={submit}>
          <fieldset>
            <legend>La sortie</legend>

            <label className="field">
              <span>Titre <em>obligatoire</em></span>
              <input type="text" value={form.title} onChange={set("title")}
                required minLength={3} maxLength={120} />
            </label>

            <div className="field-row">
              <label className="field">
                <span>Activité <em>obligatoire</em></span>
                <select value={form.activity} onChange={set("activity")} required>
                  <option value="">Choisis une activité</option>
                  {Object.entries(ACTIVITIES).map(([key, meta]) => (
                    <option key={key} value={key}>{meta.emoji} {meta.label}</option>
                  ))}
                </select>
              </label>

              <label className="field">
                <span>Difficulté</span>
                <select value={form.difficulty} onChange={set("difficulty")}>
                  <option value="">Non précisée</option>
                  {DIFFICULTIES.map((d) => <option key={d} value={d}>{d}</option>)}
                </select>
              </label>

              <label className="field">
                <span>Date</span>
                <input type="date" value={form.date} onChange={set("date")} />
              </label>
            </div>

            <div className="field-row">
              <label className="field">
                <span>Pays <em>obligatoire</em></span>
                <select
                  value={form.country}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, country: e.target.value, region: "", regionOther: "" }))
                  }
                  required
                >
                  <option value="">Choisis un pays</option>
                  {COUNTRY_NAMES.map((c) => <option key={c} value={c}>{c}</option>)}
                  <option value={OTHER}>Autre…</option>
                </select>
              </label>

              {form.country === OTHER && (
                <label className="field">
                  <span>Précise le pays <em>obligatoire</em></span>
                  <input type="text" value={form.countryOther} onChange={set("countryOther")}
                    required maxLength={60} />
                </label>
              )}

              {form.country && form.country !== OTHER && (
                <label className="field">
                  <span>Région</span>
                  <select value={form.region} onChange={set("region")}>
                    <option value="">Non précisée</option>
                    {regions.map((r) => <option key={r} value={r}>{r}</option>)}
                    <option value={OTHER}>Autre…</option>
                  </select>
                </label>
              )}

              {(form.region === OTHER || form.country === OTHER) && (
                <label className="field">
                  <span>Précise la région</span>
                  <input type="text" value={form.regionOther} onChange={set("regionOther")}
                    maxLength={60} />
                </label>
              )}
            </div>

            <label className="field">
              <span>Description</span>
              <textarea value={form.description} onChange={set("description")}
                rows={4} maxLength={3000}
                placeholder="Ce qui rend cette sortie intéressante, les points d'attention…" />
            </label>
          </fieldset>

          <fieldset>
            <legend>Qui était là ?</legend>
            <p className="field-note">
              Facultatif, mais utile aux familles qui cherchent une sortie
              adaptée à l'âge de leurs enfants.
            </p>

            <div className="field-row">
              <label className="field narrow-field">
                <span>Adultes</span>
                <input type="number" min="0" max="12" value={form.adults}
                  onChange={set("adults")} placeholder="2" />
              </label>
              <label className="field narrow-field">
                <span>Enfants</span>
                <input type="number" min="0" max="12" value={form.children}
                  onChange={set("children")} placeholder="3" />
              </label>
            </div>

            {childAges.length > 0 && (
              <div className="ages-row">
                <span className="ages-label">Âge des enfants</span>
                <div className="ages-inputs">
                  {childAges.map((age, i) => (
                    <input key={i} type="number" min="0" max="25" value={age}
                      aria-label={`Âge de l'enfant ${i + 1}`}
                      onChange={(e) =>
                        setChildAges((l) => l.map((a, k) => (k === i ? e.target.value : a)))
                      } />
                  ))}
                </div>
              </div>
            )}
          </fieldset>

          <fieldset>
            <legend>Matériel</legend>
            <p className="field-note">
              Un élément par ligne. Le pictogramme est déduit de ce que tu
              écris. S'il ne convient pas, clique dessus pour en choisir un
              autre.
            </p>

            <GearPicker gear={gear} onChange={setGear} max={20} />
          </fieldset>

          <fieldset>
            <legend>{multi ? "Les étapes" : "La trace"}</legend>
            <p className="field-note">
              Une seule trace pour une sortie à la journée. Ajoute une étape par
              jour pour un itinéraire au long cours.
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

                {/* Les détails d'étape sont visibles dès la première, sans attendre */}
                <label className="field">
                  <span>Titre de l'étape</span>
                  <input type="text" value={stage.title} maxLength={120}
                    onChange={(e) => setStage(i, "title", e.target.value)}
                    placeholder={multi ? `Jour ${i + 1} : ...` : "Facultatif"} />
                </label>

                <label className="field">
                  <span>Description de l'étape</span>
                  <textarea value={stage.description} rows={2} maxLength={2000}
                    onChange={(e) => setStage(i, "description", e.target.value)} />
                </label>

                <div className="field-row">
                  <label className="field">
                    <span>Logement</span>
                    <select value={stage.lodgingType}
                      onChange={(e) => setStage(i, "lodgingType", e.target.value)}>
                      <option value="">Non précisé</option>
                      {Object.entries(LODGINGS).map(([key, meta]) => (
                        <option key={key} value={key}>{meta.emoji} {meta.label}</option>
                      ))}
                    </select>
                  </label>
                  <label className="field">
                    <span>Précisions sur le logement</span>
                    <input type="text" value={stage.lodgingText} maxLength={500}
                      onChange={(e) => setStage(i, "lodgingText", e.target.value)}
                      placeholder="Nom du lieu, réservation…" />
                  </label>
                </div>
              </div>
            ))}

            {stages.length < 12 && (
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
                <input type="text" value={form.author} onChange={set("author")}
                  required minLength={2} maxLength={40} placeholder="Affiché sur la sortie" />
              </label>
              <label className="field">
                <span>Email <em>obligatoire</em></span>
                <input type="email" value={form.authorEmail} onChange={set("authorEmail")}
                  required placeholder="jamais affiché" />
              </label>
            </div>

            {identity && (
              <p className="identity-warning">
                {identity.error}
                {identity.suggestion && (
                  <button type="button" className="link-button"
                    onClick={() => setForm((f) => ({ ...f, author: identity.suggestion }))}>
                    Utiliser « {identity.suggestion} »
                  </button>
                )}
              </p>
            )}

            <p className="field-note">
              Un lien de confirmation te sera envoyé. Ton adresse sert à te
              prévenir de la publication et des commentaires reçus, elle
              n'apparaît nulle part sur le site.{" "}
              <Link href="/mentions-legales">En savoir plus</Link>
            </p>
          </fieldset>

          <div className="honeypot" aria-hidden="true">
            <label>
              Ne pas remplir
              <input type="text" tabIndex={-1} autoComplete="off"
                value={form.honeypot} onChange={set("honeypot")} />
            </label>
          </div>

          {state.status === "error" && <p className="comment-error">{state.message}</p>}

          <div className="form-actions">
            <button type="submit" className="button-primary"
              disabled={state.status === "sending" || Boolean(identity)}>
              {state.status === "sending" ? "Envoi…" : "Proposer cette sortie"}
            </button>
          </div>
        </form>
      </div>
    </>
  );
}
