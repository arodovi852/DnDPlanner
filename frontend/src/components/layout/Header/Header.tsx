import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
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
 * Muestra el logo a la izquierda (salvo que `hideLogo` sea true) y a
 * la derecha el botón Log In (o el componente Profile si el usuario
 * ya está autenticado) más el enlace a Templates.
 */
export function Header({ hideLogo = false, transparent = false }: HeaderProps) {
  const { isAuthenticated, user } = useAuth();
  const [modalOpen, setModalOpen] = useState(false);
  const navigate = useNavigate();

  const className = transparent ? 'header header--transparent' : 'header';

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

        <nav className="header__nav" aria-label="Navegación principal">
          {isAuthenticated ? (
            <Profile
              name={user?.username ?? 'Perfil'}
              active
              onSelect={() => navigate('/profile')}
            />
          ) : (
            <Button size="small" onClick={() => setModalOpen(true)}>
              Log In
            </Button>
          )}

          <Link to="/templates" className="header__link">
            Templates
          </Link>
        </nav>
      </header>

      <AuthModal open={modalOpen} onClose={() => setModalOpen(false)} />
    </>
  );
}

export default Header;
