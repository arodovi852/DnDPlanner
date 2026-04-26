import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Profile } from '../components/shared/Profile';
import { FollowButton } from '../components/shared/FollowButton';
import { useAuth } from '../context/AuthContext';
import { useUsers } from '../context/UsersContext';

/**
 * /users — directorio de usuarios con búsqueda + acciones sociales.
 *
 * Filtros:
 *   · Todos / A los que sigo / Seguidores
 *   · Campo de búsqueda por nombre.
 */
type Tab = 'all' | 'following' | 'followers';

export function UsersPage() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { users, searchUsers, getFollowing, getFollowers } = useUsers();

  const [tab, setTab] = useState<Tab>('all');
  const [query, setQuery] = useState('');

  const visible = useMemo(() => {
    const base =
      tab === 'following' && user
        ? getFollowing(user.id)
        : tab === 'followers' && user
          ? getFollowers(user.id)
          : users;
    const filtered = query ? searchUsers(query) : base;
    // Cuando hay query, filtramos el universo global; si no, respetamos el tab.
    const source = query ? filtered : base;
    return source.filter((u) => u.id !== user?.id);
  }, [tab, query, user, users, searchUsers, getFollowing, getFollowers]);

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
        <ul className="users-page__list">
          {visible.map((u) => (
            <li key={u.id} className="users-page__item">
              <Profile name={u.username} />
              <span className="users-page__name">{u.username}</span>
              <FollowButton userId={u.id} />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

export default UsersPage;
