import { useState, useEffect, useRef, useMemo } from "react";
import Link from "next/link";

function formatDate(iso) {
  try {
    return new Date(iso).toLocaleDateString("fr-BE", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  } catch {
    return "";
  }
}

/**
 * Fil de commentaires d'une sortie.
 * Les commentaires liés à une étape sont regroupés sous celle-ci, les autres
 * sont rattachés à la sortie dans son ensemble.
 */
export default function Comments({ ride, stages = [] }) {
  const [comments, setComments] = useState(null);
  const [error, setError] = useState(null);

  const load = async () => {
    try {
      const res = await fetch(`/api/comments?ride=${encodeURIComponent(ride)}`);
      if (!res.ok) throw new Error();
      const data = await res.json();
      setComments(data.comments);
    } catch {
      setError("Les commentaires n'ont pas pu être chargés.");
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ride]);

  const byStage = useMemo(() => {
    const map = { __ride__: [] };
    for (const s of stages) map[s.title || s.file] = [];
    for (const c of comments || []) {
      const key = c.stage && map[c.stage] ? c.stage : "__ride__";
      map[key].push(c);
    }
    return map;
  }, [comments, stages]);

  const total = comments?.length ?? 0;

  return (
    <section className="comments" id="commentaires">
      <h2 className="section-title">
        Commentaires{total > 0 ? ` (${total})` : ""}
      </h2>

      {error && <p className="comment-error">{error}</p>}
      {comments === null && !error && <p className="comment-loading">Chargement…</p>}

      {comments !== null && (
        <>
          <Thread comments={byStage.__ride__} />

          {stages.length > 1 &&
            stages.map((s) => {
              const key = s.title || s.file;
              const list = byStage[key] || [];
              if (list.length === 0) return null;
              return (
                <div className="comment-stage-group" key={key}>
                  <h3 className="comment-stage-title">
                    <span className="stage-dot" style={{ background: s.color }} aria-hidden="true" />
                    {key}
                  </h3>
                  <Thread comments={list} />
                </div>
              );
            })}

          {total === 0 && (
            <p className="comment-empty">
              Aucun commentaire pour l'instant. Tu peux être le premier.
            </p>
          )}
        </>
      )}

      <CommentForm ride={ride} stages={stages} onSent={load} />
    </section>
  );
}

function Thread({ comments }) {
  if (!comments || comments.length === 0) return null;
  return (
    <ul className="comment-list">
      {comments.map((c) => (
        <li className="comment" key={c.id}>
          <div className="comment-head">
            <span className="comment-pseudo">{c.pseudo}</span>
            <time className="comment-date" dateTime={c.createdAt}>
              {formatDate(c.createdAt)}
            </time>
          </div>
          <p className="comment-body">{c.body}</p>
        </li>
      ))}
    </ul>
  );
}

function CommentForm({ ride, stages, onSent }) {
  const renderedAt = useRef(Date.now());
  const [form, setForm] = useState({
    pseudo: "",
    email: "",
    body: "",
    stage: "",
    honeypot: "",
  });
  const [state, setState] = useState({ status: "idle", message: null });

  const set = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    setState({ status: "sending", message: null });

    try {
      const res = await fetch("/api/comments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, ride, renderedAt: renderedAt.current }),
      });
      const data = await res.json();

      if (!res.ok) {
        setState({ status: "error", message: data.error || "Envoi impossible." });
        return;
      }

      setState({ status: "sent", message: data.message });
      setForm({ pseudo: "", email: "", body: "", stage: "", honeypot: "" });
      renderedAt.current = Date.now();
      onSent?.();
    } catch {
      setState({ status: "error", message: "Envoi impossible, réessaie plus tard." });
    }
  };

  if (state.status === "sent") {
    return (
      <div className="comment-form-done">
        <p>{state.message}</p>
        <button
          type="button"
          className="link-button"
          onClick={() => setState({ status: "idle", message: null })}
        >
          Écrire un autre commentaire
        </button>
      </div>
    );
  }

  return (
    <form className="comment-form" onSubmit={submit}>
      <h3>Laisser un commentaire</h3>

      <div className="field-row">
        <label className="field">
          <span>Pseudo</span>
          <input
            type="text"
            value={form.pseudo}
            onChange={set("pseudo")}
            required
            minLength={2}
            maxLength={40}
            placeholder="Comment veux-tu apparaître ?"
          />
        </label>

        <label className="field">
          <span>Email</span>
          <input
            type="email"
            value={form.email}
            onChange={set("email")}
            required
            placeholder="pour confirmer, jamais affiché"
          />
        </label>
      </div>

      {stages.length > 1 && (
        <label className="field">
          <span>À propos de</span>
          <select value={form.stage} onChange={set("stage")}>
            <option value="">La sortie dans son ensemble</option>
            {stages.map((s) => (
              <option key={s.file} value={s.title || s.file}>
                {s.title || s.file}
              </option>
            ))}
          </select>
        </label>
      )}

      <label className="field">
        <span>Message</span>
        <textarea
          value={form.body}
          onChange={set("body")}
          required
          rows={5}
          maxLength={4000}
          placeholder="Ton retour, une question, un conseil…"
        />
      </label>

      {/* Champ piège : masqué à l'écran, seuls les robots le remplissent */}
      <div className="honeypot" aria-hidden="true">
        <label>
          Ne pas remplir
          <input
            type="text"
            tabIndex={-1}
            autoComplete="off"
            value={form.honeypot}
            onChange={set("honeypot")}
          />
        </label>
      </div>

      {state.message && state.status === "error" && (
        <p className="comment-error">{state.message}</p>
      )}

      <div className="form-actions">
        <button type="submit" className="button-primary" disabled={state.status === "sending"}>
          {state.status === "sending" ? "Envoi…" : "Envoyer"}
        </button>
        <p className="field-note">
          Tu recevras un email pour confirmer. Ton adresse ne sera jamais publiée
          ni transmise, elle sert uniquement à cette confirmation.{" "}
          <Link href="/mentions-legales">En savoir plus</Link>
        </p>
      </div>
    </form>
  );
}
