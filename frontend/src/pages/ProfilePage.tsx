import { useAuth } from '../context/AuthContext';

/**
 * Página de perfil de usuario (/profile).
 * Muestra información básica del usuario autenticado y permite
 * cerrar sesión.
 */
export function ProfilePage() {
  const { user, logout } = useAuth();

  return (
    <section aria-labelledby="profile-heading" style={{ padding: 'var(--space-xl)' }}>
      <h1 id="profile-heading">Perfil</h1>
      {user ? (
        <>
          <p>Sesión iniciada como <strong>{user.username}</strong>.</p>
          {user.email && <p>Email: {user.email}</p>}
          <button type="button" className="button button--small" onClick={logout}>
            Cerrar sesión
          </button>
        </>
      ) : (
        <p>No hay sesión iniciada.</p>
      )}
    </section>
  );
}

export default ProfilePage;
