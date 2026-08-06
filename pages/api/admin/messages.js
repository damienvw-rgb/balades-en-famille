import { requireAdmin } from "@/lib/admin";
import { listMessages, deleteMessage } from "@/lib/store";

export default async function handler(req, res) {
  if (!requireAdmin(req, res)) return;

  if (req.method === "GET") {
    return res.status(200).json({ messages: await listMessages() });
  }

  if (req.method !== "POST") {
    res.setHeader("Allow", "GET, POST");
    return res.status(405).json({ error: "Méthode non autorisée." });
  }

  if (req.body?.action === "delete") {
    await deleteMessage(req.body.messageId);
    return res.status(200).json({ ok: true });
  }

  return res.status(400).json({ error: "Action inconnue." });
}
