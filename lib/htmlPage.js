/** Petite page HTML autonome, servie par les routes de confirmation. */
export function htmlPage(title, message, href = "/", linkLabel = "Revenir au site") {
  const esc = (t) =>
    String(t).replace(/[<>&]/g, (c) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;" }[c]));

  return `<!doctype html><html lang="fr"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="noindex">
<title>${esc(title)}</title>
<style>
body{margin:0;min-height:100vh;display:grid;place-items:center;background:#161d18;
color:#eef2ea;font-family:system-ui,-apple-system,sans-serif;padding:24px}
.box{max-width:34rem;text-align:center}
h1{font-size:1.5rem;margin:0 0 12px;font-weight:600}
p{color:#b7c4b6;line-height:1.6;margin:0 0 24px}
a{display:inline-block;background:#c1542d;color:#fff;text-decoration:none;
padding:10px 18px;border-radius:4px;font-size:.9rem}
a:hover{background:#a3441f}
</style></head><body><div class="box">
<h1>${esc(title)}</h1><p>${esc(message)}</p>
<a href="${href}">${esc(linkLabel)}</a>
</div></body></html>`;
}
