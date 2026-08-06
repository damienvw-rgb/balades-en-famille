import { useEffect, useState } from "react";

/**
 * Bascule clair/sombre.
 * La préférence est conservée dans localStorage, pas dans un cookie : rien
 * n'est envoyé au serveur, c'est un réglage d'affichage purement local qui
 * ne demande donc aucun consentement.
 */
export default function ThemeToggle() {
  const [theme, setTheme] = useState(null);

  useEffect(() => {
    setTheme(document.documentElement.dataset.theme || "light");
  }, []);

  const toggle = () => {
    const next = theme === "dark" ? "light" : "dark";
    document.documentElement.dataset.theme = next;
    try {
      localStorage.setItem("theme", next);
    } catch {
      /* navigation privée stricte */
    }
    setTheme(next);
  };

  if (theme === null) return <span className="theme-toggle-placeholder" aria-hidden="true" />;

  const dark = theme === "dark";

  return (
    <button
      type="button"
      className="theme-toggle"
      onClick={toggle}
      aria-label={dark ? "Passer en thème clair" : "Passer en thème sombre"}
      title={dark ? "Thème clair" : "Thème sombre"}
    >
      <span aria-hidden="true">{dark ? "☀" : "☾"}</span>
    </button>
  );
}
