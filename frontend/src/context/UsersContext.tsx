import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { useAuth } from './AuthContext';
import { authApi, followsApi, type BackendUser } from '../api';

/**
 * UsersContext.
 *
 * Backed by the API:
 *   - The current user's followers + following are fetched on login and
 *     kept in local state (`follows`).
 *   - `searchUsers` hits `/api/auth/users/search` (debounced by callers).
 *   - `findById` is cached locally; misses trigger a public-profile fetch.
 *
 * This context is intentionally chatty *only on demand* — for example,
 * the People page calls `searchUsers('')` to bulk-load, while
 * `MembersPanel` only resolves IDs it actually displays. The result is a
 * small in-memory directory keyed by id.
 */

export interface PublicUser {
  id: string;
  username: string;
  email?: string;
  avatar?: string;
  description?: string;
  isPrivate?: boolean;
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
  /** Async search; results are also merged into the local directory. */
  searchUsers: (query: string) => Promise<PublicUser[]>;
  followUser: (followedId: string) => Promise<void>;
  unfollowUser: (followedId: string) => Promise<void>;
  isFollowing: (followedId: string, followerId?: string) => boolean;
  getFollowing: (userId: string) => PublicUser[];
  getFollowers: (userId: string) => PublicUser[];
  /** Ensure a user with this id is in the local directory (fetches if missing). */
  ensureUser: (input: { id: string; username?: string; email?: string }) => void;
}

const UsersContext = createContext<UsersContextValue | undefined>(undefined);

function toPublicUser(u: BackendUser): PublicUser {
  return {
    id: u._id,
    username: u.username,
    email: u.email,
    avatar: u.avatar ?? undefined,
    description: u.description ?? undefined,
    isPrivate: u.isPrivate ?? false,
  };
}

export function UsersProvider({ children }: { children: ReactNode }) {
  const { user, isAuthenticated, status } = useAuth();
  const [users, setUsers] = useState<PublicUser[]>([]);
  const [follows, setFollows] = useState<FollowEdge[]>([]);
  // Track ids we've already requested a public-profile lookup for so
  // ensureUser doesn't issue duplicate requests during a render burst.
  const inflightLookups = useRef<Set<string>>(new Set());

  // ------------------------------------------------------------------
  // Hydrate the directory + follows graph after login.
  // ------------------------------------------------------------------
  useEffect(() => {
    if (status !== 'authenticated' || !isAuthenticated || !user) {
      setUsers([]);
      setFollows([]);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        // Bring my own profile into the directory so consumers can resolve
        // `user.id` even before any search.
        const meAsPublic: PublicUser = {
          id: user.id,
          username: user.username,
          email: user.email,
          avatar: user.avatar,
          description: user.description,
          isPrivate: user.isPrivate,
        };

        const [following, followers] = await Promise.all([
          followsApi.getFollowing(),
          followsApi.getFollowers(),
        ]);
        if (cancelled) return;

        const all = new Map<string, PublicUser>();
        all.set(meAsPublic.id, meAsPublic);
        for (const u of following.map(toPublicUser)) all.set(u.id, u);
        for (const u of followers.map(toPublicUser)) all.set(u.id, u);

        setUsers(Array.from(all.values()));
        setFollows([
          ...following.map((u) => ({ followerId: user.id, followedId: u._id })),
          ...followers.map((u) => ({ followerId: u._id, followedId: user.id })),
        ]);
      } catch {
        // Silent — UI works fine without the social graph; failures show
        // up via the auth context's error if relevant.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [status, isAuthenticated, user]);

  // Keep my own entry in the directory in sync with my profile edits.
  useEffect(() => {
    if (!user) return;
    setUsers((prev) => {
      const idx = prev.findIndex((u) => u.id === user.id);
      const next: PublicUser = {
        id: user.id,
        username: user.username,
        email: user.email,
        avatar: user.avatar,
        description: user.description,
        isPrivate: user.isPrivate,
      };
      if (idx === -1) return [...prev, next];
      const existing = prev[idx];
      if (
        existing.username === next.username &&
        existing.email === next.email &&
        existing.avatar === next.avatar &&
        existing.description === next.description &&
        existing.isPrivate === next.isPrivate
      ) {
        return prev;
      }
      const copy = [...prev];
      copy[idx] = { ...existing, ...next };
      return copy;
    });
  }, [user]);

  const upsertMany = useCallback((incoming: PublicUser[]) => {
    if (incoming.length === 0) return;
    setUsers((prev) => {
      const map = new Map(prev.map((u) => [u.id, u] as const));
      for (const u of incoming) map.set(u.id, { ...map.get(u.id), ...u });
      return Array.from(map.values());
    });
  }, []);

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
    async (query: string): Promise<PublicUser[]> => {
      const trimmed = query.trim();
      if (trimmed.length < 2) return [];
      try {
        const results = await authApi.searchUsers(trimmed);
        const mapped = results.map(toPublicUser);
        upsertMany(mapped);
        return mapped;
      } catch {
        return [];
      }
    },
    [upsertMany]
  );

  const ensureUser = useCallback(
    ({ id, username, email }: { id: string; username?: string; email?: string }) => {
      if (!id) return;
      // If we already know this id locally, don't call the API.
      let alreadyKnown = false;
      setUsers((prev) => {
        if (prev.some((u) => u.id === id)) {
          alreadyKnown = true;
          return prev;
        }
        // Insert a placeholder so consumers can render something while we fetch.
        return [...prev, { id, username: username ?? 'user', email }];
      });
      if (alreadyKnown) return;
      if (inflightLookups.current.has(id)) return;
      inflightLookups.current.add(id);
      (async () => {
        try {
          const u = await authApi.getPublicProfile(id);
          upsertMany([toPublicUser(u)]);
        } catch {
          // Profile is private or doesn't exist — keep the placeholder.
        } finally {
          inflightLookups.current.delete(id);
        }
      })();
    },
    [upsertMany]
  );

  const followUser = useCallback(
    async (followedId: string) => {
      if (!user || user.id === followedId) return;
      // Optimistic edge insertion.
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
      try {
        await followsApi.follow(followedId);
      } catch {
        // Roll back on failure.
        setFollows((prev) =>
          prev.filter(
            (e) => !(e.followerId === user.id && e.followedId === followedId)
          )
        );
      }
    },
    [user]
  );

  const unfollowUser = useCallback(
    async (followedId: string) => {
      if (!user) return;
      const before = follows;
      setFollows((prev) =>
        prev.filter(
          (e) => !(e.followerId === user.id && e.followedId === followedId)
        )
      );
      try {
        await followsApi.unfollow(followedId);
      } catch {
        // Roll back if the unfollow call failed.
        setFollows(before);
      }
    },
    [user, follows]
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
