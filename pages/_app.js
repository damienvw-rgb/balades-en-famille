import "leaflet/dist/leaflet.css";
import "@/styles/globals.css";
import { fraunces, inter, plexMono } from "@/lib/fonts";

/**
 * Les fontes sont chargées ici et non dans _document.js : en Pages Router,
 * next/font n'émet pas sa feuille de style depuis _document, il ne poserait
 * que les noms de classes et le site repartirait sur les fontes système.
 *
 * On expose les trois familles générées comme variables CSS sur :root, ce que
 * styles/globals.css attend pour composer --font-display, --font-body et
 * --font-mono.
 */
export default function App({ Component, pageProps }) {
  return (
    <>
      <style jsx global>{`
        :root {
          --font-fraunces: ${fraunces.style.fontFamily};
          --font-inter: ${inter.style.fontFamily};
          --font-plex: ${plexMono.style.fontFamily};
        }
      `}</style>
      <Component {...pageProps} />
    </>
  );
}
