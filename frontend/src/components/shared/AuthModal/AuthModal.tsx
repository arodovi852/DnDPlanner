import { useEffect, useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
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
 */
export function AuthModal({ open, initialMode = 'login', onClose }: AuthModalProps) {
  const { t } = useTranslation();
  const { login } = useAuth();
  const [mode, setMode] = useState<AuthMode>(initialMode);
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);

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
        setError(t('auth.passwordsDontMatch'));
        return;
      }
      login({ username, email });
    } else {
      login({ username });
    }

    onClose();
  };

  const isLogin = mode === 'login';
  const title = isLogin ? t('auth.welcomeBack') : t('auth.createAccount');

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
          aria-label={t('common.close')}
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
            placeholder={isLogin ? t('auth.usernameEmail') : t('auth.username')}
            aria-label={isLogin ? t('auth.usernameEmail') : t('auth.username')}
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
            autoComplete="username"
          />

          {!isLogin && (
            <input
              className="auth-modal__field"
              type="email"
              placeholder={t('auth.email')}
              aria-label={t('auth.email')}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
            />
          )}

          <input
            className="auth-modal__field"
            type="password"
            placeholder={t('auth.password')}
            aria-label={t('auth.password')}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            autoComplete={isLogin ? 'current-password' : 'new-password'}
          />

          {!isLogin && (
            <input
              className="auth-modal__field"
              type="password"
              placeholder={t('auth.confirmPassword')}
              aria-label={t('auth.confirmPassword')}
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
              {isLogin ? t('auth.logIn') : t('auth.createAccountAction')}
            </Button>
          </div>
        </form>

        <button
          type="button"
          className="auth-modal__switch"
          onClick={() => setMode(isLogin ? 'register' : 'login')}
        >
          {isLogin ? t('auth.newHere') : t('auth.alreadyHave')}
        </button>
      </div>
    </div>
  );
}

export default AuthModal;
