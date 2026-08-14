import { useState, useRef, useEffect } from "react";
import Head from "next/head";
import Link from "next/link";
import { useRouter } from "next/router";
import { ACTIVITIES, LODGINGS, DIFFICULTIES } from "@/lib/activities";
import { COUNTRY_NAMES, regionsFor, OTHER } from "@/lib/geo";
import { gearEmoji } from "@/lib/gear";
import { callApi, postJson } from "@/lib/api";
import ThemeToggle from "@/components/ThemeToggle";
import GearPicker from "@/components/GearPicker";

const MAX_FILE_BYTES = 4 * 1024 * 1024;
const MAX_STAGES = 30;
// Vercel plafonne le corps d'une requête à 4,5 Mo. Avec trente étapes possibles,
// le total des traces remplacées peut désormais y arriver : mieux vaut le dire
// ici qu'un envoi qui échoue sans explication une fois la page remplie. Les
// traces conservées ne comptent pas, elles ne repartent pas dans la requête.
const MAX_TOTAL_GPX_BYTES = 4 * 1024 * 1024;

/** Poids réel des traces envoyées, en octets. */
function totalGpxBytes(stages) {
  return stages.reduce((sum, s) => sum + new Blob([s.gpx || ""]).size, 0);
}

const emptyStage = () => ({
  source: null, title: "", description: "", lodgingType: "", lodgingText: "",
  gpx: "", fileName: "", currentFile: null, distanceKm: null,
});

/** Le pays est dans la liste, ou bien c'est un pays libre saisi au dépôt. */
function splitChoice(value, choices) {
  if (!value) return { choice: "", other: "" };
  return choices.includes(value) ? { choice: value, other: "" } : { choice: OTHER, other: value };
}

/** Sortie renvoyée par l'API vers l'état du formulaire. */
function toForm(sortie) {
  const country = splitChoice(sortie.country, COUNTRY_NAMES);
  const region = splitChoice(sortie.region, regionsFor(country.choice));

  const participants = sortie.participants || {};
  const ages = Array.isArray(participants.children) ? participants.children : [];
  const childrenCount = Array.isArray(participants.children)
    ? participants.children.length
    : participants.children || 0;

  return {
    form: {
      title: sortie.title || "",
      activity: sortie.activity || "",
      date: sortie.date || "",
      country: country.choice,
      countryOther: country.other,
      region: region.choice,
      regionOther: region.other,
      difficulty: sortie.difficulty || "",
      description: sortie.description || "",
      adults: participants.adults ? String(participants.adults) : "",
      children: childrenCount ? String(childrenCount) : "",
      honeypot: "",
    },
    childAges: ages.map((a) => String(a)),
    // Le pictogramme n'est retenu comme choix explicite que s'il diffère de
    // celui que le libellé produirait tout seul : sinon la palette afficherait
    // un choix figé là où l'auteur avait laissé faire la déduction.
    gear:
      (sortie.gear || []).map((item) => ({
        label: item.label || "",
        emoji: item.emoji && item.emoji !== gearEmoji(item.label) ? item.emoji : "",
      })) || [],
    stages: (sortie.stages || []).map((s) => ({
      source: s.source,
      title: s.title || "",
      description: s.description || "",
      lodgingType: s.lodgingType || "",
      lodgingText: s.lodgingText || "",
      gpx: "",
      fileName: "",
      currentFile: s.file,
      distanceKm: s.distanceKm,
    })),
  };
}

/** Demande d'un nouveau lien, quand celui reçu par email a expiré ou s'est perdu. */
function AskLink({ intro }) {
  const [email, setEmail] = useState("");
  const [state, setState] = useState({ status: "idle", message: null });

  const submit = async (e) => {
    e.preventDefault();
    setState({ status: "sending", message: null });
    const { ok, data } = await postJson("/api/submissions/edit-link", { email });
    setState({
      status: ok ? "sent" : "error",
      message: data.message || data.error || "Envoi impossible.",
    });
  };

  if (state.status === "sent") {
    return (
      <>
        <p className="form-notice">{state.message}</p>
        <Link href="/" className="button-primary">Revenir au carnet</Link>
      </>
    );
  }

  return (
    <form className="submit-form" onSubmit={submit}>
      <p className="field-note">{intro}</p>

      <label className="field">
        <span>Ton adresse email <em>obligatoire</em></span>
        <input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
          required placeholder="celle utilisée pour proposer la sortie" />
      </label>

      {state.status === "error" && <p className="comment-error">{state.message}</p>}

      <div className="form-actions">
        <button type="submit" className="button-primary" disabled={state.status === "sending"}>
          {state.status === "sending" ? "Envoi…" : "Recevoir un lien"}
        </button>
      </div>
    </form>
  );
}

