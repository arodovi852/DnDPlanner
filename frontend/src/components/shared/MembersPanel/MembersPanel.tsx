import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '../Button';
import { FollowButton } from '../FollowButton';
import {
  useCampaigns,
  type Campaign,
  type MemberRole,
} from '../../../context/CampaignContext';
import { useAuth } from '../../../context/AuthContext';
import { useUsers, type PublicUser } from '../../../context/UsersContext';

export interface MembersPanelProps {
  open: boolean;
  campaignId: string;
  onClose: () => void;
}

/**
 * Modal de gestión de miembros de una campaña.
 *
 * Secciones:
 *   1. Lista de miembros actuales con su rol y personaje asignado.
 *      Sólo el DM (owner) puede cambiar roles, asignar personajes y expulsar.
 *   2. Añadir miembro buscando por nombre de usuario → alta inmediata.
 *   3. Enlace de invitación (share token) con acción copiar y revocar.
 *
 * Los jugadores añadidos con rol "player" podrán dejar anotaciones en
 * las páginas de la campaña y modificar el personaje que tengan asignado.
 */
export function MembersPanel({ open, campaignId, onClose }: MembersPanelProps) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { campaigns, addMember, removeMember, updateMemberRole, assignCharacter,
    generateShareToken, revokeShareToken, generateViewToken, revokeViewToken } = useCampaigns();
  const { users, searchUsers, findByUsername } = useUsers();

  const campaign = useMemo(
    () => campaigns.find((c) => c.id === campaignId) ?? null,
    [campaigns, campaignId]
  );

  const [query, setQuery] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [copyState, setCopyState] = useState<'idle' | 'copied'>('idle');
  const [viewCopyState, setViewCopyState] = useState<'idle' | 'copied'>('idle');

  useEffect(() => {
    if (!open) return;
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [open, onClose]);

  useEffect(() => {
    if (open) {
      setQuery('');
      setError(null);
      setCopyState('idle');
      setViewCopyState('idle');
    }
  }, [open]);

  if (!open || !campaign) return null;

  const isOwner = user?.id === campaign.ownerId;
  const currentMemberRole =
    user && campaign.members.find((m) => m.userId === user.id)?.role;
  const canManage = isOwner || currentMemberRole === 'co-dm';

  const memberIds = useMemo(
    () => new Set(campaign.members.map((m) => m.userId)),
    [campaign.members]
  );
  // El DM ya gestiona la campaña, así que ya tiene acceso a sus jugadores
  // (incluso a los privados): los privados solo se ocultan de búsquedas
  // generales, no de "añadir miembro" cuando ya forman parte de OTRA
  // campaña del mismo DM. Para invitar a un privado totalmente externo,
  // habría que conocer su nombre exacto: lo respetamos.
  const isAlreadyMyPlayer = (u: PublicUser): boolean => {
    if (!user) return false;
    return campaigns.some(
      (c) =>
        c.members.some(
          (m) => m.userId === user.id && (m.role === 'dm' || m.role === 'co-dm')
        ) &&
        c.members.some((m) => m.userId === u.id && m.role === 'player')
    );
  };

  // searchUsers ahora pega al backend; lo lanzamos cuando cambia query
  // (debounced con un pequeño retardo para no saturar la API mientras se
  // escribe). El array final filtra los que ya son miembros y los privados
  // que no son nuestros jugadores.
  const [suggestions, setSuggestions] = useState<PublicUser[]>([]);
  useEffect(() => {
    let cancelled = false;
    if (!query.trim()) {
      setSuggestions([]);
      return;
    }
    const timer = setTimeout(() => {
      void searchUsers(query).then((results) => {
        if (cancelled) return;
        setSuggestions(
          results
            .filter((u) => !memberIds.has(u.id))
            .filter((u) => !u.isPrivate || isAlreadyMyPlayer(u))
            .slice(0, 5)
        );
      });
    }, 250);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, memberIds, campaigns, user?.id]);

  const handleAddByUsername = (username: string) => {
    const found = findByUsername(username);
    if (!found) {
      setError(t('members.notFound'));
      return;
    }
    if (memberIds.has(found.id)) {
      setError(t('members.alreadyMember'));
      return;
    }
    if (found.isPrivate && !isAlreadyMyPlayer(found)) {
      // Los perfiles privados solo entran por enlace de invitación.
      setError(t('members.notFound'));
      return;
    }
    addMember(campaign.id, { userId: found.id, role: 'player' });
    setQuery('');
    setError(null);
  };

  const handleAddSuggestion = (u: PublicUser) => {
    addMember(campaign.id, { userId: u.id, role: 'player' });
    setQuery('');
    setError(null);
  };

  const handleRoleChange = (userId: string, role: MemberRole) => {
    updateMemberRole(campaign.id, userId, role);
  };

  const handleAssignCharacter = (userId: string, characterId: string) => {
    assignCharacter(campaign.id, userId, characterId || null);
  };

  const handleGenerateLink = () => {
    generateShareToken(campaign.id);
    setCopyState('idle');
  };

  const handleGenerateViewLink = () => {
    generateViewToken(campaign.id);
    setViewCopyState('idle');
  };

  const handleCopyViewLink = async () => {
    if (!campaign.viewToken) return;
    const url = buildViewUrl(campaign.viewToken);
    try {
      await navigator.clipboard.writeText(url);
      setViewCopyState('copied');
      window.setTimeout(() => setViewCopyState('idle'), 2000);
    } catch {
      const input = document.getElementById(
        'members-panel-view-url'
      ) as HTMLInputElement | null;
      input?.select();
    }
  };

  const handleCopyLink = async () => {
    if (!campaign.shareToken) return;
    const url = buildInviteUrl(campaign.shareToken);
    try {
      await navigator.clipboard.writeText(url);
      setCopyState('copied');
      window.setTimeout(() => setCopyState('idle'), 2000);
    } catch {
      // Fallback silencioso: al menos selecciona el input.
      const input = document.getElementById(
        'members-panel-invite-url'
      ) as HTMLInputElement | null;
      input?.select();
    }
  };

  return (
    <div
      className="auth-modal-backdrop"
      role="presentation"
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        className="auth-modal members-panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby="members-panel-title"
      >
        <button
          type="button"
          className="auth-modal__close"
          aria-label={t('common.close')}
          onClick={onClose}
        >
          ×
        </button>

        <h2 id="members-panel-title" className="auth-modal__title">
          {t('members.title')}
        </h2>

        <section className="members-panel__section">
          <h3 className="members-panel__section-title">
            {t('members.currentMembers')}
          </h3>

          <ul className="members-panel__list">
            {campaign.members.map((m) => {
              const userInfo = users.find((u) => u.id === m.userId);
              const displayName = userInfo?.username ?? m.userId;
              const isSelf = user?.id === m.userId;
              const isCampaignOwner = m.userId === campaign.ownerId;
              return (
                <li key={m.userId} className="members-panel__row">
                  <div className="members-panel__info">
                    <span className="members-panel__name">
                      {displayName}
                      {isSelf && <> · <em>{t('members.you')}</em></>}
                    </span>
                    {!isSelf && userInfo && (
                      <FollowButton userId={m.userId} />
                    )}
                  </div>

                  <RoleSelect
                    value={m.role}
                    disabled={!canManage || isCampaignOwner}
                    onChange={(role) => handleRoleChange(m.userId, role)}
                    t={t}
                  />

                  {m.role === 'player' && (
                    <CharacterSelect
                      campaign={campaign}
                      value={m.characterId ?? ''}
                      disabled={!canManage && !isSelf}
                      onChange={(cid) => handleAssignCharacter(m.userId, cid)}
                      t={t}
                    />
                  )}

                  {canManage && !isCampaignOwner && (
                    <button
                      type="button"
                      className="members-panel__remove"
                      onClick={() => removeMember(campaign.id, m.userId)}
                      aria-label={t('members.remove')}
                    >
                      ×
                    </button>
                  )}
                </li>
              );
            })}
          </ul>
        </section>

        {canManage && (
          <section className="members-panel__section">
            <h3 className="members-panel__section-title">
              {t('members.addMember')}
            </h3>

            <div className="members-panel__add">
              <input
                className="auth-modal__field"
                placeholder={t('members.searchPlaceholder')}
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setError(null);
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddByUsername(query);
                  }
                }}
              />
              <Button
                size="small"
                onClick={() => handleAddByUsername(query)}
              >
                {t('common.add')}
              </Button>
            </div>

            {error && (
              <p role="alert" className="members-panel__error">
                {error}
              </p>
            )}

            {suggestions.length > 0 && (
              <ul className="members-panel__suggestions">
                {suggestions.map((u) => (
                  <li key={u.id}>
                    <button
                      type="button"
                      className="members-panel__suggestion"
                      onClick={() => handleAddSuggestion(u)}
                    >
                      {u.username}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </section>
        )}

        {canManage && (
          <section className="members-panel__section members-panel__section--links">
            <div className="members-panel__links">
              <div className="members-panel__link-block">
                <h3 className="members-panel__section-title">
                  {t('members.inviteLink')}
                </h3>

                {campaign.shareToken ? (
                  <>
                    <div className="members-panel__link-row">
                      <input
                        id="members-panel-invite-url"
                        className="auth-modal__field"
                        readOnly
                        value={buildInviteUrl(campaign.shareToken)}
                        onFocus={(e) => e.currentTarget.select()}
                      />
                      <Button size="small" onClick={handleCopyLink}>
                        {copyState === 'copied'
                          ? t('members.copied')
                          : t('members.copy')}
                      </Button>
                      <button
                        type="button"
                        className="members-panel__revoke"
                        onClick={() => revokeShareToken(campaign.id)}
                      >
                        {t('members.revoke')}
                      </button>
                    </div>

                    <ShareButtons
                      url={buildInviteUrl(campaign.shareToken)}
                      title={campaign.name}
                      t={t}
                    />
                  </>
                ) : (
                  <Button size="small" onClick={handleGenerateLink}>
                    {t('members.generateLink')}
                  </Button>
                )}

                <p className="members-panel__hint">{t('members.inviteHint')}</p>
              </div>

              <div className="members-panel__link-block">
                <h3 className="members-panel__section-title">
                  {t('members.viewLink')}
                </h3>

                {campaign.viewToken ? (
                  <div className="members-panel__link-row">
                    <input
                      id="members-panel-view-url"
                      className="auth-modal__field"
                      readOnly
                      value={buildViewUrl(campaign.viewToken)}
                      onFocus={(e) => e.currentTarget.select()}
                    />
                    <Button size="small" onClick={handleCopyViewLink}>
                      {viewCopyState === 'copied'
                        ? t('members.copied')
                        : t('members.copy')}
                    </Button>
                    <button
                      type="button"
                      className="members-panel__revoke"
                      onClick={() => revokeViewToken(campaign.id)}
                    >
                      {t('members.revoke')}
                    </button>
                  </div>
                ) : (
                  <Button size="small" onClick={handleGenerateViewLink}>
                    {t('members.generateViewLink')}
                  </Button>
                )}

                <p className="members-panel__hint">{t('members.viewLinkHint')}</p>
              </div>
            </div>
          </section>
        )}
      </div>
    </div>
  );
}

function buildInviteUrl(token: string): string {
  if (typeof window === 'undefined') return `/invite/${token}`;
  return `${window.location.origin}/invite/${token}`;
}

function buildViewUrl(token: string): string {
  if (typeof window === 'undefined') return `/view/${token}`;
  return `${window.location.origin}/view/${token}`;
}

/**
 * Botones de compartir a redes: WhatsApp, X/Twitter, email.
 * Todos abren el share sheet nativo de cada servicio mediante deep-link.
 */
function ShareButtons({
  url,
  title,
  t,
}: {
  url: string;
  title: string;
  t: (k: string, opts?: Record<string, unknown>) => string;
}) {
  const text = t('members.shareText', { name: title });
  const encodedUrl = encodeURIComponent(url);
  const encodedText = encodeURIComponent(text);

  const shares: Array<{ key: string; href: string; label: string }> = [
    {
      key: 'whatsapp',
      href: `https://wa.me/?text=${encodedText}%20${encodedUrl}`,
      label: 'WhatsApp',
    },
    {
      key: 'x',
      href: `https://twitter.com/intent/tweet?text=${encodedText}&url=${encodedUrl}`,
      label: 'X',
    },
    {
      key: 'telegram',
      href: `https://t.me/share/url?url=${encodedUrl}&text=${encodedText}`,
      label: 'Telegram',
    },
    {
      key: 'email',
      href: `mailto:?subject=${encodeURIComponent(title)}&body=${encodedText}%20${encodedUrl}`,
      label: 'Email',
    },
  ];

  return (
    <div className="members-panel__share-row" aria-label={t('members.shareOn')}>
      <span className="members-panel__share-label">{t('members.shareOn')}</span>
      {shares.map((s) => (
        <a
          key={s.key}
          className="members-panel__share"
          href={s.href}
          target="_blank"
          rel="noopener noreferrer"
        >
          {s.label}
        </a>
      ))}
    </div>
  );
}

function RoleSelect({
  value,
  disabled,
  onChange,
  t,
}: {
  value: MemberRole;
  disabled: boolean;
  onChange: (role: MemberRole) => void;
  t: (k: string) => string;
}) {
  return (
    <select
      className="members-panel__role"
      value={value}
      disabled={disabled}
      onChange={(e) => onChange(e.target.value as MemberRole)}
      aria-label={t('members.role')}
    >
      <option value="dm">{t('members.roleDm')}</option>
      <option value="co-dm">{t('members.roleCoDm')}</option>
      <option value="player">{t('members.rolePlayer')}</option>
    </select>
  );
}

function CharacterSelect({
  campaign,
  value,
  disabled,
  onChange,
  t,
}: {
  campaign: Campaign;
  value: string;
  disabled: boolean;
  onChange: (characterId: string) => void;
  t: (k: string) => string;
}) {
  const playable = campaign.characters.filter((ch) => ch.kind === 'playable');
  return (
    <select
      className="members-panel__character"
      value={value}
      disabled={disabled}
      onChange={(e) => onChange(e.target.value)}
      aria-label={t('members.assignCharacter')}
    >
      <option value="">{t('members.noCharacter')}</option>
      {playable.map((ch) => (
        <option key={ch.id} value={ch.id}>
          {ch.name || t('common.untitled')}
        </option>
      ))}
    </select>
  );
}

export default MembersPanel;
