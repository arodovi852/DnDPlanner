import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { useAuth } from './AuthContext';

/**
 * Directorio público de usuarios y relaciones de "seguir / dejar de seguir".
 *
 * Mientras no haya backend, el directorio se rellena con una lista mock
 * y además se añade automáticamente al usuario autenticado cuando inicia
 * sesión, para que los invite-flows y las membresías puedan referenciarlo.
 * Las relaciones de seguimiento se persisten en `localStorage`.
 */
export interface PublicUser {
  id: string;
  username: string;
  email?: string;
  avatar?: string;
}

export interface FollowEdge {
  followerId: string;
  followedId: string;
}

interface UsersContextValue {
  users: PublicUser[];
  follows: FollowEdge[];
  findById: (id: string) => PublicUser | null;
  findByUsername: (username: string) => PublicUser | null;
  searchUsers: (query: string) => PublicUser[];
  followUser: (followedId: string) => void;
  unfollowUser: (followedId: string) => void;
  isFollowing: (followedId: string, followerId?: string) => boolean;
  getFollowing: (userId: string) => PublicUser[];
  getFollowers: (userId: string) => PublicUser[];
  ensureUser: (input: { id: string; username: string; email?: string }) => void;
}

const UsersContext = createContext<UsersContextValue | undefined>(undefined);

const USERS_KEY = 'dndplanner:users';
const FOLLOWS_KEY = 'dndplanner:follows';

// Lista inicial de usuarios mock para que la UI nunca salga vacía.
const SEED_USERS: PublicUser[] = [
  { id: 'user-alba', username: 'Alba' },
  { id: 'user-diego', username: 'Diego' },
  { id: 'user-marta', username: 'Marta' },
  { id: 'user-lucia', username: 'Lucía' },
  { id: 'user-hugo', username: 'Hugo' },
  { id: 'user-sofia', username: 'Sofía' },
];

function readStoredUsers(): PublicUser[] {
  if (typeof window === 'undefined') return SEED_USERS;
  try {
    const raw = window.localStorage.getItem(USERS_KEY);
    if (!raw) return SEED_USERS;
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return SEED_USERS;
    // Merge con seed para no perder usuarios mock si localStorage fue truncado.
    const map = new Map<string, PublicUser>();
    for (const u of SEED_USERS) map.set(u.id, u);
    for (const u of parsed as PublicUser[]) {
      if (u?.id && u?.username) map.set(u.id, u);
    }
    return Array.from(map.values());
  } catch {
    return SEED_USERS;
  }
}

function readStoredFollows(): FollowEdge[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(FOLLOWS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as FollowEdge[]) : [];
  } catch {
    return [];
  }
}

export function UsersProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [users, setUsers] = useState<PublicUser[]>(() => readStoredUsers());
  const [follows, setFollows] = useState<FollowEdge[]>(() => readStoredFollows());

  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(USERS_KEY, JSON.stringify(users));
  }, [users]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(FOLLOWS_KEY, JSON.stringify(follows));
  }, [follows]);

  // Cada vez que cambia el usuario autenticado lo registramos en el directorio.
  useEffect(() => {
    if (!user) return;
    setUsers((prev) => {
      if (prev.some((u) => u.id === user.id)) return prev;
      return [
        ...prev,
        { id: user.id, username: user.username, email: user.email },
      ];
    });
  }, [user]);

  const ensureUser = useCallback(
    (input: { id: string; username: string; email?: string }) => {
      setUsers((prev) => {
        if (prev.some((u) => u.id === input.id)) return prev;
        return [...prev, { ...input }];
      });
    },
    []
  );

  const findById = useCallback(
    (id: string) => users.find((u) => u.id === id) ?? null,
    [users]
  );

  const findByUsername = useCallback(
    (username: string) => {
      const norm = username.trim().toLowerCase();
      return users.find((u) => u.username.toLowerCase() === norm) ?? null;
    },
    [users]
  );

  const searchUsers = useCallback(
    (query: string) => {
      const q = query.trim().toLowerCase();
      if (!q) return users;
      return users.filter(
        (u) =>
          u.username.toLowerCase().includes(q) ||
          (u.email ?? '').toLowerCase().includes(q)
      );
    },
    [users]
  );

  const followUser = useCallback(
    (followedId: string) => {
      if (!user) return;
      if (user.id === followedId) return;
      setFollows((prev) => {
        if (
          prev.some(
            (e) => e.followerId === user.id && e.followedId === followedId
          )
        ) {
          return prev;
        }
        return [...prev, { followerId: user.id, followedId }];
      });
    },
    [user]
  );

  const unfollowUser = useCallback(
    (followedId: string) => {
      if (!user) return;
      setFollows((prev) =>
        prev.filter(
          (e) => !(e.followerId === user.id && e.followedId === followedId)
        )
      );
    },
    [user]
  );

  const isFollowing = useCallback(
    (followedId: string, followerId?: string) => {
      const source = followerId ?? user?.id;
      if (!source) return false;
      return follows.some(
        (e) => e.followerId === source && e.followedId === followedId
      );
    },
    [follows, user]
  );

  const getFollowing = useCallback(
    (userId: string): PublicUser[] => {
      const ids = follows
        .filter((e) => e.followerId === userId)
        .map((e) => e.followedId);
      return ids
        .map((id) => users.find((u) => u.id === id))
        .filter((u): u is PublicUser => u !== undefined);
    },
    [follows, users]
  );

  const getFollowers = useCallback(
    (userId: string): PublicUser[] => {
      const ids = follows
        .filter((e) => e.followedId === userId)
        .map((e) => e.followerId);
      return ids
        .map((id) => users.find((u) => u.id === id))
        .filter((u): u is PublicUser => u !== undefined);
    },
    [follows, users]
  );

  const value = useMemo<UsersContextValue>(
    () => ({
      users,
      follows,
      findById,
      findByUsername,
      searchUsers,
      followUser,
      unfollowUser,
      isFollowing,
      getFollowing,
      getFollowers,
      ensureUser,
    }),
    [
      users,
      follows,
      findById,
      findByUsername,
      searchUsers,
      followUser,
      unfollowUser,
      isFollowing,
      getFollowing,
      getFollowers,
      ensureUser,
    ]
  );

  return <UsersContext.Provider value={value}>{children}</UsersContext.Provider>;
}

export function useUsers(): UsersContextValue {
  const ctx = useContext(UsersContext);
  if (!ctx) {
    throw new Error('useUsers debe usarse dentro de <UsersProvider>');
  }
  return ctx;
}
