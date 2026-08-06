import Head from "next/head";
import Link from "next/link";
import ContourDivider from "@/components/ContourDivider";

// Renseigne ces trois valeurs, ou définis-les comme variables d'environnement
// dans Vercel (NEXT_PUBLIC_LEGAL_NAME, NEXT_PUBLIC_LEGAL_EMAIL, NEXT_PUBLIC_LEGAL_CITY).
const EDITOR = process.env.NEXT_PUBLIC_LEGAL_NAME || "[Ton nom]";
const CONTACT = process.env.NEXT_PUBLIC_LEGAL_EMAIL || "[ton adresse de contact]";
const CITY = process.env.NEXT_PUBLIC_LEGAL_CITY || "[ta commune]";

export default function MentionsLegales() {
  return (
    <>
      <Head>
        <title>Mentions légales et données personnelles</title>
        <meta
          name="description"
          content="Éditeur du site, hébergement, et traitement des données personnelles."
        />
      </Head>

      <div className="container narrow">
        <Link href="/" className="back-link">← Retour au carnet</Link>

        <header className="site-header">
          <h1>Mentions légales</h1>
          <p>Qui édite ce site, où il est hébergé, et ce qu'il fait de tes données.</p>
          <ContourDivider />
        </header>

        <article className="legal">
          <h2>Éditeur</h2>
          <p>
            Ce site est un carnet de balades personnel, sans but commercial, édité
            par {EDITOR}, à {CITY} (Belgique). Pour toute question ou demande :{" "}
            <a href={`mailto:${CONTACT}`}>{CONTACT}</a>.
          </p>

          <h2>Hébergement</h2>
          <p>
            Le site est hébergé par Vercel Inc., 440 N Barranca Ave #4133,
            Covina, CA 91723, États-Unis. Les données déposées via les
            formulaires sont stockées sur l'infrastructure de Vercel.
          </p>

          <h2>Données personnelles</h2>

          <h3>Ce qui est collecté, et pourquoi</h3>
          <p>
            Le site ne collecte des données que si tu remplis un formulaire de ton
            plein gré. Aucune inscription, aucun profil, aucun suivi publicitaire.
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
                <td>Pseudo</td>
                <td>Signer ton commentaire ou ta sortie</td>
                <td>Oui, c'est son objet</td>
              </tr>
              <tr>
                <td>Adresse email</td>
                <td>
                  Confirmer que la demande vient bien de toi, puis te prévenir des
                  commentaires reçus sur une sortie que tu as proposée
                </td>
                <td>Non, jamais</td>
              </tr>
              <tr>
                <td>Contenu publié</td>
                <td>Commentaire, description, fichier GPX</td>
                <td>Oui, c'est son objet</td>
              </tr>
              <tr>
                <td>Adresse IP</td>
                <td>
                  Limiter les envois automatisés. Elle n'est pas conservée en clair
                  mais sous forme d'empreinte non réversible
                </td>
                <td>Non</td>
              </tr>
            </tbody>
          </table>

          <h3>Ton adresse email</h3>
          <p>
            Elle n'apparaît nulle part sur le site, n'est transmise à personne, et
            ne sert à aucun envoi commercial. Elle a deux usages, et deux
            seulement : t'envoyer le lien de confirmation, et te prévenir quand un
            visiteur commente une sortie que tu as proposée.
          </p>

          <h3>Base légale et durée de conservation</h3>
          <p>
            Le traitement repose sur ton consentement, donné au moment où tu
            remplis le formulaire et confirmé en cliquant sur le lien reçu par
            email. Les données liées à un contenu publié sont conservées tant que
            ce contenu reste en ligne. Une proposition non confirmée ou refusée est
            supprimée. Les empreintes d'adresses IP sont effacées après une heure.
          </p>

          <h3>Tes droits</h3>
          <p>
            Tu peux à tout moment demander l'accès à tes données, leur rectification
            ou leur suppression, ainsi que le retrait d'un commentaire ou d'une
            sortie que tu as publiée. Écris simplement à{" "}
            <a href={`mailto:${CONTACT}`}>{CONTACT}</a>, la demande sera traitée
            dans les meilleurs délais. Tu peux également introduire une réclamation
            auprès de l'Autorité de protection des données (
            <a href="https://www.autoriteprotectiondonnees.be" target="_blank" rel="noopener noreferrer">
              autoriteprotectiondonnees.be
            </a>
            ).
          </p>

          <h3>Cookies et mesure d'audience</h3>
          <p>
            Le site ne dépose aucun cookie publicitaire ni de mesure d'audience. Un
            seul cookie technique existe, créé uniquement lors d'une connexion à
            l'espace d'administration, et il ne concerne donc pas les visiteurs.
          </p>

          <h2>Contenus et droits</h2>
          <p>
            En proposant une sortie ou un commentaire, tu confirmes en être l'auteur
            et autorises sa publication sur ce site. Tu en restes propriétaire et
            peux en demander le retrait à tout moment. Les traces GPX sont mises à
            disposition à titre informatif : un itinéraire peut avoir changé, être
            devenu impraticable ou traverser une propriété privée. Chacun reste
            responsable de sa préparation et de sa sécurité.
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
            être là ? Écris à <a href={`mailto:${CONTACT}`}>{CONTACT}</a>, il sera
            examiné rapidement.
          </p>

          <p className="legal-updated">Dernière mise à jour : août 2026.</p>
        </article>
      </div>
    </>
  );
}
