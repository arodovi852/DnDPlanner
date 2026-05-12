import { useEffect, useRef, useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '../Button';
import { useAuth } from '../../../context/AuthContext';
import { authApi } from '../../../api/auth';

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
 * - login: campos username/email + password.
 * - register: username, email, password, confirm password.
 *
 * Llama a `authApi.login` / `authApi.register` a través de `useAuth()`.
 * Mantiene estado local de loading y muestra los errores que devuelve la
 * API (validación o credenciales inválidas).
 */
export function AuthModal({ open, initialMode = 'login', onClose }: AuthModalProps) {
  const { t } = useTranslation();
  const { login, register } = useAuth();
  const [mode, setMode] = useState<AuthMode>(initialMode);
  const [identifier, setIdentifier] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [usernameAvailable, setUsernameAvailable] = useState<boolean | null>(null);
  const [emailAvailable, setEmailAvailable] = useState<boolean | null>(null);
  const checkTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (open) {
      setMode(initialMode);
      setIdentifier('');
      setUsername('');
      setEmail('');
      setPassword('');
      setConfirmPassword('');
      setError(null);
      setSubmitting(false);
      setUsernameAvailable(null);
      setEmailAvailable(null);
    }
  }, [open, initialMode]);

  // Debounced availability check for username and email in register mode
  useEffect(() => {
    if (mode !== 'register') return;
    if (checkTimerRef.current) clearTimeout(checkTimerRef.current);
    const trimUser = username.trim();
    const trimEmail = email.trim();
    if (!trimUser && !trimEmail) return;

    checkTimerRef.current = setTimeout(() => {
      const params: { username?: string; email?: string } = {};
      if (trimUser.length >= 3) params.username = trimUser;
      if (trimEmail.includes('@')) params.email = trimEmail;
      if (!params.username && !params.email) return;

      void authApi.checkAvailability(params).then((result) => {
        if (result.username !== undefined) setUsernameAvailable(result.username);
        if (result.email !== undefined) setEmailAvailable(result.email);
      }).catch(() => {});
    }, 500);

    return () => {
      if (checkTimerRef.current) clearTimeout(checkTimerRef.current);
    };
  }, [mode, username, email]);

  useEffect(() => {
    if (!open) return;
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [open, onClose]);

  if (!open) return null;

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);

    if (mode === 'register') {
      if (password !== confirmPassword) {
        setError(t('auth.passwordsDontMatch'));
        return;
      }
      if (usernameAvailable === false) {
        setError(t('auth.usernameTaken'));
        return;
      }
      if (emailAvailable === false) {
        setError(t('auth.emailTaken'));
        return;
      }
    }

    setSubmitting(true);
    try {
      if (mode === 'register') {
        await register({ username, email, password });
      } else {
        await login({ identifier, password });
      }
      onClose();
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : typeof err === 'string'
            ? err
            : t('auth.unexpectedError');
      setError(message);
    } finally {
      setSubmitting(false);
    }
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
          {isLogin ? (
            <input
              className="auth-modal__field"
              type="text"
              placeholder={t('auth.usernameEmail')}
              aria-label={t('auth.usernameEmail')}
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              required
              autoComplete="username"
              disabled={submitting}
            />
          ) : (
            <>
              <div className="auth-modal__field-wrap">
                <input
                  className={
                    'auth-modal__field' +
                    (usernameAvailable === false ? ' auth-modal__field--error' : '') +
                    (usernameAvailable === true ? ' auth-modal__field--ok' : '')
                  }
                  type="text"
                  placeholder={t('auth.username')}
                  aria-label={t('auth.username')}
                  value={username}
                  onChange={(e) => {
                    setUsername(e.target.value);
                    setUsernameAvailable(null);
                  }}
                  required
                  autoComplete="username"
                  minLength={3}
                  maxLength={30}
                  pattern="[a-zA-Z0-9_]+"
                  title={t('auth.usernameRules') ?? undefined}
                  disabled={submitting}
                />
                {usernameAvailable === false && (
                  <span className="auth-modal__field-hint auth-modal__field-hint--error">
                    {t('auth.usernameTaken')}
                  </span>
                )}
              </div>
              <div className="auth-modal__field-wrap">
                <input
                  className={
                    'auth-modal__field' +
                    (emailAvailable === false ? ' auth-modal__field--error' : '') +
                    (emailAvailable === true ? ' auth-modal__field--ok' : '')
                  }
                  type="email"
                  placeholder={t('auth.email')}
                  aria-label={t('auth.email')}
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    setEmailAvailable(null);
                  }}
                  required
                  autoComplete="email"
                  disabled={submitting}
                />
                {emailAvailable === false && (
                  <span className="auth-modal__field-hint auth-modal__field-hint--error">
                    {t('auth.emailTaken')}
                  </span>
                )}
              </div>
            </>
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
            minLength={6}
            disabled={submitting}
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
              minLength={6}
              disabled={submitting}
            />
          )}

          {error && (
            <p role="alert" style={{ margin: 0, color: 'var(--color-primary-hover)' }}>
              {error}
            </p>
          )}

          <div className="auth-modal__actions">
            <Button type="submit" size="small" disabled={submitting}>
              {submitting
                ? t('auth.submitting')
                : isLogin
                  ? t('auth.logIn')
                  : t('auth.createAccountAction')}
            </Button>
          </div>
        </form>

        <button
          type="button"
          className="auth-modal__switch"
          onClick={() => setMode(isLogin ? 'register' : 'login')}
          disabled={submitting}
        >
          {isLogin ? t('auth.newHere') : t('auth.alreadyHave')}
        </button>
      </div>
    </div>
  );
}

export default AuthModal;
