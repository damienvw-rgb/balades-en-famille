import { useState, useEffect } from "react";
import Head from "next/head";
import Link from "next/link";
import { getActivity, formatPlace } from "@/lib/activities";
import ThemeToggle from "@/components/ThemeToggle";
import { callApi, postJson } from "@/lib/api";

export default function Admin() {
  const [auth, setAuth] = useState({ checked: false, ok: false, configured: true, missing: [] });
  const [password, setPassword] = useState("");
  const [error, setError] = useState(null);

  useEffect(() => {
    callApi("/api/admin/login").then(({ ok, data }) =>
      setAuth({
        checked: true,
        ok: Boolean(data.authenticated),
        configured: ok ? data.configured : false,
        missing: data.missing || (ok ? [] : ["(réponse serveur illisible)"]),
      })
    );
  }, []);

  const login = async (e) => {
    e.preventDefault();
    setError(null);
    const { ok, data } = await postJson("/api/admin/login", { password });
    if (!ok) return setError(data.error || "Connexion impossible.");
    setAuth((a) => ({ ...a, ok: true }));
    setPassword("");
  };

  const logout = async () => {
    await fetch("/api/admin/login", { method: "DELETE" });
    setAuth((a) => ({ ...a, ok: false }));
  };

  if (!auth.checked) return null;

  return (
    <>
      <Head>
        <title>Administration</title>
        <meta name="robots" content="noindex, nofollow" />
      </Head>

      <div className="container narrow">
        <div className="page-top">
          <Link href="/" className="back-link">← Retour au carnet</Link>
          <ThemeToggle />
        </div>

        <header className="site-header compact">
          <div className="header-main"><h1>Administration</h1></div>
        </header>

        {!auth.configured ? (
          <div className="empty-state">
            <p>
              Il manque {auth.missing.length > 1 ? "des variables" : "une variable"} d'environnement
              côté serveur :
            </p>
            <ul className="admin-missing">
              {auth.missing.map((name) => <li key={name}><code>{name}</code></li>)}
            </ul>
            <p>
              Ajoute-{auth.missing.length > 1 ? "les" : "la"} dans Vercel (Settings →
              Environment Variables), puis <strong>relance un déploiement</strong> :
              les variables ne s'appliquent qu'au déploiement suivant, c'est la
              cause la plus fréquente.
            </p>
          </div>
        ) : !auth.ok ? (
          <form className="submit-form" onSubmit={login}>
            <label className="field">
              <span>Mot de passe</span>
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)}
                required autoFocus autoComplete="current-password" />
            </label>
            {error && <p className="comment-error">{error}</p>}
            <button type="submit" className="button-primary">Se connecter</button>
          </form>
        ) : (
          <>
            <div className="admin-bar">
              <button type="button" className="link-button" onClick={logout}>Se déconnecter</button>
            </div>
            <Submissions />
            <Messages />
            <CommentModeration />
          </>
        )}
      </div>
    </>
  );
}

