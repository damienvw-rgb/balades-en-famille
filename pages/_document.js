import { Html, Head, Main, NextScript } from "next/document";

/**
 * Le thème est appliqué avant le premier rendu, ce qui évite le clignotement
 * blanc au chargement quand le visiteur a choisi le thème sombre.
 */
const themeScript = `
(function () {
  try {
    var saved = localStorage.getItem('theme');
    if (saved === 'dark' || saved === 'light') {
      document.documentElement.dataset.theme = saved;
      return;
    }
  } catch (e) {}
  document.documentElement.dataset.theme = 'light';
})();
`;

export default function Document() {
  return (
    <Html lang="fr" data-theme="light">
      <Head>
        {/* Les fontes sont auto-hébergées et chargées depuis _app.js
            (voir lib/fonts.js) : plus aucun appel à Google au chargement. */}
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </Head>
      <body>
        <Main />
        <NextScript />
      </body>
    </Html>
  );
}
