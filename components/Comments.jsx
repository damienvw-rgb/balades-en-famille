import { useState, useEffect, useRef, useMemo } from "react";
import Link from "next/link";
import { stageLabel } from "@/lib/activities";

function formatDate(iso) {
  try {
    return new Date(iso).toLocaleDateString("fr-BE", {
      day: "numeric", month: "long", year: "numeric",
    });
  } catch {
    return "";
  }
}

export default function Comments({ ride, stages = [] }) {
  const [comments, setComments] = useState(null);
  const [error, setError] = useState(null);
  const [replyTo, setReplyTo] = useState(null);
  const [showForm, setShowForm] = useState(false);

  const load = async () => {
    try {
      const res = await fetch(`/api/comments?ride=${encodeURIComponent(ride)}`);
      if (!res.ok) throw new Error();
      setComments((await res.json()).comments);
    } catch {
      setError("Les commentaires n'ont pas pu être chargés.");
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ride]);

  // Les réponses se rangent sous leur message d'origine
  const threads = useMemo(() => {
    const roots = (comments || []).filter((c) => !c.parentId);
    const replies = (comments || []).filter((c) => c.parentId);
    return roots.map((root) => ({
      ...root,
      replies: replies.filter((r) => r.parentId === root.id),
    }));
  }, [comments]);

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
          {threads.length === 0 && (
            <p className="comment-empty">
              Aucun commentaire pour l'instant. Tu peux être le premier.
            </p>
          )}

          <ul className="comment-list">
            {threads.map((thread) => (
              <li key={thread.id}>
                <Comment comment={thread} onReply={() => { setReplyTo(thread); setShowForm(true); }} />

                {thread.replies.length > 0 && (
                  <ul className="comment-replies">
                    {thread.replies.map((r) => (
                      <li key={r.id}>
                        <Comment
                          comment={r}
                          isReply
                          onReply={() => { setReplyTo(thread); setShowForm(true); }}
                        />
                      </li>
                    ))}
                  </ul>
                )}
              </li>
            ))}
          </ul>
        </>
      )}

      {showForm ? (
        <CommentForm
          ride={ride}
          stages={stages}
          replyTo={replyTo}
          onCancel={() => { setShowForm(false); setReplyTo(null); }}
          onSent={load}
        />
      ) : (
        <button type="button" className="button-primary" onClick={() => setShowForm(true)}>
          Laisser un commentaire
        </button>
      )}
    </section>
  );
}

function Comment({ comment, isReply = false, onReply }) {
  return (
    <article className={`comment${isReply ? " is-reply" : ""}`}>
      <div className="comment-head">
        <span className="comment-pseudo">{comment.pseudo}</span>
        {comment.stage && !isReply && (
          <span className="comment-stage-tag">{comment.stage}</span>
        )}
        <time className="comment-date" dateTime={comment.createdAt}>
          {formatDate(comment.createdAt)}
        </time>
      </div>
      <p className="comment-body">{comment.body}</p>
      <button type="button" className="link-button" onClick={onReply}>
        Répondre
      </button>
    </article>
  );
}

