import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

/**
 * Representación mínima de un usuario autenticado.
 *
 * El `id` es estable (persiste a través de logouts/logins del mismo usuario).
 * Mientras no haya backend, usamos una derivación determinista del username
 * para que dos usuarios con el mismo username (en este dispositivo) compartan id.
 */
export interface AuthUser {
  id: string;
  username: string;
  email?: string;
  description?: string;
  avatar?: string;
  /** Si está activo, el perfil no aparece en búsquedas y la página
   *  pública responde con "perfil privado" salvo para DMs que tengan
   *  a este usuario como jugador en una de sus campañas. */
  isPrivate?: boolean;
}

interface AuthContextValue {
  user: AuthUser | null;
  isAuthenticated: boolean;
  login: (input: { username: string; email?: string }) => void;
  logout: () => void;
  updateUser: (patch: Partial<Omit<AuthUser, 'id'>>) => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

const STORAGE_KEY = 'dndplanner:user';
/** Diccionario id → datos editables del perfil (avatar, descripción,
 *  privacidad). Se conserva al cerrar sesión, así que cuando el mismo
 *  usuario vuelva a entrar recupera sus ajustes. */
const PROFILES_KEY = 'dndplanner:profiles';

type StoredProfile = Pick<AuthUser, 'avatar' | 'description' | 'isPrivate'>;

function slugifyId(name: string): string {
  return `user-${name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'anon'}`;
}

function readStoredProfiles(): Record<string, StoredProfile> {
  if (typeof window === 'undefined') return {};
  try {
    const raw = window.localStorage.getItem(PROFILES_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return {};
    return parsed as Record<string, StoredProfile>;
  } catch {
    return {};
  }
}

function writeStoredProfiles(profiles: Record<string, StoredProfile>) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(PROFILES_KEY, JSON.stringify(profiles));
}

function readStoredUser(): AuthUser | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<AuthUser>;
    if (!parsed.username) return null;
    const id = parsed.id ?? slugifyId(parsed.username);
    const stored = readStoredProfiles()[id];
    return {
      id,
      username: parsed.username,
      email: parsed.email,
      description: parsed.description ?? stored?.description,
      avatar: parsed.avatar ?? stored?.avatar,
      isPrivate: parsed.isPrivate ?? stored?.isPrivate,
    };
  } catch {
    return null;
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(() => readStoredUser());

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (user) {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
    } else {
      window.localStorage.removeItem(STORAGE_KEY);
    }
  }, [user]);

  const login = useCallback((input: { username: string; email?: string }) => {
    const id = slugifyId(input.username);
    const stored = readStoredProfiles()[id];
    setUser({
      id,
      username: input.username,
      email: input.email,
      avatar: stored?.avatar,
      description: stored?.description,
      isPrivate: stored?.isPrivate,
    });
  }, []);

  const logout = useCallback(() => {
    setUser(null);
  }, []);

  const updateUser = useCallback(
    (patch: Partial<Omit<AuthUser, 'id'>>) => {
      setUser((prev) => {
        if (!prev) return prev;
        const next = { ...prev, ...patch };
        const all = readStoredProfiles();
        all[next.id] = {
          avatar: next.avatar,
          description: next.description,
          isPrivate: next.isPrivate,
        };
        writeStoredProfiles(all);
        return next;
      });
    },
    []
  );

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      isAuthenticated: user !== null,
      login,
      logout,
      updateUser,
    }),
    [user, login, logout, updateUser]
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
