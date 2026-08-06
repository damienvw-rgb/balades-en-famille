/**
 * Appel d'API robuste côté navigateur.
 * Une erreur serveur renvoie parfois une page HTML : tenter de la lire comme du
 * JSON échouerait sans message, laissant l'utilisateur devant un formulaire
 * inerte. On renvoie donc toujours quelque chose d'exploitable.
 */
export async function callApi(url, options = {}) {
  let res;
  try {
    res = await fetch(url, options);
  } catch {
    return { ok: false, data: { error: "Serveur injoignable. Vérifie ta connexion." } };
  }

  const type = res.headers.get("content-type") || "";
  if (!type.includes("application/json")) {
    return {
      ok: false,
      data: {
        error: `Réponse inattendue du serveur (${res.status}). C'est souvent une variable d'environnement manquante côté Vercel.`,
      },
    };
  }

  try {
    return { ok: res.ok, data: await res.json() };
  } catch {
    return { ok: false, data: { error: "Réponse illisible du serveur." } };
  }
}

export const postJson = (url, body) =>
  callApi(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