export default function ModifierSortie() {
  const router = useRouter();
  const renderedAt = useRef(Date.now());

  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState({ status: "loading", message: null, expired: false });
  const [sortie, setSortie] = useState(null);

  const [form, setForm] = useState(null);
  const [childAges, setChildAges] = useState([]);
  const [gear, setGear] = useState([]);
  const [stages, setStages] = useState([]);
  const [state, setState] = useState({ status: "idle", message: null });

  const set = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }));
  const setStage = (i, field, value) =>
    setStages((l) => l.map((s, k) => (k === i ? { ...s, [field]: value } : s)));

  // Lecture de la sortie désignée par le jeton du lien reçu par email
  useEffect(() => {
    if (!router.isReady) return;

    const value = typeof router.query.token === "string" ? router.query.token : null;
    setToken(value);

    if (!value) {
      setLoading({ status: "no-token", message: null, expired: true });
      return;
    }

    callApi(`/api/submissions/edit?token=${encodeURIComponent(value)}`).then(({ ok, data }) => {
      if (!ok) {
        setLoading({
          status: "error",
          message: data.error || "Sortie introuvable.",
          expired: Boolean(data.expired),
        });
        return;
      }
      const initial = toForm(data.sortie);
      setSortie(data.sortie);
      setForm(initial.form);
      setChildAges(initial.childAges);
      setGear(initial.gear.length > 0 ? initial.gear : [{ label: "", emoji: "" }]);
      setStages(initial.stages.length > 0 ? initial.stages : [emptyStage()]);
      renderedAt.current = Date.now();
      setLoading({ status: "ready", message: null, expired: false });
    });
  }, [router.isReady, router.query.token]);

  // Le nombre de champs d'âge suit le nombre d'enfants annoncé
  useEffect(() => {
    if (!form) return;
    const n = Math.max(0, Math.min(12, parseInt(form.children, 10) || 0));
    setChildAges((prev) => Array.from({ length: n }, (_, i) => prev[i] ?? ""));
  }, [form?.children]);

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

  const submit = async (e) => {
    e.preventDefault();

    if (stages.some((s) => !s.gpx && s.source === null)) {
      setState({ status: "error", message: "Chaque étape a besoin de son fichier GPX." });
      return;
    }
    if (totalGpxBytes(stages) > MAX_TOTAL_GPX_BYTES) {
      setState({
        status: "error",
        message:
          "Le total des traces envoyées dépasse 4 Mo, l'envoi serait refusé. Remplace les traces en plusieurs fois, ou allège les fichiers les plus lourds.",
      });
      return;
    }
    setState({ status: "sending", message: null });

    const payload = {
      token,
      // Version ouverte : le serveur refuse l'envoi si la sortie a changé entre
      // temps, plutôt que de rattacher une trace conservée à la mauvaise étape.
      version: sortie.version,
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
      // Une étape dont le fichier n'a pas été remplacé garde sa trace : seul son
      // indice d'origine part, pas les points eux mêmes.
      stages: stages.map((s) => ({
        source: s.source,
        gpx: s.gpx || "",
        title: s.title,
        description: s.description,
        lodgingType: s.lodgingType,
        lodgingText: s.lodgingText,
      })),
      renderedAt: renderedAt.current,
    };

    const { ok, data } = await postJson("/api/submissions/edit", payload);
    if (!ok) {
      setState({ status: "error", message: data.error || "Envoi impossible." });
      return;
    }
    setState({ status: "sent", message: data.message });
  };

  const enTete = (titre) => (
    <div className="container narrow">
      <div className="page-top">
        <Link href="/" className="back-link">← Retour au carnet</Link>
        <ThemeToggle />
      </div>
      <header className="site-header compact">
        <div className="header-main"><h1>{titre}</h1></div>
      </header>
    </div>
  );

  if (loading.status === "loading") {
    return (
      <>
        <Head><title>Modifier ta sortie</title><meta name="robots" content="noindex" /></Head>
        {enTete("Modifier ta sortie")}
        <div className="container narrow"><p className="comment-loading">Chargement de ta sortie…</p></div>
      </>
    );
  }

  // Lien absent, expiré ou incorrect : on propose d'en recevoir un nouveau.
  if (loading.status !== "ready") {
    return (
      <>
        <Head><title>Modifier ta sortie</title><meta name="robots" content="noindex" /></Head>
        <div className="container narrow">
          <div className="page-top">
            <Link href="/" className="back-link">← Retour au carnet</Link>
            <ThemeToggle />
          </div>
          <header className="site-header compact">
            <div className="header-main">
              <h1>Modifier ta sortie</h1>
              {loading.message && <p>{loading.message}</p>}
            </div>
          </header>

          {loading.expired ? (
            <AskLink
              intro={
                "Indique l'adresse email avec laquelle tu as proposé ta sortie : " +
                "tu recevras un lien de modification pour chacune de tes sorties."
              }
            />
          ) : (
            <Link href="/" className="button-primary">Revenir au carnet</Link>
          )}
        </div>
      </>
    );
  }

  if (state.status === "sent") {
    return (
      <>
        <Head><title>Modification envoyée</title><meta name="robots" content="noindex" /></Head>
        {enTete("Merci !")}
        <div className="container narrow">
          <p className="form-notice">{state.message}</p>
          {sortie.url ? (
            <Link href={sortie.url} className="button-primary">Voir la sortie</Link>
          ) : (
            <Link href="/" className="button-primary">Revenir au carnet</Link>
          )}
        </div>
      </>
    );
  }

  const regions = regionsFor(form.country);
  const multi = stages.length > 1;

  return (
    <>
      <Head>
        <title>Modifier « {sortie.title} »</title>
        <meta name="robots" content="noindex" />
      </Head>

      <div className="container narrow">
        <div className="page-top">
          <Link href="/" className="back-link">← Retour au carnet</Link>
          <ThemeToggle />
        </div>

        <header className="site-header compact">
          <div className="header-main">
            <h1>Modifier ta sortie</h1>
            <p>
              {sortie.published
                ? "Ta correction est relue avant de remplacer la version en ligne, qui reste visible d'ici là."
                : "Ta sortie n'est pas encore publiée : ta correction est enregistrée tout de suite, la relecture aura lieu ensuite."}
            </p>
          </div>
        </header>

        {sortie.pendingSince && (
          <p className="form-notice">
            Une modification envoyée le{" "}
            {new Date(sortie.pendingSince).toLocaleDateString("fr-BE")} attend
            encore sa relecture. C'est elle qui s'affiche ci-dessous : la
            renvoyer remplacera simplement celle en attente.
          </p>
        )}

        {sortie.url && (
          <p className="field-note">
            Sortie en ligne : <Link href={sortie.url}>{sortie.url}</Link>
          </p>
        )}

        <form className="submit-form" onSubmit={submit}>
          <fieldset>
            <legend>La sortie</legend>

            <label className="field">
              <span>Titre <em>obligatoire</em></span>
              <input type="text" value={form.title} onChange={set("title")}
                required minLength={3} maxLength={120} />
              <small className="field-hint">
                L'adresse de la sortie ne change pas, même si tu changes le titre.
              </small>
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
                rows={10} maxLength={6000}
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
              Les traces déjà enregistrées sont conservées. Choisis un fichier
              seulement pour remplacer celle d'une étape.
            </p>

            {stages.map((stage, i) => (
              <div className="stage-fields" key={stage.currentFile || `nouvelle-${i}`}>
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
                  <span>
                    Fichier GPX {stage.source === null && <em>obligatoire</em>}
                  </span>
                  <input type="file" accept=".gpx" onChange={(e) => readFile(i, e.target.files?.[0])} />
                  {stage.fileName ? (
                    <small className="file-ok">✓ {stage.fileName} remplacera la trace actuelle</small>
                  ) : stage.currentFile ? (
                    <small className="field-hint">
                      Trace actuelle conservée
                      {stage.distanceKm ? ` (${stage.distanceKm} km)` : ""}
                    </small>
                  ) : null}
                </label>

                <label className="field">
                  <span>Titre de l'étape</span>
                  <input type="text" value={stage.title} maxLength={120}
                    onChange={(e) => setStage(i, "title", e.target.value)}
                    placeholder={multi ? `Jour ${i + 1} : ...` : "Facultatif"} />
                  {multi && (
                    <small className="field-hint">
                      Si tu écris toi-même « Jour {i + 1} » ou « Étape {i + 1} »,
                      le numéro n'est pas ajouté une deuxième fois.
                    </small>
                  )}
                </label>

                <label className="field">
                  <span>Description de l'étape</span>
                  <textarea value={stage.description} rows={7} maxLength={4000}
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

            {stages.length < MAX_STAGES && (
              <button type="button" className="button-secondary"
                onClick={() => setStages((l) => [...l, emptyStage()])}>
                + Ajouter une étape
              </button>
            )}
          </fieldset>

          <p className="field-note">
            Ton pseudo et ton adresse email ne changent pas ici : ils restent
            ceux du dépôt de la sortie. Pour les corriger, passe par la page{" "}
            <Link href="/contact">Contact</Link>.
          </p>

          <div className="honeypot" aria-hidden="true">
            <label>
              Ne pas remplir
              <input type="text" tabIndex={-1} autoComplete="off"
                value={form.honeypot} onChange={set("honeypot")} />
            </label>
          </div>

          {state.status === "error" && <p className="comment-error">{state.message}</p>}

          <div className="form-actions">
            <button type="submit" className="button-primary" disabled={state.status === "sending"}>
              {state.status === "sending" ? "Envoi…" : "Enregistrer les modifications"}
            </button>
          </div>
        </form>
      </div>
    </>
  );
}
