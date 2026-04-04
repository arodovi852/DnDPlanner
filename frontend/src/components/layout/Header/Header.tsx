import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '../../shared/Button';
import { Profile } from '../../shared/Profile';
import { AuthModal } from '../../shared/AuthModal';
import { useAuth } from '../../../context/AuthContext';

/**
 * Cabecera principal.
 *
 * Estructura:
 *   - Logo a la izquierda, enlaza con /main.
 *   - Nav a la derecha: "Templates" + (Log In | Profile).
 *
 * Cuando el usuario no está autenticado muestra el botón Log In que
 * abre el `AuthModal`. Cuando ya lo está, el botón se reemplaza por
 * el componente `Profile`, que navega a /profile.
 */
export function Header() {
  const { isAuthenticated, user } = useAuth();
  const [modalOpen, setModalOpen] = useState(false);
  const navigate = useNavigate();

  return (
    <>
      <header className="header">
        <Link to="/main" className="header__logo">
          DNDPLANNER
        </Link>

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
