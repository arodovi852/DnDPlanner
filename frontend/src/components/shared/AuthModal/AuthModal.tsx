import { useEffect, useState, type FormEvent } from 'react';
import { Button } from '../Button';
import { useAuth } from '../../../context/AuthContext';

type AuthMode = 'login' | 'register';

/**
 * Props del componente AuthModal.
 */
export interface AuthModalProps {
  /** Si el modal está visible. */
  open: boolean;
  /** Modo inicial: inicio de sesión o creación de cuenta. */
  initialMode?: AuthMode;
  /** Handler para cerrar el modal. */
  onClose: () => void;
}

/**
 * Modal de autenticación. Gestiona dos modos:
 * - login: campos Username/Email + Password.
 * - register: Username, Email, Password, Confirm password.
 *
 * Al enviar correctamente llama a `login()` del AuthContext y cierra
 * el modal. La integración con el backend se añadirá en el futuro.
 */
export function AuthModal({ open, initialMode = 'login', onClose }: AuthModalProps) {
  const { login } = useAuth();
  const [mode, setMode] = useState<AuthMode>(initialMode);
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);

  // Resetea el formulario cada vez que se abre.
  useEffect(() => {
    if (open) {
      setMode(initialMode);
      setUsername('');
      setEmail('');
      setPassword('');
      setConfirmPassword('');
      setError(null);
    }
  }, [open, initialMode]);

  // Cierra con Escape (accesibilidad)
  useEffect(() => {
    if (!open) return;
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [open, onClose]);

  if (!open) return null;

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);

    if (mode === 'register') {
      if (password !== confirmPassword) {
        setError('Las contraseñas no coinciden');
        return;
      }
      login({ username, email });
    } else {
      // En login `username` puede ser username o email.
      login({ username });
    }

    onClose();
  };

  const isLogin = mode === 'login';
  const title = isLogin ? 'Welcome back!' : 'Create an account';

  return (
    <div
      className="auth-modal-backdrop"
      role="presentation"
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        className="auth-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="auth-modal-title"
      >
        <button
          type="button"
          className="auth-modal__close"
          aria-label="Cerrar"
          onClick={onClose}
        >
          ×
        </button>

        <h2 id="auth-modal-title" className="auth-modal__title">
          {title}
        </h2>

        <form className="auth-modal__form" onSubmit={handleSubmit}>
          <input
            className="auth-modal__field"
            type="text"
            placeholder={isLogin ? 'Username / Email' : 'Username'}
            aria-label={isLogin ? 'Nombre de usuario o email' : 'Nombre de usuario'}
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
            autoComplete={isLogin ? 'username' : 'username'}
          />

          {!isLogin && (
            <input
              className="auth-modal__field"
              type="email"
              placeholder="Email"
              aria-label="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
            />
          )}

          <input
            className="auth-modal__field"
            type="password"
            placeholder="Password"
            aria-label="Contraseña"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            autoComplete={isLogin ? 'current-password' : 'new-password'}
          />

          {!isLogin && (
            <input
              className="auth-modal__field"
              type="password"
              placeholder="Confirm password"
              aria-label="Confirmar contraseña"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              autoComplete="new-password"
            />
          )}

          {error && (
            <p role="alert" style={{ margin: 0, color: 'var(--color-primary-hover)' }}>
              {error}
            </p>
          )}

          <div className="auth-modal__actions">
            <Button type="submit" size="small">
              {isLogin ? 'Log In' : 'Create account'}
            </Button>
          </div>
        </form>

        <button
          type="button"
          className="auth-modal__switch"
          onClick={() => setMode(isLogin ? 'register' : 'login')}
        >
          {isLogin
            ? 'New here? Create an account!'
            : 'Already have an account? Log in'}
        </button>
      </div>
    </div>
  );
}

export default AuthModal;
