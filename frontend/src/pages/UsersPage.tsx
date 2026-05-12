import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Profile } from '../components/shared/Profile';
import { FollowButton } from '../components/shared/FollowButton';
import { useAuth } from '../context/AuthContext';
import { useUsers, type PublicUser } from '../context/UsersContext';
import { useCampaigns } from '../context/CampaignContext';

/**
 * /users — directorio de usuarios con búsqueda + acciones sociales.
 *
 * Reglas de visibilidad:
 *   · Los usuarios con `isPrivate` no salen en la lista ni en búsqueda…
 *   · …salvo que el usuario actual sea DM/co-DM de una campaña en la
 *     que el privado figure como `player` (puede pasar después de un
 *     join por enlace).
 *
 * Orden por relación cuando no hay búsqueda activa:
 *   1. Mutuos (te siguen y les sigues)
 *   2. Solo les sigues
 *   3. Solo te siguen
 *   4. Resto
 */
type Tab = 'all' | 'following' | 'followers';

export function UsersPage() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { users, searchUsers, getFollowing, getFollowers, isFollowing } = useUsers();
  const { campaigns } = useCampaigns();

  const [tab, setTab] = useState<Tab>('all');
  const [query, setQuery] = useState('');

  // Load all public users once when the page mounts so the "All" tab is
  // populated even before the user types anything.
  const { status } = useAuth();
  useEffect(() => {
    if (status !== 'authenticated') return;
    void searchUsers('');
  }, [status, searchUsers]);

  /** ¿El usuario actual es DM/co-DM de alguna campaña donde `targetId`
   *  está como jugador? Si sí, ignoramos su flag de privacidad. */
  const isMyPlayer = (targetId: string): boolean => {
    if (!user) return false;
    return campaigns.some(
      (c) =>
        c.members.some(
          (m) => m.userId === user.id && (m.role === 'dm' || m.role === 'co-dm')
        ) &&
        c.members.some((m) => m.userId === targetId && m.role === 'player')
    );
  };

  /** Prioridad para ordenar la lista "All" por relación. Menor = arriba. */
  const relationRank = (u: PublicUser): number => {
    if (!user) return 99;
    const iFollow = isFollowing(u.id, user.id);
    const followsMe = isFollowing(user.id, u.id);
    if (iFollow && followsMe) return 0;
    if (iFollow) return 1;
    if (followsMe) return 2;
    return 3;
  };

  // Resultados de búsqueda en estado: searchUsers ahora es async y pega
  // al backend. Debounce 300ms para no saturar la API mientras se escribe.
  const [searchResults, setSearchResults] = useState<PublicUser[] | null>(null);
  useEffect(() => {
    if (!query.trim()) {
      setSearchResults(null);
      return;
    }
    let cancelled = false;
    const timer = setTimeout(() => {
      void searchUsers(query).then((r) => {
        if (!cancelled) setSearchResults(r);
      });
    }, 300);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [query, searchUsers]);

  const visible = useMemo(() => {
    const base =
      tab === 'following' && user
        ? getFollowing(user.id)
        : tab === 'followers' && user
          ? getFollowers(user.id)
          : users;
    const source = query && searchResults ? searchResults : base;

    const visibleUsers = source.filter((u) => {
      if (u.id === user?.id) return false;
      if (u.isPrivate && !isMyPlayer(u.id)) return false;
      return true;
    });

    if (tab === 'all' && !query) {
      return [...visibleUsers].sort((a, b) => {
        const diff = relationRank(a) - relationRank(b);
        if (diff !== 0) return diff;
        return a.username.localeCompare(b.username);
      });
    }
    return visibleUsers;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, query, searchResults, user, users, campaigns, getFollowing, getFollowers, isFollowing]);

  return (
    <section className="users-page" aria-labelledby="users-heading">
      <h1 id="users-heading" className="users-page__title">
        {t('users.title')}
      </h1>

      <div className="users-page__tabs" role="tablist">
        {(['all', 'following', 'followers'] as Tab[]).map((key) => (
          <button
            key={key}
            role="tab"
            aria-selected={tab === key}
            className={
              'users-page__tab' + (tab === key ? ' users-page__tab--active' : '')
            }
            onClick={() => setTab(key)}
          >
            {t(`users.tab.${key}`)}
          </button>
        ))}
      </div>

      <input
        type="search"
        className="users-page__search"
        placeholder={t('users.searchPlaceholder')}
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        aria-label={t('common.search')}
      />

      {visible.length === 0 ? (
        <p className="users-page__empty">{t('users.empty')}</p>
      ) : (
        <div className="users-page__scroll">
          <ul className="users-page__list">
            {visible.map((u) => (
              <li key={u.id} className="users-page__item">
                <Link
                  to={`/profile/${u.id}`}
                  className="users-page__link"
                  aria-label={u.username}
                >
                  <Profile name={u.username} image={u.avatar} />
                  <span className="users-page__name">{u.username}</span>
                </Link>
                <FollowButton userId={u.id} />
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}

export default UsersPage;
