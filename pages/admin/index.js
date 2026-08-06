import { useState, useEffect } from "react";
import Head from "next/head";
import Link from "next/link";
import { getActivity, formatPlace } from "@/lib/activities";

export default function Admin() {
  const [auth, setAuth] = useState({ checked: false, ok: false, configured: true });
  const [password, setPassword] = useState("");
  const [error, setError] = useState(null);

  useEffect(() => {
    fetch("/api/admin/login")
      .then((r) => r.json())
      .then((d) => setAuth({ checked: true, ok: d.authenticated, configured: d.configured }))
      .catch(() => setAuth({ checked: true, ok: false, configured: true }));
  }, []);

  const login = async (e) => {
    e.preventDefault();
    setError(null);
    const res = await fetch("/api/admin/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    });
    const data = await res.json();
    if (!res.ok) return setError(data.error);
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
        <Link href="/" className="back-link">← Retour au carnet</Link>

        <header className="site-header">
          <h1>Administration</h1>
        </header>

        {!auth.configured ? (
          <p className="empty-state">
            La variable ADMIN_PASSWORD n'est pas définie sur le serveur.
            Ajoute-la dans Vercel puis redéploie.
          </p>
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
            <CommentModeration />
          </>
        )}
      </div>
    </>
  );
}

function Submissions() {
  const [items, setItems] = useState(null);
  const [busy, setBusy] = useState(null);
  const [notice, setNotice] = useState(null);

  const load = () =>
    fetch("/api/admin/submissions")
      .then((r) => r.json())
      .then((d) => setItems(d.submissions || []))
      .catch(() => setItems([]));

  useEffect(() => { load(); }, []);

  const act = async (submissionId, action, extra = {}) => {
    setBusy(submissionId);
    setNotice(null);
    const res = await fetch("/api/admin/submissions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, submissionId, ...extra }),
    });
    const data = await res.json();
    setBusy(null);

    if (res.ok && action === "approve") {
      setNotice(
        data.rebuild?.triggered
          ? "Sortie approuvée. Le site se reconstruit, elle sera en ligne dans une minute ou deux."
          : "Sortie approuvée. Aucun deploy hook configuré : elle apparaîtra au prochain déploiement."
      );
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
      </h2>

      {notice && <p className="admin-notice">{notice}</p>}

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
    fetch("/api/admin/comments")
      .then((r) => r.json())
      .then((d) => setItems(d.comments || []))
      .catch(() => setItems([]));

  useEffect(() => { load(); }, []);

  const act = async (comment, action) => {
    await fetch("/api/admin/comments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, ride: comment.ride, commentId: comment.id }),
    });
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