function Submissions() {
  const [items, setItems] = useState(null);
  const [revisions, setRevisions] = useState([]);
  const [busy, setBusy] = useState(null);
  const [notice, setNotice] = useState(null);

  const load = () =>
    callApi("/api/admin/submissions").then(({ data }) => {
      setItems(data.submissions || []);
      setRevisions(data.revisions || []);
    });

  useEffect(() => { load(); }, []);

  const act = async (submissionId, action, extra = {}) => {
    setBusy(submissionId);
    setNotice(null);
    const { ok, data } = await postJson("/api/admin/submissions", { action, submissionId, ...extra });
    setBusy(null);

    // Une correction acceptée remplace la version en ligne : elle ne paraîtra
    // qu'après reconstruction du site, comme une publication.
    if (ok && action === "applyEdit") {
      setNotice(
        data.rebuild?.triggered
          ? "Modification acceptée. Le site se reconstruit, la sortie corrigée sera en ligne dans une minute ou deux."
          : "Modification acceptée. Aucun deploy hook configuré : elle paraîtra au prochain déploiement."
      );
    }

    if (ok && action === "discardEdit") {
      setNotice("Modification écartée. La sortie reste en ligne dans sa version précédente.");
    }

    if (ok && action === "approve") {
      setNotice(
        data.rebuild?.triggered
          ? "Sortie approuvée. Le site se reconstruit, elle sera en ligne dans une minute ou deux."
          : "Sortie approuvée. Aucun deploy hook configuré : elle apparaîtra au prochain déploiement."
      );
    }

    // Retirer une sortie déjà publiée demande une reconstruction : les pages du
    // carnet sont statiques, elles restent en ligne tant que le site n'a pas
    // été rebâti. On le dit clairement plutôt que de laisser croire que la
    // suppression est immédiate.
    if (ok && (action === "delete" || action === "reject")) {
      const verbe = action === "delete" ? "supprimée" : "refusée";
      if (data.rebuild?.reason === "jamais-publiee") {
        setNotice(`Proposition ${verbe}. Elle n'avait jamais été publiée, le carnet est inchangé.`);
      } else if (data.rebuild?.triggered) {
        setNotice(
          `Sortie ${verbe}. Le site se reconstruit, elle disparaîtra du carnet dans une minute ou deux.`
        );
      } else {
        setNotice(
          `Sortie ${verbe}. Aucun deploy hook configuré : elle reste visible dans le carnet jusqu'au prochain déploiement.`
        );
      }
    }

    load();
  };

  if (items === null) return <p className="comment-loading">Chargement des propositions…</p>;

  const pending = items.filter((s) => s.status === "pending");
  const others = items.filter((s) => s.status !== "pending");

  return (
    <section className="admin-section">
      <h2 className="section-title">
        Sorties proposées{pending.length > 0 ? ` (${pending.length} en attente)` : ""}
        {revisions.length > 0
          ? ` · ${revisions.length} modification${revisions.length > 1 ? "s" : ""} à relire`
          : ""}
      </h2>

      {notice && <p className="admin-notice">{notice}</p>}

      {revisions.map((r) => {
        const source = items.find((s) => s.id === r.submissionId);
        const km = Math.round(r.stages.reduce((t, x) => t + (x.distanceKm || 0), 0) * 10) / 10;

        return (
          <article className="admin-card" key={r.submissionId}>
            <div className="card-top">
              <span className="admin-status is-pending">modification proposée</span>
            </div>

            <h3>{r.info.title}</h3>
            {source && source.info.title !== r.info.title && (
              <p className="admin-meta">Titre en ligne : {source.info.title}</p>
            )}
            <p className="admin-meta">
              {km} km · {r.stages.length} étape{r.stages.length > 1 ? "s" : ""} · par {r.author} ·{" "}
              {new Date(r.createdAt).toLocaleDateString("fr-BE")}
            </p>
            {r.info.description && <p className="admin-desc">{r.info.description}</p>}

            <ul className="admin-stage-list">
              {r.stages.map((st, i) => (
                <li key={i}>
                  {st.title || `Trace ${i + 1}`} · {st.distanceKm} km · +{st.elevationGain} m
                  {st.lodging?.type ? ` · ${st.lodging.type}` : ""}
                </li>
              ))}
            </ul>

            <p className="admin-meta">
              Version en ligne : <a href={`/rides/${r.slug}`} target="_blank" rel="noreferrer">
                /rides/{r.slug}
              </a>
            </p>

            <div className="admin-actions">
              <button type="button" className="button-primary" disabled={busy === r.submissionId}
                onClick={() => act(r.submissionId, "applyEdit")}>
                Accepter la modification
              </button>
              <button type="button" className="button-secondary" disabled={busy === r.submissionId}
                onClick={() => act(r.submissionId, "discardEdit")}>
                Écarter
              </button>
            </div>
          </article>
        );
      })}

      {pending.length === 0 && <p className="comment-empty">Aucune proposition en attente.</p>}

      {pending.map((s) => {
        const activity = getActivity(s.info.activity);
        const place = formatPlace(s.info.country, s.info.region);
        const km = Math.round(s.stages.reduce((t, x) => t + (x.distanceKm || 0), 0) * 10) / 10;

        return (
          <article className="admin-card" key={s.id}>
            <div className="card-top">
              <span className="activity-badge">
                <span aria-hidden="true">{activity.emoji}</span>{activity.label}
              </span>
              {s.stages.length > 1 && <span className="stage-badge">{s.stages.length} étapes</span>}
            </div>

            <h3>{s.info.title}</h3>
            {place && <p className="admin-meta">{place}</p>}
            <p className="admin-meta">
              {km} km · proposée par {s.author} · {new Date(s.createdAt).toLocaleDateString("fr-BE")}
            </p>
            {s.info.description && <p className="admin-desc">{s.info.description}</p>}

            <ul className="admin-stage-list">
              {s.stages.map((st, i) => (
                <li key={i}>
                  {st.title || `Trace ${i + 1}`} · {st.distanceKm} km · +{st.elevationGain} m
                  {st.lodging?.type ? ` · ${st.lodging.type}` : ""}
                </li>
              ))}
            </ul>

            <p className="admin-meta">
              Adresse publique : <code>/rides/{s.slug}</code>
            </p>

            <div className="admin-actions">
              <button type="button" className="button-primary" disabled={busy === s.id}
                onClick={() => act(s.id, "approve", { slug: s.slug })}>
                Approuver et publier
              </button>
              <button type="button" className="button-secondary" disabled={busy === s.id}
                onClick={() => act(s.id, "reject")}>
                Refuser
              </button>
            </div>
          </article>
        );
      })}

      {others.length > 0 && (
        <details className="admin-details">
          <summary>Propositions traitées ({others.length})</summary>
          <ul className="admin-plain-list">
            {others.map((s) => (
              <li key={s.id}>
                <span className={`admin-status is-${s.status}`}>{s.status}</span>
                {s.info.title}
                <button type="button" className="link-button" onClick={() => act(s.id, "delete")}>
                  Supprimer
                </button>
              </li>
            ))}
          </ul>
        </details>
      )}
    </section>
  );
}

