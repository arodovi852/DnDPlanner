import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import {
  authApi,
  ApiError,
  hasTokens,
  clearTokens,
  closeSocket,
  type BackendUser,
} from '../api';

/**
 * AuthContext.
 *
 * Source of truth for the currently authenticated user. Talks to the
 * backend via the `/auth/*` endpoints; the JWT pair is persisted in
 * localStorage by the API client so that a page reload keeps the user
 * signed in.
 *
 * The shape exposed to components keeps the *frontend* friendly fields
 * (`id`, `description`, `avatar`, `isPrivate`) and translates the
 * backend's `_id` into `id` so the rest of the app keeps working.
 */
export interface AuthUser {
  /** MongoDB ObjectId of the user (string form). */
  id: string;
  username: string;
  email?: string;
  description?: string;
  avatar?: string;
  /**
   * If `true`, the user does not appear in search and their public
   * profile is gated. The DM-of-player exception is enforced on the
   * server; the frontend just trusts the response.
   */
  isPrivate?: boolean;
}

/** Status reported to consumers so they can render loading states. */
export type AuthStatus = 'idle' | 'authenticating' | 'authenticated' | 'unauthenticated';

interface AuthContextValue {
  user: AuthUser | null;
  status: AuthStatus;
  isAuthenticated: boolean;
  /**
   * True when the active session is the offline demo account. Consumers
   * use this to bypass network calls and persist state to localStorage
   * instead — see CampaignContext for the concrete fallback paths.
   */
  isDemo: boolean;
  /** Last error from a login/register/update attempt (cleared on success). */
  error: string | null;
  login: (input: { identifier: string; password: string }) => Promise<void>;
  register: (input: {
    username: string;
    email: string;
    password: string;
  }) => Promise<void>;
  logout: () => Promise<void>;
  /** Patch the authenticated user's profile (username/email/avatar/description/privacy). */
  updateUser: (
    patch: Partial<Omit<AuthUser, 'id'>> & { isPrivate?: boolean }
  ) => Promise<void>;
  /** Change the current user's password. Re-issues tokens on success. */
  changePassword: (input: {
    currentPassword: string;
    newPassword: string;
  }) => Promise<void>;
}

/** Stable id of the offline demo account — used by other contexts to gate API calls. */
export const DEMO_USER_ID = 'demo-testing-user';

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

// Hardcoded demo user — logs in locally even if the backend is unreachable.
// Credentials: username=Testing  password=1234QWer
const DEMO_CREDENTIALS = { identifier: 'Testing', password: '1234QWer' };
const DEMO_USER: AuthUser = {
  id: DEMO_USER_ID,
  username: 'Testing',
  email: 'testing@dndplanner.local',
  description: 'Cuenta de prueba para presentaciones.',
  isPrivate: false,
};
const DEMO_PROFILE_KEY = 'dndplanner:demo:profile';

function readDemoProfile(): AuthUser {
  if (typeof window === 'undefined') return DEMO_USER;
  try {
    const raw = window.localStorage.getItem(DEMO_PROFILE_KEY);
    if (!raw) return DEMO_USER;
    const parsed = JSON.parse(raw) as Partial<AuthUser>;
    return { ...DEMO_USER, ...parsed, id: DEMO_USER_ID };
  } catch {
    return DEMO_USER;
  }
}

function writeDemoProfile(u: AuthUser): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(DEMO_PROFILE_KEY, JSON.stringify(u));
  } catch {
    // Quota errors are not actionable for the user; fall through.
  }
}

function toAuthUser(u: BackendUser): AuthUser {
  return {
    id: u._id,
    username: u.username,
    email: u.email,
    avatar: u.avatar ?? undefined,
    description: u.description ?? undefined,
    isPrivate: u.isPrivate ?? false,
  };
}

