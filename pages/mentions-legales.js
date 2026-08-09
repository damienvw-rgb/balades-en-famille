import Head from "next/head";
import Link from "next/link";
import ThemeToggle from "@/components/ThemeToggle";

const EDITOR = process.env.NEXT_PUBLIC_LEGAL_NAME || "Damien";

export default function MentionsLegales() {
  return (
    <>
      <Head>
        <title>Mentions légales et données personnelles</title>
        <meta name="description" content="Éditeur du site, traitement des données personnelles et hébergement." />
      </Head>

      <div className="container narrow">
        <div className="page-top">
          <Link href="/" className="back-link">← Retour au carnet</Link>
          <ThemeToggle />
        </div>

        <header className="site-header compact">
          <div className="header-main">
            <h1>Mentions légales</h1>
            <p>Qui édite ce site et ce qu'il fait de tes données.</p>
          </div>
        </header>

        <article className="legal">
          <h2>Éditeur</h2>
          <p>
            Ce site est un carnet de balades personnel, sans but commercial, édité
            par {EDITOR}. Pour toute question, remarque ou demande, écris via le{" "}
            <Link href="/contact">formulaire de contact</Link>.
          </p>

          <h2>Données personnelles</h2>

          <h3>Ce qui est collecté, et pourquoi</h3>
          <p>
            Rien n'est collecté tant que tu ne remplis pas un formulaire. Aucune
            inscription, aucun profil, aucun traçage publicitaire, aucune revente
            de données.
          </p>

          <table className="legal-table">
            <thead>
              <tr>
                <th>Donnée</th>
                <th>Pourquoi</th>
                <th>Visible publiquement</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td data-label="Donnée">Pseudo</td>
                <td data-label="Pourquoi">Signer ton commentaire ou ta sortie</td>
                <td data-label="Visible publiquement">Oui, c'est son objet</td>
              </tr>
              <tr>
                <td data-label="Donnée">Adresse email</td>
                <td data-label="Pourquoi">
                  Confirmer que la demande vient de toi, te prévenir des réponses à
                  tes messages et des commentaires reçus sur une sortie que tu as
                  proposée, t'envoyer le lien qui te permet de corriger cette
                  sortie, et te répondre si tu écris via le formulaire de contact
                </td>
                <td data-label="Visible publiquement">Non, jamais</td>
              </tr>
              <tr>
                <td data-label="Donnée">Contenu publié</td>
                <td data-label="Pourquoi">Commentaire, description, fichier GPX, matériel, composition du groupe</td>
                <td data-label="Visible publiquement">Oui, c'est son objet</td>
              </tr>
              <tr>
                <td data-label="Donnée">Adresse IP</td>
                <td data-label="Pourquoi">
                  Limiter les envois automatisés. Elle n'est pas conservée en clair
                  mais sous forme d'empreinte non réversible
                </td>
                <td data-label="Visible publiquement">Non</td>
              </tr>
            </tbody>
          </table>

          <h3>Pourquoi ton adresse est conservée</h3>
          <p>
            Les commentaires fonctionnent en fil de discussion : quand quelqu'un
            répond à ton message, tu reçois un email pour que la conversation
            puisse continuer. Cela suppose de conserver ton adresse aussi longtemps
            que ton message reste en ligne. Elle n'apparaît nulle part sur le site,
            n'est transmise à personne et ne sert à aucun envoi commercial. Si tu
            ne veux plus recevoir ces notifications, demande le retrait de ton
            message via le <Link href="/contact">formulaire de contact</Link>.
          </p>

          <h3>Pseudo et adresse email vont de pair</h3>
          <p>
            Une fois ton adresse confirmée, ton pseudo lui est rattaché. Personne
            d'autre ne peut alors écrire sous ce pseudo, et tu restes reconnaissable
            d'un message à l'autre. C'est aussi la raison pour laquelle le
            formulaire te signale, le cas échéant, qu'un autre pseudo est déjà
            associé à ton adresse.
          </p>

          <h3>Base légale et durée de conservation</h3>
          <p>
            Le traitement repose sur ton consentement, donné en remplissant le
            formulaire puis confirmé en cliquant sur le lien reçu par email. Les
            données liées à un contenu publié sont conservées tant que ce contenu
            reste en ligne. Une proposition non confirmée ou refusée est supprimée.
            Les empreintes d'adresses IP sont effacées après une heure.
          </p>

          <h3>Tes droits</h3>
          <p>
            Tu peux à tout moment demander l'accès à tes données, leur rectification
            ou leur suppression, ainsi que le retrait d'un commentaire ou d'une
            sortie que tu as publiée. Utilise le{" "}
            <Link href="/contact">formulaire de contact</Link> en choisissant le
            motif correspondant, la demande sera traitée dans les meilleurs délais.
            Tu peux également introduire une réclamation auprès de l'Autorité de
            protection des données (
            <a href="https://www.autoriteprotectiondonnees.be" target="_blank" rel="noopener noreferrer">
              autoriteprotectiondonnees.be
            </a>
            ).
          </p>

          <h3>Cookies et mesure d'audience</h3>
          <p>
            Aucun cookie publicitaire, aucune mesure d'audience, aucun traceur tiers.
            Le choix du thème clair ou sombre est enregistré dans le stockage local
            de ton navigateur, pas dans un cookie : rien n'est transmis au serveur,
            et tu peux l'effacer en vidant les données du site. Un unique cookie
            technique existe, créé seulement lors d'une connexion à l'espace
            d'administration : il ne concerne donc pas les visiteurs.
          </p>

          <h2>Un mot sur les pictogrammes</h2>
          <p>
            Les participants sont représentés par des silhouettes, 👩 👨 pour les
            adultes et 👧 👦 pour les enfants. La version masculine ou féminine
            est tirée au hasard pour chaque sortie, sans rapport avec les
            personnes réellement parties : ni le genre ni le prénom de qui que ce
            soit n'est demandé, seul le nombre d'adultes et d'enfants l'est. Le
            tirage évite d'imposer une représentation par défaut, et ne fait
            de jaloux dans aucun sens.
          </p>

          <h2>Contenus et droits</h2>
          <p>
            En proposant une sortie ou un commentaire, tu confirmes en être l'auteur
            et autorises sa publication sur ce site. Tu en restes propriétaire et
            peux en demander le retrait à tout moment. Les traces GPX sont mises à
            disposition à titre informatif : un itinéraire peut avoir changé, être
            devenu impraticable ou traverser une propriété privée. Chacun reste
            responsable de sa préparation, de son équipement et de sa sécurité.
          </p>
          <p>
            Les fonds de carte proviennent d'
            <a href="https://opentopomap.org" target="_blank" rel="noopener noreferrer">OpenTopoMap</a>{" "}
            (CC-BY-SA), à partir des données d'
            <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap</a>{" "}
            (ODbL).
          </p>

          <h2>Signaler un contenu</h2>
          <p>
            Un commentaire déplacé, une trace erronée, un contenu qui ne devrait pas
            être là ? Signale-le via le{" "}
            <Link href="/contact">formulaire de contact</Link>, il sera examiné
            rapidement.
          </p>

          {/* Mention d'hébergeur obligatoire (art. III.74 du Code de droit
              économique belge, art. 6 LCEN en France), réduite à l'essentiel. */}
          <p className="legal-updated">
            Hébergé par Vercel Inc., Covina, CA, États-Unis.
            <br />
            Dernière mise à jour : août 2026.
          </p>
        </article>

        <footer className="site-footer">
          <span>
            <Link href="/">Accueil</Link>
            {" · "}
            <Link href="/contact">Contact</Link>
          </span>
        </footer>
      </div>
    </>
  );
}
