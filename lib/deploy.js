/**
 * Reconstruction du site.
 *
 * Les fiches de sortie sont statiques : elles ne changent qu'au build. Dès
 * qu'une donnée qu'elles affichent bouge dans le stockage (publication,
 * retrait, correction, changement de pseudo d'un auteur), il faut redemander
 * un déploiement à Vercel, sinon la page en ligne garde l'ancienne version.
 *
 * Sans VERCEL_DEPLOY_HOOK_URL, la fonction ne fait rien et le dit : le site
 * doit continuer à tourner sans aucune variable d'environnement.
 */
export async function triggerRebuild() {
  const hook = process.env.VERCEL_DEPLOY_HOOK_URL;
  if (!hook) return { triggered: false, reason: "aucun-deploy-hook" };
  try {
    await fetch(hook, { method: "POST" });
    return { triggered: true };
  } catch {
    return { triggered: false, reason: "appel-echoue" };
  }
}
