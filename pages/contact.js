import { useState, useRef } from "react";
import Head from "next/head";
import Link from "next/link";
import ThemeToggle from "@/components/ThemeToggle";
import { CONTACT_SUBJECTS as SUBJECTS } from "@/lib/contactSubjects";
import { postJson } from "@/lib/api";

export default function Contact() {
  const renderedAt = useRef(Date.now());
  const [form, setForm] = useState({
    subject: "", name: "", email: "", body: "", honeypot: "",
  });
  const [state, setState] = useState({ status: "idle", message: null });

  const set = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    setState({ status: "sending", message: null });

    const { ok, data } = await postJson("/api/contact", {
      ...form,
      renderedAt: renderedAt.current,
    });

    if (!ok) {
      setState({ status: "error", message: data.error || "Envoi impossible." });
      return;
    }
    setState({ status: "sent", message: data.message });
  };

  return (
    <>
      <Head>
        <title>Contact</title>
        <meta name="description" content="Signaler un problème, proposer une amélioration ou demander la modification d'un contenu." />
      </Head>

      <div className="container narrow">
        <div className="page-top">
          <Link href="/" className="back-link">← Retour au carnet</Link>
          <ThemeToggle />
        </div>

        <header className="site-header compact">
          <div className="header-main">
            <h1>Contact</h1>
            <p>
              Un souci, une idée, une demande de modification ? Écris ici. Un lien
              de confirmation te sera envoyé avant transmission, ce qui évite les
              envois automatisés.
            </p>
          </div>
        </header>

        {state.status === "sent" ? (
          <div className="comment-form-done">
            <p>{state.message}</p>
            <Link href="/" className="button-primary">Revenir au carnet</Link>
          </div>
        ) : (
          <form className="submit-form" onSubmit={submit}>
            <fieldset>
              <legend>Ton message</legend>

              <label className="field">
                <span>Motif <em>obligatoire</em></span>
                <select value={form.subject} onChange={set("subject")} required>
                  <option value="">Choisis un motif</option>
                  {Object.entries(SUBJECTS).map(([key, label]) => (
                    <option key={key} value={key}>{label}</option>
                  ))}
                </select>
              </label>

              <div className="field-row">
                <label className="field">
                  <span>Nom ou pseudo</span>
                  <input type="text" value={form.name} onChange={set("name")}
                    maxLength={60} placeholder="Facultatif" />
                </label>
                <label className="field">
                  <span>Email <em>obligatoire</em></span>
                  <input type="email" value={form.email} onChange={set("email")}
                    required placeholder="pour confirmer et te répondre" />
                </label>
              </div>

              <label className="field">
                <span>Message <em>obligatoire</em></span>
                <textarea value={form.body} onChange={set("body")} required
                  rows={7} maxLength={4000}
                  placeholder="Décris le plus précisément possible. Pour une demande de modification, indique le titre de la sortie ou le commentaire concerné." />
              </label>
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
              <button type="submit" className="button-primary" disabled={state.status === "sending"}>
                {state.status === "sending" ? "Envoi…" : "Envoyer"}
              </button>
              <p className="field-note">
                Ton adresse sert à confirmer l'envoi et à te répondre. Elle n'est
                ni publiée, ni transmise à des tiers.{" "}
                <Link href="/mentions-legales">En savoir plus</Link>
              </p>
            </div>
          </form>
        )}
      </div>
    </>
  );
}