function CommentForm({ ride, stages, replyTo, onCancel, onSent }) {
  const renderedAt = useRef(Date.now());
  const [form, setForm] = useState({
    pseudo: "", email: "", body: "", stage: "", honeypot: "",
  });
  const [identity, setIdentity] = useState(null);
  const [state, setState] = useState({ status: "idle", message: null });

  const set = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }));

  // Cohérence pseudo / email vérifiée pendant la saisie, sans attendre l'envoi
  useEffect(() => {
    if (!form.pseudo || !form.email.includes("@")) {
      setIdentity(null);
      return;
    }
    const timer = setTimeout(async () => {
      try {
        const res = await fetch("/api/identity/check", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ pseudo: form.pseudo, email: form.email }),
        });
        const data = await res.json();
        // On garde aussi la réponse quand elle est bonne mais annonce un
        // changement de pseudo : ce n'est pas une erreur, c'est un avertissement.
        setIdentity(data.ok && !data.rename ? null : data);
      } catch {
        setIdentity(null);
      }
    }, 600);
    return () => clearTimeout(timer);
  }, [form.pseudo, form.email]);

  // Seul un pseudo pris par quelqu'un d'autre empêche l'envoi
  const blocked = Boolean(identity && !identity.ok);

  const submit = async (e) => {
    e.preventDefault();
    setState({ status: "sending", message: null });
    try {
      const res = await fetch("/api/comments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          ride,
          parentId: replyTo?.id || null,
          renderedAt: renderedAt.current,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setState({ status: "error", message: data.error || "Envoi impossible." });
        return;
      }
      setState({ status: "sent", message: data.message });
      onSent?.();
    } catch {
      setState({ status: "error", message: "Envoi impossible, réessaie plus tard." });
    }
  };

  if (state.status === "sent") {
    return (
      <div className="comment-form-done">
        <p>{state.message}</p>
        <button type="button" className="link-button" onClick={onCancel}>Fermer</button>
      </div>
    );
  }

  return (
    <form className="comment-form" onSubmit={submit}>
      <div className="comment-form-head">
        <h3>{replyTo ? `Répondre à ${replyTo.pseudo}` : "Laisser un commentaire"}</h3>
        <button type="button" className="link-button" onClick={onCancel}>Annuler</button>
      </div>

      {replyTo && (
        <p className="reply-context">
          En réponse à : <em>{replyTo.body.slice(0, 120)}{replyTo.body.length > 120 ? "…" : ""}</em>
        </p>
      )}

      <div className="field-row">
        <label className="field">
          <span>Pseudo</span>
          <input type="text" value={form.pseudo} onChange={set("pseudo")}
            required minLength={2} maxLength={40} placeholder="Comment veux-tu apparaître ?" />
        </label>

        <label className="field">
          <span>Email</span>
          <input type="email" value={form.email} onChange={set("email")}
            required placeholder="pour confirmer, jamais affiché" />
        </label>
      </div>

      {identity && (
        <p className={identity.ok ? "identity-notice" : "identity-warning"}>
          {identity.ok ? identity.notice : identity.error}
          {identity.suggestion && (
            <button type="button" className="link-button"
              onClick={() => setForm((f) => ({ ...f, pseudo: identity.suggestion }))}>
              {identity.ok
                ? `Garder « ${identity.suggestion} »`
                : `Utiliser « ${identity.suggestion} »`}
            </button>
          )}
        </p>
      )}

      {!replyTo && stages.length > 1 && (
        <label className="field">
          <span>À propos de</span>
          <select value={form.stage} onChange={set("stage")}>
            <option value="">La sortie dans son ensemble</option>
            {/* Le libellé porte le numéro d'étape, la valeur enregistrée reste
                le titre : elle sert d'étiquette aux commentaires déjà publiés,
                la renommer les désaccorderait des nouveaux. */}
            {stages.map((s, i) => (
              <option key={s.file} value={s.title || s.file}>
                {stageLabel(s.title, i, stages.length)}
              </option>
            ))}
          </select>
        </label>
      )}

      <label className="field">
        <span>Message</span>
        <textarea value={form.body} onChange={set("body")} required rows={5} maxLength={4000}
          placeholder="Ton retour, une question, un conseil…" />
      </label>

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
          disabled={state.status === "sending" || blocked}>
          {state.status === "sending" ? "Envoi…" : "Envoyer"}
        </button>
        <p className="field-note">
          Tu recevras un email pour confirmer. Ton adresse ne sera jamais publiée.
          Elle sert à cette confirmation et à te prévenir des réponses.{" "}
          <Link href="/mentions-legales">En savoir plus</Link>
        </p>
      </div>
    </form>
  );
}
