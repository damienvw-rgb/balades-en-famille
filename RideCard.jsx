import Link from "next/link";

export default function SiteFooter() {
  return (
    <footer className="site-footer">
      <nav className="footer-links">
        <Link href="/proposer">Proposer une sortie</Link>
        <Link href="/contact">Contact</Link>
        <Link href="/mentions-legales">Mentions légales</Link>
      </nav>
    </footer>
  );
}