function CommentModeration() {
  const [items, setItems] = useState(null);

  const load = () =>
    callApi("/api/admin/comments").then(({ data }) => setItems(data.comments || []));

  useEffect(() => { load(); }, []);

  const act = async (comment, action) => {
    await postJson("/api/admin/comments", { action, ride: comment.ride, commentId: comment.id });
    load();
  };

  if (items === null) return <p className="comment-loading">Chargement des commentaires…</p>;

  return (
    <section className="admin-section">
      <h2 className="section-title">Commentaires ({items.length})</h2>

      {items.length === 0 && <p className="comment-empty">Aucun commentaire.</p>}

      {items.map((c) => (
        <article className="admin-card" key={c.id}>
          <div className="comment-head">
            <span className="comment-pseudo">{c.pseudo}</span>
            <span className={`admin-status is-${c.status}`}>{c.status}</span>
            <time className="comment-date">{new Date(c.createdAt).toLocaleDateString("fr-BE")}</time>
          </div>
          <p className="admin-meta">
            /rides/{c.ride}{c.stage ? ` · ${c.stage}` : ""}
          </p>
          <p className="comment-body">{c.body}</p>
          <div className="admin-actions">
            {c.status === "published" && (
              <button type="button" className="button-secondary" onClick={() => act(c, "unpublish")}>
                Masquer
              </button>
            )}
            <button type="button" className="button-secondary" onClick={() => act(c, "delete")}>
              Supprimer
            </button>
          </div>
        </article>
      ))}
    </section>
  );
}

function Messages() {
  const [items, setItems] = useState(null);

  const load = () =>
    fetch("/api/admin/messages")
      .then((r) => r.json())
      .then((d) => setItems(d.messages || []))
      .catch(() => setItems([]));

  useEffect(() => { load(); }, []);

  const remove = async (messageId) => {
    await fetch("/api/admin/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "delete", messageId }),
    });
    load();
  };

  if (items === null) return null;

  return (
    <section className="admin-section">
      <h2 className="section-title">Messages de contact ({items.length})</h2>
      {items.length === 0 && <p className="comment-empty">Aucun message.</p>}

      {items.map((m) => (
        <article className="admin-card" key={m.id}>
          <div className="comment-head">
            <span className="comment-pseudo">{m.subjectLabel}</span>
            <time className="comment-date">
              {new Date(m.createdAt).toLocaleDateString("fr-BE")}
            </time>
          </div>
          <p className="admin-meta">
            {m.name || "sans nom"} · {m.email}
          </p>
          <p className="comment-body">{m.body}</p>
          <div className="admin-actions">
            <a className="button-secondary" href={`mailto:${m.email}?subject=Re: ${encodeURIComponent(m.subjectLabel)}`}>
              Répondre
            </a>
            <button type="button" className="button-secondary" onClick={() => remove(m.id)}>
              Supprimer
            </button>
          </div>
        </article>
      ))}
    </section>
  );
}
