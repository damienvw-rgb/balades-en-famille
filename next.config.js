/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
};

module.exports = nextConfig;
# Mettre en place un projet Claude pour ce site

Deux choses à faire : coller les instructions ci-dessous dans les **instructions personnalisées** du projet, et joindre le code dans les **fichiers du projet**.

---

## 1. À coller dans les instructions du projet

```
Tu m'aides à faire évoluer « Partage de balades familiales », un site Next.js
déployé sur Vercel qui répertorie des balades à vélo et randonnées, avec cartes,
profils d'altitude et traces GPX. Des visiteurs peuvent proposer des sorties et
commenter.

## Contexte technique

- Next.js 16 en Pages Router (pas App Router), React 19, JavaScript sans TypeScript
- Cartes : Leaflet et react-leaflet 5, fonds CyclOSM, OpenTopoMap et OSM, sans clé d'API
- Stockage : Vercel Blob en production, fichiers JSON dans .data/ en développement.
  La bascule est automatique dans lib/storage.js selon BLOB_READ_WRITE_TOKEN.
- Emails : SMTP Gmail avec mot de passe d'application, repli console en développement.
  La bascule est dans lib/mailer.js selon SMTP_USER et SMTP_PASS.
- CSS : un seul fichier styles/globals.css, variables CSS, thèmes clair et sombre
- Aucune dépendance payante, aucun compte tiers en dehors de Vercel et Gmail

## Architecture

Une sortie est un dossier public/rides/<slug>/ contenant un ou plusieurs .gpx et
un info.json. Les sorties proposées par des visiteurs vivent dans le stockage,
puis scripts/prepare-rides.mjs les matérialise dans public/rides/ avant chaque
build, au même format que les miennes. Ce script génère aussi parcours-complet.gpx
pour les sorties à plusieurs étapes.

Les pages de sorties sont statiques via getStaticProps. Commentaires, propositions
et messages de contact passent par des routes API dynamiques.

Fichiers clés :
- lib/rides.js        lecture des sorties, totaux, troncature des descriptions
- lib/gpx.js          parsing GPX, distance, dénivelé
- lib/activities.js   activités, logements, difficultés, emojis matériel, participants
- lib/geo.js          pays et régions du formulaire
- lib/identity.js     liaison pseudo vers email
- lib/spam.js         filtrage anti-spam en sept couches
- lib/storage.js      abstraction Blob ou fichiers locaux
- lib/mailer.js       abstraction SMTP ou console
- lib/tokens.js       jetons HMAC signés, sans stockage

## Règles à respecter

1. Une adresse email ne doit JAMAIS arriver au navigateur : ni dans une API
   publique, ni dans un fichier de public/. Vérifie ce point à chaque modification
   touchant aux commentaires, propositions ou contact.
2. Tout contenu déposé par un visiteur passe par le filtre anti-spam ET par une
   confirmation d'adresse email avant publication.
3. Les sorties proposées ne deviennent visibles qu'après validation manuelle
   depuis /admin.
4. Un pseudo appartient à une adresse email. Toute fonctionnalité acceptant un
   pseudo doit appeler checkIdentity() puis bindIdentity() après confirmation.
5. Un champ facultatif non renseigné n'affiche rien : pas de bloc vide, pas de
   libellé orphelin.
6. Le site doit continuer à fonctionner sans aucune variable d'environnement,
   avec stockage local et emails en console. C'est ce qui me permet de tester
   avant de déployer, ne casse pas ce repli.
7. Les emojis de participants sont féminins (femme et fille). C'est un choix
   assumé, expliqué dans les mentions légales. Ne les change pas.
8. Le thème clair est le défaut. Toute nouvelle couleur passe par une variable
   CSS définie pour les deux thèmes, jamais par une couleur en dur.

## Ce que j'attends de toi

- Lance le build avant de me livrer, et dis-moi ce que tu as vérifié et ce que
  tu n'as pas pu vérifier
- Livre un zip complet du projet plutôt que des extraits : je remplace le dossier
  entier à chaque fois
- Commente le code en français, comme l'existant
- Signale-moi franchement les implications que je n'aurais pas vues : coût, RGPD,
  complexité, ou le fait que le plan Vercel Hobby interdit l'usage commercial
- Mets à jour le README quand tu ajoutes une fonctionnalité

## Mes conventions

- Jamais de tiret cadratin ni demi-cadratin dans les textes affichés, ni dans tes
  réponses
- Interface entièrement en français
- Je déploie par git push, Vercel redéploie tout seul
```

---

## 2. Fichiers à joindre au projet

Joins le dossier du site **sans** `node_modules` ni `.next`. Si l'interface refuse un dossier entier, joins au minimum :

- `README.md`
- `package.json`
- tout le contenu de `lib/`
- tout le contenu de `components/`
- tout le contenu de `pages/`
- `styles/globals.css`
- `scripts/prepare-rides.mjs`
- `.env.example`

Inutile de joindre `public/rides/` : ce sont tes données, pas du code, et ça alourdit le projet pour rien.

---

## 3. Bons réflexes

**Au début de chaque conversation**, précise si tu as déjà déployé les modifications précédentes. Sans ça, on risque de travailler sur deux versions différentes.

**Après chaque livraison**, remplace ton dossier local, lance `npm install` puis `npm run dev`, vérifie, et seulement ensuite `git push`.

**Pense à rafraîchir les fichiers du projet** quand le code a beaucoup bougé, sinon les instructions décriront une version dépassée.
