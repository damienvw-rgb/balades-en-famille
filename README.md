# Nos balades en famille

Un site pour répertorier tes sorties à vélo et tes randonnées : carte interactive du tracé, profil d'altitude, distance, dénivelé, et téléchargement du GPX. Construit avec Next.js 16, prêt à déployer sur Vercel.

## Ajouter une sortie

Chaque sortie est un dossier dans `public/rides/`. Pour en ajouter une :

1. Crée un dossier : `public/rides/nom-de-ta-sortie/` (tirets, pas d'espaces ni d'accents)
2. Place le ou les fichiers GPX dedans
3. Ajoute un fichier `info.json` à côté

**Tous les champs sauf le titre sont facultatifs.** Un champ absent n'apparaît tout simplement pas sur le site, rien ne casse et aucun espace vide ne reste.

### Sortie à une seule trace

Nomme ton fichier `route.gpx` (n'importe quel nom en `.gpx` fonctionne aussi), puis :

```json
{
  "title": "Boucle du Warandepark",
  "activity": "velo",
  "date": "2026-05-10",
  "country": "Belgique",
  "region": "Brabant flamand",
  "difficulty": "Facile",
  "description": "Petite boucle sans difficulté autour des étangs.",
  "tags": ["famille", "forêt"],
  "participants": {
    "adults": 2,
    "children": [6, 9]
  },
  "gear": [
    { "emoji": "🚲", "label": "Vélos de ville" },
    "Casques",
    "Pique-nique"
  ]
}
```

### Sortie à plusieurs étapes

Dépose plusieurs GPX dans le dossier. Le plus simple : `etape-1.gpx`, `etape-2.gpx`, etc. Ils sont repris dans l'ordre, nommés Étape 1, Étape 2, et les distances se cumulent.

Pour donner un vrai titre, une description et un logement à chaque étape, ajoute un bloc `stages` :

```json
{
  "title": "Traversée de l'Eifel",
  "activity": "rando",
  "date": "2026-06-20",
  "country": "Allemagne",
  "region": "Eifel",
  "difficulty": "Modérée",
  "description": "Deux jours de marche avec une nuit en bivouac.",
  "participants": {
    "adults": [41, 39],
    "children": [11, 13, 15]
  },
  "gear": [
    { "emoji": "🎒", "label": "Sacs 45 L" },
    "Filtre à eau"
  ],
  "stages": [
    {
      "file": "etape-1.gpx",
      "title": "Jour 1 : montée vers le plateau",
      "description": "Départ le long de la rivière, montée dans les derniers kilomètres.",
      "lodging": {
        "type": "bivouac",
        "text": "Zone de bivouac du plateau, pas d'eau sur place."
      }
    },
    {
      "file": "etape-2.gpx",
      "title": "Jour 2 : traversée et retour",
      "lodging": { "type": "maison" }
    }
  ]
}
```

Chaque étape reçoit sa couleur sur la carte, son profil d'altitude, son logement et son lien de téléchargement.

## Les champs en détail

### Lieu

`country` et `region` s'affichent ensemble : `"Belgique"` + `"Brabant flamand"` donne **Belgique · Brabant flamand**. Tu peux n'en renseigner qu'un seul.

### Participants

Deux écritures possibles, au choix et mélangeables :

| Écriture | Résultat |
| --- | --- |
| `"adults": 2` | deux 🧑, pas d'âge au survol |
| `"children": [6, 9]` | deux 🧒, âges affichés au survol de chaque emoji |

Un emoji par personne, avec l'âge en infobulle quand il est connu. Au-delà de 6 personnes dans un groupe, l'affichage bascule sur `🧒 ×8` pour rester lisible. Passe la souris sur le groupe pour voir le récapitulatif complet (`3 enfants · 11, 13 et 15 ans`).

### Matériel

`gear` accepte du texte simple ou du texte avec emoji, dans la même liste :

```json
"gear": [
  { "emoji": "🎒", "label": "Sacs 45 L" },
  "Filtre à eau"
]
```

### Logement (par étape)

`lodging` se met dans une étape, pas au niveau de la sortie. Le `type` donne l'emoji et le libellé, le `text` est libre. Les deux sont facultatifs l'un comme l'autre.

| `type` | Affichage |
| --- | --- |
| `bivouac` | 🏕️ Bivouac |
| `camping` | ⛺ Camping |
| `hotel` | 🏨 Hôtel |
| `gite` | 🏡 Gîte |
| `refuge` | 🛖 Refuge |
| `auberge` | 🛏️ Auberge |
| `amis` | 🏠 Chez des amis |
| `van` | 🚐 Van |
| `maison` | 🏘️ Retour à la maison |

Un `type` inconnu retombe sur 🛌 Logement. Pour en ajouter, complète `lib/activities.js`.

### Types d'activité

| `activity` | Affichage |
| --- | --- |
| `velo` | 🚲 Vélo |
| `rando` | 🥾 Randonnée |
| `marche` | 🚶 Marche |
| `vtt` | 🚵 VTT |
| `kayak` | 🛶 Kayak |
| `ski` | ⛷️ Ski |

Sans ce champ, c'est 🚲 Vélo par défaut.

### Ce qui est calculé tout seul

Distance, dénivelé positif et négatif, profil d'altitude, et les totaux sur l'ensemble des étapes. Rien à saisir à la main.

## Filtres de la page d'accueil

Deux filtres, cumulatifs : **activité** et **pays**.

Les options proposées sont construites automatiquement à partir des sorties publiées. Tant qu'aucune sortie n'est en ski, l'option Ski n'apparaît pas. Un filtre dont il n'existe qu'une seule valeur possible ne s'affiche pas du tout, puisqu'il ne filtrerait rien.

Le filtrage se fait dans le navigateur, sans rechargement de page. Tu n'as rien à configurer : ajoute une sortie dans un nouveau pays, l'option apparaît d'elle-même au prochain déploiement.

## Les exemples fournis

| Dossier | Ce qu'il montre |
| --- | --- |
| `exemple-tervuren` | 🚲 vélo, Belgique, **une seule trace** : pas de section « étapes », un profil, un bouton de téléchargement |
| `exemple-rando-2jours` | 🥾 rando, Allemagne, **deux étapes** : pastille « 2 étapes », deux couleurs sur la carte, un profil et un logement par étape |
| `exemple-vtt-ardennes` | 🚵 VTT, Belgique : sert à montrer le cumul des filtres (même pays que le premier, activité différente) |

Supprime-les quand tu n'en as plus besoin. Les filtres s'ajusteront tout seuls.

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
public/rides/<slug>/*.gpx        → la ou les traces GPS
public/rides/<slug>/info.json    → titre, activité, date, étapes
lib/gpx.js                       → parsing du GPX, calcul distance/dénivelé
lib/rides.js                     → lecture des sorties et de leurs étapes
lib/activities.js                → activités, logements, couleurs d'étapes
components/Participants.jsx      → emojis participants et âges au survol
components/GearList.jsx          → liste du matériel
components/Filters.jsx           → filtres activité et pays
components/RideCard.jsx          → carte d'une sortie sur l'accueil
components/RouteMap.jsx          → carte interactive (Leaflet + OpenTopoMap)
components/ElevationProfile.jsx  → graphique du profil d'altitude
pages/index.js                   → page d'accueil (liste des sorties)
pages/rides/[slug].js            → page détail d'une sortie
```
