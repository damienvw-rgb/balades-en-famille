import { requireAdmin } from "@/lib/admin";
import { listComments, deleteComment, saveComment, getComment } from "@/lib/store";
import { getAllRideSlugs } from "@/lib/rides";

export default async function handler(req, res) {
  if (!requireAdmin(req, res)) return;

  if (req.method === "GET") {
    const slugs = await getAllRideSlugs();
    const all = [];
    for (const slug of slugs) {
      for (const c of await listComments(slug)) {
        // L'adresse reste côté serveur, même pour l'administrateur :
        // seule son empreinte permet de repérer un récidiviste.
        const { email, ...rest } = c;
        all.push(rest);
      }
    }
    all.sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || ""));
    return res.status(200).json({ comments: all });
  }

  if (req.method !== "POST") {
    res.setHeader("Allow", "GET, POST");
    return res.status(405).json({ error: "Méthode non autorisée." });
  }

  const { action, ride, commentId } = req.body || {};

  if (action === "delete") {
    await deleteComment(ride, commentId);
    return res.status(200).json({ ok: true });
  }

  if (action === "unpublish") {
    const comment = await getComment(ride, commentId);
    if (!comment) return res.status(404).json({ error: "Commentaire introuvable." });
    comment.status = "hidden";
    await saveComment(comment);
    return res.status(200).json({ ok: true });
  }

  return res.status(400).json({ error: "Action inconnue." });
}
