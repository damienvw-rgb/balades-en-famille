# Mes balades à vélo

Un site pour répertorier tes balades à vélo : carte interactive du tracé, profil d'altitude, distance, dénivelé, et téléchargement du GPX. Construit avec Next.js 16, prêt à déployer sur Vercel.

## Ajouter une balade

Chaque balade est un dossier dans `public/rides/`. Pour en ajouter une :

1. Crée un dossier : `public/rides/nom-de-ta-balade/` (utilise des tirets, pas d'espaces ni d'accents dans le nom du dossier)
2. Place ton fichier GPX dedans, renommé en `route.gpx` (exporté depuis Komoot, Strava, ou ton GPS vélo)
3. Ajoute un fichier `info.json` à côté, avec ce format :

```json
{
  "title": "Nom de la balade",
  "date": "2026-07-15",
  "region": "Limburg",
  "difficulty": "Modérée",
  "description": "Une description courte de la balade, ce qui l'a rendue sympa, les points d'intérêt.",
  "tags": ["famille", "forêt"]
}
```

Un dossier d'exemple (`public/rides/exemple-tervuren/`) montre le format. Tu peux le supprimer une fois que tu as ajouté tes propres balades.

La distance, le dénivelé positif/négatif et le profil d'altitude sont calculés automatiquement à partir du GPX, tu n'as rien à faire pour ça.

## Lancer en local

```bash
npm install
npm run dev
```

Puis ouvre http://localhost:3000

## Déployer sur Vercel

**Option la plus simple, sans terminal :**

1. Crée un compte sur [vercel.com](https://vercel.com) (gratuit)
2. Mets ce projet sur GitHub : crée un nouveau dépôt sur github.com, puis dépose tous les fichiers de ce dossier dedans (bouton "Add file" → "Upload files" sur la page du dépôt, ou glisser-déposer)
3. Sur Vercel, clique "Add New" → "Project", choisis "Import Git Repository" et sélectionne ton dépôt
4. Laisse les réglages par défaut (Vercel détecte Next.js automatiquement) et clique "Deploy"

Ton site sera en ligne en 1 à 2 minutes, avec une URL du type `ton-projet.vercel.app`.

Pour chaque nouvelle balade ajoutée : dépose les nouveaux fichiers dans le dépôt GitHub, Vercel redéploie automatiquement.

**Option avec terminal (si tu préfères) :**

```bash
npm install -g vercel
vercel
```

Suis les instructions à l'écran.

## Structure du projet

```
public/rides/<slug>/route.gpx    → le tracé GPS
public/rides/<slug>/info.json    → titre, date, description
lib/gpx.js                       → parsing du GPX, calcul distance/dénivelé
lib/rides.js                     → lecture des dossiers de balades
components/RouteMap.jsx          → carte interactive (Leaflet + OpenTopoMap)
components/ElevationProfile.jsx  → graphique du profil d'altitude
pages/index.js                   → page d'accueil (liste des balades)
pages/rides/[slug].js            → page détail d'une balade
```
