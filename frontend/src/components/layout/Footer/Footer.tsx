import { Link } from 'react-router-dom';

const NAV_LINKS = [
  { label: 'About', to: '/about' },
  { label: 'Contact', to: '/contact' },
  { label: 'News', to: '/news' },
  { label: 'Terms', to: '/terms' },
  { label: 'Privacy', to: '/privacy' },
  { label: 'API', to: '/api' },
  { label: 'Roadmap', to: '/roadmap' },
];

/**
 * Pie de página con enlaces legales/navegación y redes sociales.
 * Los iconos SVG son inline para no depender de librerías externas.
 */
export function Footer() {
  return (
    <footer className="footer" aria-label="Pie de página">
      <nav className="footer__nav" aria-label="Enlaces del pie">
        {NAV_LINKS.map((link) => (
          <Link key={link.to} to={link.to} className="footer__link">
            {link.label}
          </Link>
        ))}
      </nav>

      <div className="footer__socials">
        <a
          href="https://www.linkedin.com"
          className="footer__social"
          aria-label="LinkedIn"
          target="_blank"
          rel="noreferrer noopener"
        >
          <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path d="M4.98 3.5a2.5 2.5 0 1 1 0 5 2.5 2.5 0 0 1 0-5zM3 9h4v12H3V9zm7 0h3.8v1.7h.1c.5-1 1.9-2 3.9-2 4.2 0 5 2.7 5 6.3V21h-4v-5.3c0-1.3 0-2.9-1.8-2.9s-2.1 1.4-2.1 2.8V21h-4V9z" />
          </svg>
        </a>
        <a
          href="https://x.com"
          className="footer__social"
          aria-label="X (Twitter)"
          target="_blank"
          rel="noreferrer noopener"
        >
          <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path d="M18.244 2H21l-6.51 7.44L22 22h-6.828l-4.77-6.24L4.8 22H2l7.015-8.02L2 2h6.914l4.32 5.72L18.244 2zm-2.39 18.03h1.86L7.24 3.86H5.26l10.594 16.17z" />
          </svg>
        </a>
        <a
          href="https://facebook.com"
          className="footer__social"
          aria-label="Facebook"
          target="_blank"
          rel="noreferrer noopener"
        >
          <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path d="M13.5 21v-8h2.7l.4-3.1h-3.1V7.9c0-.9.3-1.5 1.6-1.5h1.7V3.6c-.3 0-1.3-.1-2.4-.1-2.4 0-4 1.4-4 4v2.3H7.7V13h2.6v8h3.2z" />
          </svg>
        </a>
        <a
          href="https://instagram.com"
          className="footer__social"
          aria-label="Instagram"
          target="_blank"
          rel="noreferrer noopener"
        >
          <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path d="M12 2.2c3.2 0 3.6 0 4.8.1 1.2.1 1.9.2 2.3.4.6.2 1 .5 1.5 1s.8.9 1 1.5c.2.4.3 1.1.4 2.3.1 1.2.1 1.6.1 4.8s0 3.6-.1 4.8c-.1 1.2-.2 1.9-.4 2.3-.2.6-.5 1-1 1.5s-.9.8-1.5 1c-.4.2-1.1.3-2.3.4-1.2.1-1.6.1-4.8.1s-3.6 0-4.8-.1c-1.2-.1-1.9-.2-2.3-.4-.6-.2-1-.5-1.5-1s-.8-.9-1-1.5c-.2-.4-.3-1.1-.4-2.3C2.2 15.6 2.2 15.2 2.2 12s0-3.6.1-4.8c.1-1.2.2-1.9.4-2.3.2-.6.5-1 1-1.5s.9-.8 1.5-1c.4-.2 1.1-.3 2.3-.4C8.4 2.2 8.8 2.2 12 2.2zm0 1.8c-3.1 0-3.5 0-4.7.1-1 .1-1.5.2-1.9.3-.5.2-.8.4-1.2.7-.3.3-.5.7-.7 1.2-.1.4-.3.9-.3 1.9-.1 1.2-.1 1.6-.1 4.7s0 3.5.1 4.7c.1 1 .2 1.5.3 1.9.2.5.4.8.7 1.2.3.3.7.5 1.2.7.4.1.9.3 1.9.3 1.2.1 1.6.1 4.7.1s3.5 0 4.7-.1c1-.1 1.5-.2 1.9-.3.5-.2.8-.4 1.2-.7.3-.3.5-.7.7-1.2.1-.4.3-.9.3-1.9.1-1.2.1-1.6.1-4.7s0-3.5-.1-4.7c-.1-1-.2-1.5-.3-1.9-.2-.5-.4-.8-.7-1.2-.3-.3-.7-.5-1.2-.7-.4-.1-.9-.3-1.9-.3C15.5 4 15.1 4 12 4zm0 3.1a4.9 4.9 0 1 1 0 9.8 4.9 4.9 0 0 1 0-9.8zm0 1.8a3.1 3.1 0 1 0 0 6.2 3.1 3.1 0 0 0 0-6.2zm5.1-2.1a1.1 1.1 0 1 1 0 2.2 1.1 1.1 0 0 1 0-2.2z" />
          </svg>
        </a>
      </div>
    </footer>
  );
}

export default Footer;
