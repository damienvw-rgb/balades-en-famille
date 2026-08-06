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
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,500;9..144,600;9..144,700&family=Inter:wght@400;500;600&family=IBM+Plex+Mono:wght@400;500;600&display=swap"
          rel="stylesheet"
        />
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </Head>
      <body>
        <Main />
        <NextScript />
      </body>
    </Html>
  );
}
