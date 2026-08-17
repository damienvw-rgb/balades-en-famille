import { useEffect, useRef, useState } from "react";

/**
 * Bouton « ajouter aux favoris ».
 *
 * Attention à ce que ce bouton ne fait pas : aucun navigateur actuel n'autorise
 * une page à poser elle même un signet. Les vieilles interfaces qui le
 * permettaient (window.external.AddFavorite, window.sidebar.addPanel) ont été
 * retirées pour éviter que n'importe quel site s'invite dans la barre de
 * favoris, et rien ne les a remplacées. Le bouton rappelle donc simplement le
 * geste à faire, adapté à l'appareil du visiteur.
 *
 * Rien n'est enregistré, ni en local ni sur le serveur : ce bouton n'affiche
 * qu'un texte, il ne demande donc aucun consentement.
 */

/** Conseil adapté à l'appareil, calculé au clic donc toujours côté navigateur. */
function conseilFavoris() {
  const ua = typeof navigator === "undefined" ? "" : navigator.userAgent || "";

  // Un iPad récent se présente comme un Mac : l'écran tactile fait la différence.
  const appleTactile =
    /iPad|iPhone|iPod/.test(ua) || (/Mac/.test(ua) && navigator.maxTouchPoints > 1);

  if (appleTactile) {
    return "Touche le bouton Partager de ton navigateur, puis « Ajouter aux favoris » ou « Sur l'écran d'accueil ».";
  }
  if (/Android/i.test(ua)) {
    return "Ouvre le menu de ton navigateur, les trois points, puis touche l'étoile.";
  }
  return `Appuie sur ${/Mac/.test(ua) ? "⌘" : "Ctrl"} + D pour garder le site sous la main.`;
}

export default function BookmarkButton() {
  const [conseil, setConseil] = useState(null);
  const zone = useRef(null);

  const ouvert = conseil !== null;

  // Fermeture au clic à côté ou à la touche Échap, comme n'importe quelle bulle.
  useEffect(() => {
    if (!ouvert) return;

    const auClic = (e) => {
      if (zone.current && !zone.current.contains(e.target)) setConseil(null);
    };
    const auClavier = (e) => {
      if (e.key === "Escape") setConseil(null);
    };

    document.addEventListener("pointerdown", auClic);
    document.addEventListener("keydown", auClavier);
    return () => {
      document.removeEventListener("pointerdown", auClic);
      document.removeEventListener("keydown", auClavier);
    };
  }, [ouvert]);

  return (
    <span className="bookmark" ref={zone}>
      <button
        type="button"
        className="bookmark-toggle"
        onClick={() => setConseil(ouvert ? null : conseilFavoris())}
        aria-expanded={ouvert}
        aria-label="Mettre le site en favoris"
        title="Mettre le site en favoris"
      >
        <span aria-hidden="true">{ouvert ? "★" : "☆"}</span>
      </button>

      {ouvert && (
        <span className="bookmark-hint" role="status">
          {conseil}
        </span>
      )}
    </span>
  );
}
