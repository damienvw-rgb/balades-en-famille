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
          <div className="page-tools">
            <ThemeToggle />
          </div>
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
            Ce site est un carnet de balades, sans but commercial, édité par{" "}
            {EDITOR}. Pour toute question ou demande, écris via le{" "}
            <Link href="/contact">formulaire de contact</Link>.
          </p>

          <h2>Itinéraires : chacun le sien</h2>
          <p>
            Les traces publiées ici sont des idées de balades, rien de plus. Je
            ne peux être tenu responsable d'aucune décision prise à partir d'un
            itinéraire trouvé sur ce site. Chacun construit et assume le sien :
            avant de partir, vérifie que le parcours est toujours praticable,
            ouvert, sûr et adapté à ton groupe. Un chemin peut avoir été fermé,
            un pont coupé, une route rendue dangereuse, un passage devenu privé,
            et la météo change tout. La préparation, l'équipement et la sécurité
            restent la responsabilité de qui prend la route.
          </p>

          <h2>Données personnelles</h2>
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
                  Confirmer que la demande vient de toi, te prévenir des réponses
                  et des commentaires reçus, t'envoyer le lien qui te permet de
                  corriger ta sortie, et te répondre
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
                  Limiter les envois automatisés. Conservée sous forme d'empreinte
                  non réversible, effacée après une heure
                </td>
                <td data-label="Visible publiquement">Non</td>
              </tr>
            </tbody>
          </table>

          <p>
            Ton adresse est conservée aussi longtemps que ton message reste en
            ligne, pour que tu sois prévenu des réponses. Elle n'apparaît nulle
            part sur le site, n'est transmise à personne et ne sert à aucun envoi
            commercial.
          </p>

          <h3>Pseudo et adresse email vont de pair</h3>
          <p>
            Une fois ton adresse confirmée, ton pseudo lui est rattaché : personne
            d'autre ne peut écrire sous ce pseudo. Tu peux en changer quand tu
            veux, en indiquant un nouveau pseudo avec la même adresse. Le
            changement ne prend effet qu'après ton clic sur le lien reçu, puis
            remplace l'ancien partout où tu as publié.
          </p>

          <h3>Base légale, conservation et droits</h3>
          <p>
            Le traitement repose sur ton consentement, donné en remplissant le
            formulaire puis confirmé par email. Les données liées à un contenu
            publié sont conservées tant que ce contenu reste en ligne ; une
            proposition non confirmée ou refusée est supprimée. Tu peux à tout
            moment demander l'accès à tes données, leur rectification ou leur
            suppression via le <Link href="/contact">formulaire de contact</Link>,
            ainsi qu'introduire une réclamation auprès de l'Autorité de protection
            des données (
            <a href="https://www.autoriteprotectiondonnees.be" target="_blank" rel="noopener noreferrer">
              autoriteprotectiondonnees.be
            </a>
            ).
          </p>

          <h3>Cookies</h3>
          <p>
            Aucun cookie publicitaire, aucune mesure d'audience, aucun traceur
            tiers. Le choix du thème clair ou sombre est enregistré dans le
            stockage local de ton navigateur. Un unique cookie technique existe,
            créé seulement lors d'une connexion à l'espace d'administration.
          </p>

          <h2>Contenus, droits et pictogrammes</h2>
          <p>
            En proposant une sortie ou un commentaire, tu confirmes en être
            l'auteur et autorises sa publication. Tu en restes propriétaire et
            peux en demander le retrait à tout moment, comme tu peux signaler un
            contenu qui ne devrait pas être là, via le{" "}
            <Link href="/contact">formulaire de contact</Link>.
          </p>
          <p>
            Les participants sont représentés par des silhouettes, 👩 👨 pour les
            adultes et 👧 👦 pour les enfants, tirées au hasard pour chaque
            sortie : ni le genre ni le prénom de qui que ce soit n'est demandé,
            seul le nombre l'est.
          </p>
          <p>
            Les fonds de carte proviennent d'
            <a href="https://opentopomap.org" target="_blank" rel="noopener noreferrer">OpenTopoMap</a>{" "}
            (CC-BY-SA), à partir des données d'
            <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap</a>{" "}
            (ODbL).
          </p>

          {/* Mention d'hébergeur obligatoire (art. III.74 du Code de droit
              économique belge, art. 6 LCEN en France), réduite à l'essentiel. */}
          <p className="legal-updated">
            Hébergé par Vercel Inc., Covina, CA, États-Unis. Mais on travaille
            pour l'héberger en Europe ! ;-)
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
