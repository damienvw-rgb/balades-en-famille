# Partage de balades familiales

Un carnet de route de balades parcourues à vélo, à pied ou par tout autre moyen : carte interactive, profil d'altitude, distance, dénivelé, traces GPX à télécharger. Les visiteurs peuvent proposer leurs propres sorties et commenter. Construit avec Next.js 16, prêt à déployer sur Vercel.

## Sommaire

- [Ajouter une sortie](#ajouter-une-sortie)
- [Les champs en détail](#les-champs-en-détail)
- [Filtres, thème et cartes](#filtres-thème-et-cartes)
- [Lancer en local](#lancer-en-local)
- [Contributions des visiteurs](#contributions-des-visiteurs)
- [Configuration](#configuration)
- [Mise en ligne sur Vercel](#mise-en-ligne-sur-vercel)
- [Structure du projet](#structure-du-projet)

---

## Ajouter une sortie

Chaque sortie est un dossier dans `public/rides/`. Pour en ajouter une :

1. Crée un dossier : `public/rides/nom-de-ta-sortie/` (tirets, pas d'espaces ni d'accents)
2. Place le ou les fichiers GPX dedans
3. Ajoute un fichier `info.json` à côté

**Tous les champs sauf le titre sont facultatifs.** Un champ absent n'apparaît tout simplement pas sur le site : rien ne casse, et aucun espace vide ne subsiste.

### Sortie à une seule trace

Nomme ton fichier `route.gpx`, ou n'importe quel nom en `.gpx`, puis :

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
  "participants": { "adults": 2, "children": [6, 9] },
  "gear": [
    { "emoji": "🚲", "label": "Vélos de ville" },
    { "emoji": "🥪", "label": "Pique-nique" }
  ]
}
```

### Sortie à plusieurs étapes

Dépose plusieurs GPX dans le dossier, par exemple `etape-1.gpx`, `etape-2.gpx`. Ils sont repris dans l'ordre, nommés Étape 1, Étape 2, et les distances se cumulent.

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
  "participants": { "adults": 2, "children": [11, 13, 15] },
  "gear": [
    { "emoji": "🎒", "label": "Sacs 45 L" },
    { "emoji": "💧", "label": "Filtre à eau" }
  ],
  "stages": [
    {
      "file": "etape-1.gpx",
      "title": "Jour 1 : montée vers le plateau",
      "description": "Départ le long de la rivière, montée dans les derniers kilomètres.",
      "lodging": {
        "type": "wtmg",
        "text": "Jardin trouvé via Welcome To My Garden, accueil très sympa"
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

Chaque étape reçoit sa couleur sur la carte, son profil d'altitude, son logement et son lien de téléchargement. Sur la fiche, les étapes sont **repliées par défaut** : le titre sert de bouton pour dérouler le détail.

Dès qu'une sortie compte plusieurs étapes, **son numéro passe devant le titre** : « Étape 2 · Vers Maaseik », sur la fiche, dans l'infobulle de la carte et dans le choix d'étape du formulaire de commentaire. Sans lui, une liste de noms de lieux ne dit pas dans quel ordre on roule. Une étape sans titre affiche simplement « Étape 2 », et une sortie à trace unique n'est pas numérotée. Le calcul est dans `stageLabel()`, `lib/activities.js`.

---

## Les champs en détail

### Lieu

`country` et `region` s'affichent ensemble : **Belgique · Brabant flamand**. Tu peux n'en renseigner qu'un.

Dans le formulaire de proposition, les deux sont des listes déroulantes. Le pays est obligatoire, les régions dépendent du pays choisi, et l'option « Autre » ouvre un champ libre pour ne bloquer personne. La liste est dans `lib/geo.js`, facile à compléter.

### Participants

```json
"participants": { "adults": 2, "children": [8, 11, 13] }
```

S'affiche **2👩 / 3👧 (8, 11 et 13 ans)** sur la fiche de la sortie, et nulle part sur l'accueil pour ne pas alourdir la grille.

Les âges ne concernent que les enfants : ceux des adultes ne sont ni demandés ni affichés. Si tu ne veux pas donner les âges, écris `"children": 3`. Dans le formulaire, le nombre de champs d'âge s'ajuste au nombre d'enfants annoncé.

Les silhouettes sont tirées au hasard entre 👩 et 👨 pour les adultes, 👧 et 👦 pour les enfants. Le tirage part d'une empreinte du slug de la sortie : il varie d'une sortie à l'autre mais reste identique d'un rechargement à l'autre, sinon le serveur et le navigateur n'afficheraient pas la même chose et React signalerait une erreur d'hydratation. Aucune information de genre n'est demandée ni déduite, ce choix est expliqué dans les mentions légales du site.

Au survol d'une silhouette, une infobulle donne le décompte en toutes lettres, accordé au nombre : « 1 adulte », « 3 enfants ».

### Matériel

```json
"gear": [
  { "emoji": "⛺", "label": "Tente 3 places" },
  { "emoji": "💧", "label": "Filtre à eau" }
]
```

Dans le formulaire, chaque élément se saisit dans un champ distinct et reçoit son pictogramme automatiquement, déduit de ce qui est écrit : une tente donne ⛺, un réchaud 🔥, des sacoches 👜.

Les règles vivent dans **`lib/gear.js`**, fonction `gearEmoji`, seul endroit du site à faire cette déduction. `lib/activities.js` ne fait plus que la ré-exporter, et `lib/gearEmoji.js` a disparu : il y avait trois listes de règles divergentes, le formulaire et la fiche de sortie pouvaient afficher deux pictogrammes différents pour le même texte.

La déduction suit trois principes :

- le libellé est mis à plat avant comparaison, sans accent ni ponctuation, donc « Vélo » et « velo » se valent
- les racines s'accrochent au début d'un mot, jamais à sa fin : « 3 vélos bemoov » trouve bien `velo`, ce que l'ancienne version ratait à cause du pluriel
- quand plusieurs mots sont reconnus, celui qui apparaît le plus tôt gagne : « 4 sacoches / fontes / vélo d'adulte » donne 👜 et non 🚲

Si le pictogramme déduit ne convient pas, un clic dessus dans le formulaire ouvre une palette (`components/GearPicker.jsx`). Le choix est transmis avec la proposition et conservé jusqu'à l'affichage de la sortie. Un bouton « Revenir au choix automatique » rend la main à la déduction : tant que le visiteur n'a rien forcé, `emoji` reste vide et une amélioration ultérieure des règles profite à la sortie. Côté API, un pictogramme reçu n'est retenu que s'il fait partie de la palette, rien d'arbitraire ne peut donc atterrir dans un fichier de `public/`.

### Logement, par étape

`lodging` se met dans une étape, pas au niveau de la sortie. Le `type` donne l'emoji et le libellé, le `text` est libre. Les deux sont facultatifs. Le bloc est titré « Où on a dormi » sur la fiche : sans cet intitulé, un emoji suivi d'un nom de camping ne disait pas de quoi il s'agissait.

| `type` | Affichage |
| --- | --- |
| `bivouac` | 🏕️ Bivouac |
| `camping` | ⛺ Camping |
| `wtmg` | 🌻 Welcome To My Garden |
| `warmshowers` | 🚿 Warmshowers |
| `hotel` | 🏨 Hôtel |
| `gite` | 🏡 Gîte |
| `refuge` | 🛖 Refuge |
| `auberge` | 🛏️ Auberge de jeunesse |
| `amis` | 🏠 Chez des amis |
| `van` | 🚐 Van ou camping-car |
| `train` | 🚆 Train de nuit |
| `maison` | 🏘️ Retour à la maison |

Un `type` inconnu retombe sur 🛌 Logement.

### Activité et difficulté

| `activity` | Affichage |
| --- | --- |
| `velo` | 🚲 Vélo |
| `vtt` | 🚵 VTT |
| `rando` | 🥾 Randonnée |
| `marche` | 🚶 Marche |
| `gravel` | 🚴 Gravel |
| `kayak` | 🛶 Kayak |
| `ski` | ⛷️ Ski |
| `raquettes` | 🌨️ Raquettes |
| `cheval` | 🐴 Cheval |
| `autre` | 🧭 Autre |

`difficulty` accepte : Très facile, Facile, Modérée, Sportive, Difficile.

Pour ajouter une activité ou un logement, complète `lib/activities.js`.

### Descriptions longues

Sur l'accueil, une description est coupée à 155 caractères, au dernier mot entier, suivie de « Lire la suite ». La fiche affiche le texte complet. Tu peux donc écrire aussi long que tu veux sans déséquilibrer la grille.

### Ce qui est calculé tout seul

Distance, dénivelé positif et négatif, profil d'altitude, totaux sur l'ensemble des étapes, et le fichier de parcours complet. Rien à saisir à la main.

---

## Filtres, thème et cartes

### Filtres

Trois listes déroulantes sur une ligne, activité, pays et difficulté, cumulatives. Les options sont construites à partir des sorties publiées : tant qu'aucune sortie n'est en ski, l'option Ski n'apparaît pas. Un filtre à valeur unique ne s'affiche pas du tout. Le filtrage se fait dans le navigateur, sans rechargement.

Les difficultés sont listées du plus simple au plus engagé, dans l'ordre du formulaire, et non par ordre alphabétique. Une sortie sans difficulté renseignée n'apparaît dans aucune des options de ce filtre.

### Thème clair et sombre

Le thème clair est le défaut, le bouton en haut à droite bascule vers le sombre.

La préférence va dans le stockage local du navigateur, **pas dans un cookie** : rien n'est transmis au serveur, donc aucun bandeau de consentement n'est nécessaire. Un script s'exécute avant le premier rendu pour éviter le clignotement blanc au chargement.

Toutes les couleurs passent par des variables CSS définies pour les deux thèmes en tête de `styles/globals.css`. Si tu ajoutes une couleur, ajoute-la aux deux.

### Fonds de carte

Deux fonds, libres et sans clé d'API, sélectionnables sur chaque carte :

| Bouton | Fond | Pour quoi |
| --- | --- | --- |
| Relief | OpenTopoMap | courbes de niveau marquées, utile en montagne |
| Plan | OpenStreetMap | fond neutre, le plus lisible partout ailleurs |

**CyclOSM a été retiré.** Son intérêt, la mise en avant des itinéraires cyclables, se retournait contre nous : sur les zones denses il couvrait la carte de lignes magenta et violettes qui rivalisaient avec la trace, précisément ce qu'on cherchait à éviter.

**Le fond affiché à l'arrivée dépend de l'activité** : le relief aux activités à pied, où les courbes de niveau disent quelque chose, le plan à tout le reste.

| Activité | Fond proposé d'office |
| --- | --- |
| Randonnée, Marche, Raquettes, Ski | Relief |
| Vélo, VTT, Gravel, Kayak, Cheval, Autre | Plan |

Les deux boutons restent affichés dans tous les cas : le visiteur change de fond quand il veut, ce choix ne fait que décider du premier affichage. La correspondance est dans `ACTIVITY_MAP_LAYER`, en tête de `lib/activities.js` : une ligne à changer si tu veux un autre fond pour une activité.

### Lisibilité de la trace

Les fonds OpenStreetMap sont chargés : routes en orange, limites administratives violettes, bois en vert. Un simple trait de couleur s'y perdait, une étape jaune ou verte pouvant passer pour une route. Trois réglages y répondent, dans `components/RouteMap.jsx` et `styles/globals.css` (le quatrième étant le retrait de CyclOSM, plus haut) :

- chaque trace est **doublée d'un liseré sombre plus large dessous** (11 px), comme chez Komoot ou Strava. Sombre et non blanc : tous les fonds proposés ici sont clairs, un contour blanc n'y détacherait rien. Il reste un peu transparent pour ne pas masquer la route suivie
- la trace elle-même passe de 4 à **6 pixels**, et les pastilles de départ et d'arrivée grossissent d'autant
- le calque des tuiles est **désaturé de moitié et éclairci** (`.leaflet-tile-pane`), ce qui recule le fond sans toucher aux couleurs des étapes : il garde ses formes et ses libellés, il perd seulement de la force

Les épaisseurs et la couleur du liseré sont trois constantes en tête de `RouteMap.jsx`.

### Téléchargement des traces

Une sortie à trace unique propose son GPX. Une sortie à plusieurs étapes propose en plus un **parcours complet** : un seul fichier contenant toutes les étapes, chacune restant une trace nommée distincte, donc rien n'est perdu à l'import dans un GPS. Il est généré au build par `scripts/prepare-rides.mjs`.

---

## Les exemples fournis

| Dossier | Ce qu'il montre |
| --- | --- |
| `exemple-tervuren` | 🚲 vélo, Belgique, **une seule trace** : pas de section « étapes », panneau ouvert d'office, un bouton de téléchargement |
| `exemple-rando-2jours` | 🥾 rando, Allemagne, **deux étapes** : pastille « 2 étapes », deux couleurs sur la carte, étapes repliées, logement par étape, parcours complet |
| `exemple-vtt-ardennes` | 🚵 VTT, Belgique : montre le cumul des filtres, même pays que le premier mais activité différente |

Supprime-les quand tu n'en as plus besoin, les filtres s'ajusteront seuls.

---

## Lancer en local

```bash
npm install
npm run dev
```

Puis ouvre http://localhost:3000

Le site fonctionne **sans aucune variable d'environnement** : le stockage utilise des fichiers dans `.data/` et les emails s'affichent dans la console au lieu d'être envoyés. Tu peux donc tester le parcours complet, y compris les liens de confirmation, avant de brancher quoi que ce soit.

---

## Contributions des visiteurs

Un visiteur peut **proposer une sortie**, publiée seulement après ta validation, et **commenter** une sortie ou une étape, publié après confirmation de son adresse email.

### Une sortie proposée

1. Le visiteur remplit `/proposer` : titre, activité et pays obligatoires, un ou plusieurs GPX, composition du groupe, matériel, son pseudo et son email
2. Le filtre anti-spam s'applique, et chaque GPX est analysé côté serveur
3. Un email de confirmation part vers l'auteur. **Tant qu'il n'a pas cliqué, la proposition n'apparaît pas dans ta file de modération** : tu ne vois jamais les faux envois
4. Au clic, tu reçois la notification
5. Sur `/admin`, tu vois le détail de chaque étape, et tu approuves ou refuses
6. À l'approbation, un Deploy Hook relance le build : `scripts/prepare-rides.mjs` écrit la sortie dans `public/rides/`, au même format que les tiennes
7. L'auteur est prévenu de la publication, avec l'adresse de sa sortie et un lien pour la corriger lui-même

Rien n'est publié sans ton accord.

### L'auteur corrige sa sortie

L'email de publication contient deux adresses : celle de la sortie en ligne, et une adresse de modification qui n'appartient qu'à son auteur. Elle ouvre `/sortie/modifier`, le formulaire de proposition prérempli avec sa sortie.

- Tous les champs sont modifiables, y compris les étapes : en ajouter, en retirer, remplacer une trace. **Une étape dont le fichier n'est pas remplacé garde la sienne**, rien n'est à renvoyer pour corriger une faute de frappe
- Le pseudo, l'adresse email et l'adresse de la sortie ne bougent pas, même si le titre change : un lien partagé reste valable
- Le filtre anti-spam s'applique comme au dépôt

**La version en ligne n'est jamais remplacée d'office.** La correction attend dans `/admin`, à côté des propositions, et tu l'acceptes ou tu l'écartes ; la sortie reste visible dans sa version précédente d'ici là. Une sortie encore en attente de relecture, elle, est modifiée directement : elle n'a jamais été publiée, et tu la reliras de toute façon avant qu'elle paraisse. Dans les deux cas tu reçois un email.

Le lien de modification vaut trois mois. Passé ce délai, ou s'il s'est perdu, l'auteur en redemande un depuis `/sortie/modifier`, en indiquant son adresse email : il reçoit alors un lien par sortie. La réponse affichée est la même que l'adresse soit connue ou non, sinon ce formulaire dirait à n'importe qui si une adresse a déjà proposé une sortie. Un discret « Cette sortie est la tienne ? » en pied des sorties proposées mène au même endroit.

### Corriger une sortie toi-même

Une sortie proposée par un visiteur vit dans le stockage, pas dans le dépôt : il n'y a donc pas d'`info.json` à ouvrir pour rectifier une difficulté mal évaluée ou une faute dans un titre. Le fichier `corrections.json`, à la racine, sert à ça :

```json
{
  "petit-mont-bonvin": {
    "difficulty": "Difficile"
  }
}
```

La clé est le slug de la sortie, celui qui apparaît dans son adresse. Les champs déclarés remplacent ceux de la proposition au moment du build, sans toucher à la proposition d'origine ni au stockage : tu peux revenir en arrière en supprimant la ligne. N'importe quel champ d'`info.json` est acceptable, sauf `author`, `submissionId` et `stages`, qui restent gérés par le script.

Une correction déclarée pour un slug qui n'existe pas est signalée dans les logs du build, sans le faire échouer.

### Les fils de discussion

Chaque commentaire peut recevoir des réponses, affichées en retrait sous le message d'origine. Quand quelqu'un répond, **tous les intervenants du fil** reçoivent un email, ainsi que l'auteur de la sortie et toi. La conversation peut donc continuer sans que personne n'ait à revenir consulter la page.

C'est pour cette raison que les adresses sont conservées tant qu'un message reste en ligne, ce que les mentions légales expliquent.

Les fils restent à deux niveaux : une réponse à une réponse se rattache au message racine, ce qui évite les cascades illisibles.

### Un pseudo appartient à une adresse

Une fois une adresse confirmée, le pseudo lui est rattaché pour tout le site, commentaires comme propositions.

- Quelqu'un tente un pseudo déjà pris : « Ce pseudo est déjà utilisé par quelqu'un d'autre. »
- Une adresse connue arrive avec un autre pseudo : le sien lui est proposé, avec un bouton pour le reprendre.

La vérification se fait pendant la saisie, sans attendre l'envoi. Le lien n'est enregistré qu'après confirmation de l'adresse : sinon il suffirait d'un formulaire avec une fausse adresse pour réserver un pseudo qu'on ne possède pas.

### Le formulaire de contact

`/contact` permet de signaler un problème, proposer une amélioration, demander la modification ou le retrait d'un contenu publié, signaler un contenu inapproprié, ou autre chose. Même vérification par email. Le message t'arrive avec un en-tête Reply-To : ta réponse part directement vers l'expéditeur.

C'est ce formulaire qui figure dans les mentions légales plutôt qu'une adresse exposée aux robots collecteurs.

### La confidentialité des adresses

Une adresse email n'est **jamais** affichée, ni servie par une API publique, ni écrite dans `public/`. Seul le pseudo apparaît. Un test a vérifié qu'aucune adresse ne fuit sur l'accueil, les fiches de sortie, l'API des commentaires, les deux formulaires, les mentions légales ni la page d'administration.

### Le filtrage anti-spam

Sans service tiers ni captcha :

| Contrôle | Ce qu'il attrape |
| --- | --- |
| Champ piège invisible | les robots qui remplissent tous les champs |
| Délai minimal de 4 secondes | les envois automatisés instantanés |
| Maximum 2 liens | les commentaires publicitaires |
| Motifs connus | casino, backlinks SEO, crypto, etc. |
| Tout en majuscules | les messages criés |
| Limite de 5 envois par heure et par IP | les envois en rafale |
| Confirmation par email | les adresses jetables ou fausses |

Le même filtrage protège les propositions, le formulaire de contact et la page de connexion admin. Les propositions passent en plus par une validation du GPX : un fichier vide ou illisible est refusé avant tout enregistrement.

---

## Configuration

Tout se règle dans Vercel, **Settings → Environment Variables**. Aucun compte tiers en dehors de Vercel et Gmail, que tu as déjà. Copie `.env.example` en `.env.local` pour le développement.

| Variable | À quoi elle sert |
| --- | --- |
| `APP_SECRET` | signe les liens de confirmation et ta session admin. **Indispensable**, sans elle la connexion à `/admin` échoue |
| `ADMIN_PASSWORD` | mot de passe de `/admin` |
| `ADMIN_EMAIL` | adresse qui reçoit les notifications |
| `SMTP_USER` | ton adresse Gmail |
| `SMTP_PASS` | mot de passe d'application Gmail, **pas** ton mot de passe habituel |
| `VERCEL_DEPLOY_HOOK_URL` | met en ligne une sortie approuvée sans intervention |
| `NEXT_PUBLIC_LEGAL_NAME` | nom affiché dans les mentions légales, un prénom suffit |
| `BLOB_READ_WRITE_TOKEN` | injecté automatiquement à la création du store Blob |

### Le mot de passe d'application Gmail

Sur ton compte Google : active la validation en deux étapes, puis Sécurité → Mots de passe des applications, et génère-en un. Il ne donne accès qu'à l'envoi SMTP, pas à ta boîte, et se révoque à tout moment. Limite de Gmail : environ 500 envois par jour, très au-dessus des besoins.

---

## Mise en ligne sur Vercel

Le site fonctionne dès le premier déploiement, sans aucune variable. Les contributions ne s'activent qu'ensuite : tu peux donc déployer d'abord et configurer après.

### 1. Envoyer le code

```powershell
git add .
git commit -m "Mise a jour du site"
git push
```

Vercel redéploie automatiquement.

### 2. Créer le stockage

Vercel → **Storage** → **Create Database** → **Blob**. Donne un nom, laisse la région par défaut, connecte-le au projet. Vercel Blob est un produit maison, rien à créer ailleurs. La variable `BLOB_READ_WRITE_TOKEN` est ajoutée toute seule.

### 3. Créer le Deploy Hook

Vercel → **Settings** → **Git** → **Deploy Hooks**. Nom : « Publier une sortie », branche `main`. Copie l'URL obtenue.

### 4. Renseigner les variables

Ajoute celles du tableau ci-dessus, en cochant les trois environnements.

Pour `APP_SECRET`, sous PowerShell :

```powershell
[Convert]::ToBase64String((1..32 | ForEach-Object { Get-Random -Max 256 }))
```

Choisis-la une fois pour toutes : la changer invalide les liens de confirmation en circulation et te déconnecte de `/admin`.

### 5. Redéployer

**Les variables ne s'appliquent qu'au déploiement suivant.** Dans **Deployments**, ouvre le dernier, menu « … » → **Redeploy**. C'est l'oubli le plus fréquent.

### 6. Vérifier

1. Ouvre `/admin`. Si une variable manque, la page te dit précisément laquelle.
2. Connecte-toi avec `ADMIN_PASSWORD`
3. En navigation privée, propose une sortie sur `/proposer` avec une **autre** adresse que la tienne
4. Rien ne doit apparaître dans `/admin` à ce stade : normal, l'adresse n'est pas confirmée
5. Clique le lien reçu par email : tu reçois alors la notification, la proposition apparaît
6. Approuve, attends une ou deux minutes, vérifie qu'elle est en ligne
7. Laisse un commentaire, confirme-le, réponds-y avec une troisième adresse et vérifie que les notifications partent

Si un email n'arrive pas, regarde les indésirables, puis Vercel → **Logs**.

---

## Structure du projet

```
public/rides/<slug>/*.gpx          les traces GPS
public/rides/<slug>/info.json      titre, activité, lieu, étapes, matériel
scripts/prepare-rides.mjs          intègre les sorties approuvées, fusionne les GPX
corrections.json                   retouches appliquées aux sorties proposées

lib/rides.js         lecture des sorties, totaux, troncature
lib/gpx.js           parsing GPX, distance, dénivelé
lib/activities.js    activités, logements, difficultés, participants
lib/gear.js          déduction du pictogramme de matériel, palette, normalisation
lib/geo.js           pays et régions du formulaire
lib/identity.js      liaison pseudo vers email
lib/submissionInput.js  lecture des champs d'une sortie, au dépôt comme à la modification
lib/editLink.js      lien de modification signé envoyé à l'auteur
lib/spam.js          filtrage anti-spam
lib/storage.js       Vercel Blob ou fichiers locaux
lib/mailer.js        SMTP Gmail ou console
lib/tokens.js        jetons signés de confirmation
lib/admin.js         session d'administration

components/RouteMap.jsx          carte et sélecteur de fond
components/ElevationProfile.jsx  profil d'altitude
components/Comments.jsx          fil de discussion et formulaire
components/Filters.jsx           filtres activité, pays et difficulté
components/RideCard.jsx          carte d'une sortie sur l'accueil
components/Participants.jsx      composition du groupe, infobulles au survol
components/GearPicker.jsx        saisie du matériel et choix du pictogramme
components/ThemeToggle.jsx       bascule clair et sombre

pages/index.js             accueil
pages/rides/[slug].js      fiche d'une sortie
pages/proposer.js          formulaire de proposition
pages/sortie/modifier.js   correction d'une sortie par son auteur
pages/contact.js           formulaire de contact
pages/mentions-legales.js  mentions légales
pages/admin/index.js       modération
pages/api/                 routes serveur
```

---

## Points d'attention

**Le plan Hobby de Vercel est réservé à un usage non commercial.** Un carnet de balades familial rentre dans le cadre, mais pas un site qui génère des revenus.

**Tu stockes des adresses email de tiers**, ce qui est un traitement de données personnelles. Les mentions légales couvrent l'essentiel pour un site personnel, mais il te revient de les relire et de les valider.

**Modération.** Tu reçois un email à chaque commentaire. Si le volume devient gênant, retire `ADMIN_EMAIL` des destinataires dans `pages/api/comments/verify.js` et consulte `/admin` de temps en temps.