/** Best-effort error → human-readable message. */
function describeError(err: unknown): string {
  if (err instanceof ApiError) {
    if (err.body?.errors && err.body.errors.length > 0) {
      return err.body.errors.map((e) => e.msg).filter(Boolean).join(', ');
    }
    return err.message;
  }
  if (err instanceof Error) return err.message;
  return 'Unexpected error';
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [status, setStatus] = useState<AuthStatus>(
    hasTokens() ? 'authenticating' : 'unauthenticated'
  );
  const [error, setError] = useState<string | null>(null);

  // On mount, if we have a stored access token, fetch /auth/me to hydrate
  // the user. If that fails (token expired, user deleted) we clear tokens
  // and fall back to unauthenticated.
  useEffect(() => {
    let cancelled = false;
    async function hydrate() {
      if (!hasTokens()) {
        setStatus('unauthenticated');
        return;
      }
      try {
        const u = await authApi.me();
        if (cancelled) return;
        setUser(toAuthUser(u));
        setStatus('authenticated');
      } catch {
        if (cancelled) return;
        clearTokens();
        setStatus('unauthenticated');
      }
    }
    hydrate();
    return () => {
      cancelled = true;
    };
  }, []);

  const login = useCallback(
    async (input: { identifier: string; password: string }) => {
      setError(null);
      setStatus('authenticating');

      // Demo fallback: works even when the backend is unreachable.
      // Profile persists in localStorage so refresh + edits survive.
      if (
        input.identifier === DEMO_CREDENTIALS.identifier &&
        input.password === DEMO_CREDENTIALS.password
      ) {
        setUser(readDemoProfile());
        setStatus('authenticated');
        return;
      }

      try {
        const u = await authApi.login(input);
        setUser(toAuthUser(u));
        setStatus('authenticated');
      } catch (err) {
        setStatus('unauthenticated');
        const msg = describeError(err);
        setError(msg);
        throw err;
      }
    },
    []
  );

  const register = useCallback(
    async (input: { username: string; email: string; password: string }) => {
      setError(null);
      setStatus('authenticating');
      try {
        const u = await authApi.register(input);
        setUser(toAuthUser(u));
        setStatus('authenticated');
      } catch (err) {
        setStatus('unauthenticated');
        const msg = describeError(err);
        setError(msg);
        throw err;
      }
    },
    []
  );

  const logout = useCallback(async () => {
    // Demo session has no server-side state to revoke. We also leave the
    // localStorage demo data (campaigns + profile) intact so the next
    // demo login picks up exactly where this one left off.
    if (user?.id !== DEMO_USER_ID) {
      try {
        await authApi.logout();
      } catch {
        // Even if the server call fails (offline, expired token), drop the
        // client-side session. The user clicked "log out" — respect that.
      }
    }
    // Tear the socket down so the next login gets a fresh connection
    // (and stops receiving events from rooms the previous user was in).
    closeSocket();
    setUser(null);
    setStatus('unauthenticated');
  }, [user]);

  const updateUser = useCallback(
    async (patch: Partial<Omit<AuthUser, 'id'>>) => {
      setError(null);
      // Demo session: edits stay local (no API call).
      if (user?.id === DEMO_USER_ID) {
        const next: AuthUser = { ...user, ...patch, id: DEMO_USER_ID };
        setUser(next);
        writeDemoProfile(next);
        return;
      }
      try {
        const u = await authApi.updateProfile({
          username: patch.username,
          email: patch.email,
          avatar: patch.avatar ?? undefined,
          description: patch.description,
          isPrivate: patch.isPrivate,
        });
        setUser(toAuthUser(u));
      } catch (err) {
        setError(describeError(err));
        throw err;
      }
    },
    [user]
  );

  const changePassword = useCallback(
    async (input: { currentPassword: string; newPassword: string }) => {
      setError(null);
      if (user?.id === DEMO_USER_ID) return; // no-op for demo
      try {
        await authApi.changePassword(input);
      } catch (err) {
        setError(describeError(err));
        throw err;
      }
    },
    [user]
  );

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      status,
      isAuthenticated: status === 'authenticated' && user !== null,
      isDemo: user?.id === DEMO_USER_ID,
      error,
      login,
      register,
      logout,
      updateUser,
      changePassword,
    }),
    [user, status, error, login, register, logout, updateUser, changePassword]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth debe usarse dentro de <AuthProvider>');
  }
  return ctx;
}
