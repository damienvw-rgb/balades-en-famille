import { Fraunces, Inter, IBM_Plex_Mono } from "next/font/google";

/**
 * Fontes auto-hébergées.
 *
 * next/font télécharge les fichiers au moment du build et les sert depuis le
 * domaine du site. Rien n'est demandé à Google au chargement d'une page, donc
 * aucune adresse IP de visiteur ne part chez un tiers : c'est ce qui rend
 * exacte la phrase « aucun traceur tiers » des mentions légales.
 *
 * Au passage, la feuille de style distante qui bloquait le premier rendu
 * disparaît, et « display: swap » évite le texte invisible pendant le
 * chargement.
 *
 * Les variables CSS déclarées ici sont celles qu'attend styles/globals.css.
 */

export const fraunces = Fraunces({
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  variable: "--font-fraunces",
  display: "swap",
});

export const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-inter",
  display: "swap",
});

export const plexMono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-plex",
  display: "swap",
});

