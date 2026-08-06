import { useState, useRef } from "react";
import Head from "next/head";
import Link from "next/link";
import { ACTIVITIES, LODGINGS } from "@/lib/activities";
import ContourDivider from "@/components/ContourDivider";

const MAX_FILE_BYTES = 4 * 1024 * 1024;

const emptyStage = () => ({
  title: "",
  description: "",
  lodgingType: "",
  lodgingText: "",
  gpx: "",
  fileName: "",
});

export default function Proposer() {
  const renderedAt = useRef(Date.now());
  const [form, setForm] = useState({
    title: "",
    activity: "velo",
    date: "",
    country: "",
    region: "",
    difficulty: "",
    description: "",
    author: "",
    authorEmail: "",
    honeypot: "",
  });
  const [stages, setStages] = useState([emptyStage()]);
  const [state, setState] = useState({ status: "idle", message: null });

  const set = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }));

  const setStage = (i, field, value) =>
    setStages((list) => list.map((s, k) => (k === i ? { ...s, [field]: value } : s)));

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
    const text = await file.text();
    setStage(i, "gpx", text);
    setStage(i, "fileName", file.name);
    setState({ status: "idle", message: null });
  };

  const submit = async (e) => {
    e.preventDefault();

    if (stages.some((s) => !s.gpx)) {
      setState({ status: "error", message: "Chaque étape a besoin de son fichier GPX." });
      return;
    }

    setState({ status: "sending", message: null });

    try {
      const res = await fetch("/api/submissions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, stages, renderedAt: renderedAt.current }),
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
          <div className="site-header">
            <h1>Merci !</h1>
            <p>{state.message}</p>
            <ContourDivider />
          </div>
          <Link href="/" className="button-primary">Revenir au carnet</Link>
        </div>
      </>
    );
  }

  return (
    <>
      <Head>
        <title>Proposer une sortie</title>
        <meta name="robots" content="noindex" />
      </Head>

      <div className="container narrow">
        <Link href="/" className="back-link">← Retour au carnet</Link>

        <header className="site-header">
          <h1>Proposer une sortie</h1>
          <p>
            Partage un itinéraire que tu as parcouru. Il sera relu avant
            publication. Seuls le titre, ton pseudo, ton email et un fichier GPX
            sont obligatoires.
          </p>
          <ContourDivider />
        </header>

        <form className="submit-form" onSubmit={submit}>
          <fieldset>
            <legend>La sortie</legend>

            <label className="field">
              <span>Titre <em>obligatoire</em></span>
              <input type="text" value={form.title} onChange={set("title")} required minLength={3} maxLength={120} />
            </label>

            <div className="field-row">
              <label className="field">
                <span>Activité</span>
                <select value={form.activity} onChange={set("activity")}>
                  {Object.entries(ACTIVITIES).map(([key, meta]) => (
                    <option key={key} value={key}>{meta.emoji} {meta.label}</option>
                  ))}
                </select>
              </label>

              <label className="field">
                <span>Date</span>
                <input type="date" value={form.date} onChange={set("date")} />
              </label>
            </div>

            <div className="field-row">
              <label className="field">
                <span>Pays</span>
                <input type="text" value={form.country} onChange={set("country")} placeholder="Belgique" maxLength={60} />
              </label>
              <label className="field">
                <span>Région</span>
                <input type="text" value={form.region} onChange={set("region")} placeholder="Ardennes" maxLength={60} />
              </label>
              <label className="field">
                <span>Difficulté</span>
                <input type="text" value={form.difficulty} onChange={set("difficulty")} placeholder="Facile" maxLength={40} />
              </label>
            </div>

            <label className="field">
              <span>Description</span>
              <textarea value={form.description} onChange={set("description")} rows={4} maxLength={3000}
                placeholder="Ce qui rend cette sortie intéressante, les points d'attention…" />
            </label>
          </fieldset>

          <fieldset>
            <legend>Les étapes</legend>
            <p className="field-note">
              Une seule étape pour une sortie à la journée. Ajoutes-en autant que
              de jours pour un itinéraire au long cours.
            </p>

            {stages.map((stage, i) => (
              <div className="stage-fields" key={i}>
                <div className="stage-fields-head">
                  <h4>{stages.length > 1 ? `Étape ${i + 1}` : "Trace GPX"}</h4>
                  {stages.length > 1 && (
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

                {stages.length > 1 && (
                  <>
                    <label className="field">
                      <span>Titre de l'étape</span>
                      <input type="text" value={stage.title} maxLength={120}
                        onChange={(e) => setStage(i, "title", e.target.value)}
                        placeholder={`Jour ${i + 1} : ...`} />
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
                        <span>Précisions</span>
                        <input type="text" value={stage.lodgingText} maxLength={500}
                          onChange={(e) => setStage(i, "lodgingText", e.target.value)}
                          placeholder="Nom du lieu, réservation…" />
                      </label>
                    </div>
                  </>
                )}
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
                <input type="text" value={form.author} onChange={set("author")} required minLength={2} maxLength={40}
                  placeholder="Affiché sur la sortie" />
              </label>
              <label className="field">
                <span>Email <em>obligatoire</em></span>
                <input type="email" value={form.authorEmail} onChange={set("authorEmail")} required
                  placeholder="jamais affiché" />
              </label>
            </div>
            <p className="field-note">
              Ton adresse sert à te prévenir de la publication et des
              commentaires reçus. Elle n'apparaît nulle part sur le site. Un lien
              de confirmation te sera envoyé avant transmission.{" "}
              <Link href="/mentions-legales">En savoir plus</Link>
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
      </div>
    </>
  );
}
