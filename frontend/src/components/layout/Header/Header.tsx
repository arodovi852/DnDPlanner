import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Button } from '../../shared/Button';
import { Profile } from '../../shared/Profile';
import { AuthModal } from '../../shared/AuthModal';
import { useAuth } from '../../../context/AuthContext';

export interface HeaderProps {
  /** Oculta el logo (por ejemplo en la landing page cuando se muestra
   *  el logo como hero principal). */
  hideLogo?: boolean;
  /** Modo transparente: sin fondo propio — se funde con el fondo de
   *  la página. Usado en la landing page deslogueada. */
  transparent?: boolean;
}

/**
 * Cabecera principal.
 *
 * Layout:
 *   · Desktop / tablet  → logo a la izquierda, nav inline a la derecha.
 *   · Móvil (≤ 480px)   → logo a la izquierda, icono hamburguesa a la
 *                         derecha que abre un panel desplegable con
 *                         People / Templates / Profile / Log in.
 *
 * El panel se cierra automáticamente al navegar (cambio de ruta) para
 * evitar que se quede abierto encima del contenido.
 */
export function Header({ hideLogo = false, transparent = false }: HeaderProps) {
  const { t } = useTranslation();
  const { isAuthenticated, user } = useAuth();
  const [modalOpen, setModalOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  // Cerrar el menú al cambiar de ruta.
  useEffect(() => {
    setMenuOpen(false);
  }, [location.pathname]);

  const className =
    'header' +
    (transparent ? ' header--transparent' : '') +
    (menuOpen ? ' header--menu-open' : '');

  return (
    <>
      <header className={className}>
        {hideLogo ? (
          <span className="header__spacer" aria-hidden="true" />
        ) : (
          <Link to="/main" className="header__logo">
            DNDPLANNER
          </Link>
        )}

        <button
          type="button"
          className="header__menu-toggle"
          aria-label={t('header.menu')}
          aria-expanded={menuOpen}
          aria-controls="header-nav"
          onClick={() => setMenuOpen((v) => !v)}
        >
          <span className="header__menu-toggle-bar" aria-hidden="true" />
          <span className="header__menu-toggle-bar" aria-hidden="true" />
          <span className="header__menu-toggle-bar" aria-hidden="true" />
        </button>

        <nav
          id="header-nav"
          className="header__nav"
          aria-label={t('header.profile')}
        >
          {isAuthenticated ? (
            <Profile
              name={user?.username ?? t('header.profile')}
              image={user?.avatar}
              active
              onSelect={() => {
                setMenuOpen(false);
                navigate('/profile');
              }}
            />
          ) : (
            <Button
              size="small"
              onClick={() => {
                setMenuOpen(false);
                setModalOpen(true);
              }}
            >
              {t('header.logIn')}
            </Button>
          )}

          {isAuthenticated && (
            <Link to="/users" className="header__link">
              {t('header.people')}
            </Link>
          )}

          <Link to="/templates" className="header__link">
            {t('header.templates')}
          </Link>
        </nav>
      </header>

      <AuthModal open={modalOpen} onClose={() => setModalOpen(false)} />
    </>
  );
}

export default Header;
