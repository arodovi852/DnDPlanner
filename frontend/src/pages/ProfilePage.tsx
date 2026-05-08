import { useMemo, useRef, useState, type ChangeEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Profile } from '../components/shared/Profile';
import { TranslucidTextBox } from '../components/shared/TranslucidTextBox';
import { CampaignCard } from '../components/shared/CampaignCard';
import { ConfirmModal } from '../components/shared/ConfirmModal';
import { useAuth } from '../context/AuthContext';
import { useCampaigns, type Campaign } from '../context/CampaignContext';

import destinosCruzados from '../assets/campaigns/destinos-cruzados.png';
import destinosCruzadosHover from '../assets/campaigns/destinos-cruzados-hover.png';
import campollano from '../assets/campaigns/campollano.png';
import campollanoHover from '../assets/campaigns/campollano-hover.png';
import guerra from '../assets/campaigns/guerra.png';
import guerraHover from '../assets/campaigns/guerra-hover.png';
import resacon from '../assets/campaigns/resacon.png';
import resaconHover from '../assets/campaigns/resacon-hover.png';

const TEMPLATE_IMAGES: Record<string, { image: string; hoverImage: string }> = {
  'destinos-cruzados': { image: destinosCruzados, hoverImage: destinosCruzadosHover },
  campollano: { image: campollano, hoverImage: campollanoHover },
  guerra: { image: guerra, hoverImage: guerraHover },
  resacon: { image: resacon, hoverImage: resaconHover },
};

const DEFAULT_DESCRIPTION =
  'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Cras eleifend bibendum eleifend. Mauris ut felis dui. Nam mattis sed urna et ullamcorper.';

const MAX_VISIBLE = 8;

type CampaignTab = 'all' | 'dm' | 'player';

interface CampaignImages {
  image: string;
  hoverImage: string;
}

function imagesForCampaign(campaign: Campaign): CampaignImages {
  if (campaign.image) {
    return { image: campaign.image, hoverImage: campaign.image };
  }
  return (
    TEMPLATE_IMAGES[campaign.templateId ?? ''] ?? {
      image: destinosCruzados,
      hoverImage: destinosCruzadosHover,
    }
  );
}

/**
 * Página /profile.
 *
 * Mejoras incluidas:
 *   - El botón ✏︎ alterna modo de edición que permite cambiar el nombre
 *     y la descripción del usuario, además de gestionar campañas:
 *       · cambiar imagen (icono ⤴ en cada tarjeta)
 *       · reordenar (◀ ▶)
 *       · eliminar con popup de confirmación
 *   - Tabs "Todas / Como DM / Como jugador" para distinguir el rol del
 *     usuario en cada campaña.
 */
export function ProfilePage() {
  const { t } = useTranslation();
  const { user, updateUser, logout } = useAuth();
  const {
    campaigns,
    setActiveCampaign,
    updateCampaign,
    deleteCampaign,
    reorderCampaigns,
    getRole,
  } = useCampaigns();
  const navigate = useNavigate();

  const [editing, setEditing] = useState(false);
  const [tab, setTab] = useState<CampaignTab>('all');
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  /** Cuando no es null, hay una confirmación abierta para alternar
   *  visibilidad público↔privado de la campaña con ese id. */
  const [togglingVisibilityId, setTogglingVisibilityId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const targetCampaignRef = useRef<string | null>(null);

  const displayName = user?.username ?? 'User';
  const description = user?.description ?? DEFAULT_DESCRIPTION;

  // Solo las campañas donde el usuario es miembro (dueño o en members[]).
  const myCampaigns = useMemo(() => {
    if (!user) return [];
    return campaigns.filter(
      (c) => c.ownerId === user.id || c.members.some((m) => m.userId === user.id)
    );
  }, [campaigns, user]);

  // Filtrado adicional por pestaña de rol.
  const filteredCampaigns = useMemo(() => {
    if (tab === 'all') return myCampaigns;
    return myCampaigns.filter((c) => {
      const role = user ? getRole(c.id, user.id) : null;
      if (tab === 'dm') return role === 'dm' || role === 'co-dm';
      return role === 'player';
    });
  }, [myCampaigns, tab, user, getRole]);

  const visibleCampaigns = filteredCampaigns.slice(0, MAX_VISIBLE);
  const hasMore = filteredCampaigns.length > MAX_VISIBLE;

  // ------------------------------------------------------------------
  // Handlers
  // ------------------------------------------------------------------

  const openCampaign = (id: string) => {
    if (editing) return; // En modo edición la card no navega.
    setActiveCampaign(id);
    navigate('/chapterOrCharacter');
  };

  const moveCampaign = (id: string, direction: -1 | 1) => {
    const ids = myCampaigns.map((c) => c.id);
    const index = ids.indexOf(id);
    const target = index + direction;
    if (index === -1 || target < 0 || target >= ids.length) return;
    [ids[index], ids[target]] = [ids[target], ids[index]];
    reorderCampaigns(ids);
  };

  const triggerImagePicker = (campaignId: string) => {
    targetCampaignRef.current = campaignId;
    fileInputRef.current?.click();
  };

  const handleImagePicked = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    const targetId = targetCampaignRef.current;
    targetCampaignRef.current = null;
    if (!file || !targetId) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        updateCampaign(targetId, { image: reader.result });
      }
    };
    reader.readAsDataURL(file);
  };

  const handleDelete = (id: string) => {
    deleteCampaign(id);
    setConfirmingId(null);
  };

  const handleAvatarPicked = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        updateUser({ avatar: reader.result });
      }
    };
    reader.readAsDataURL(file);
  };

  const handleLogout = () => {
    logout();
    navigate('/main');
  };

  const toggleVisibility = (campaign: Campaign) => {
    updateCampaign(campaign.id, {
      visibility: campaign.visibility === 'public' ? 'private' : 'public',
    });
  };

  return (
    <section className="profile-page" aria-labelledby="profile-heading">
      <h1 id="profile-heading" className="visually-hidden">
        {t('header.profile')} · {displayName}
      </h1>

      {user && (
        <div className="profile-page__bar">
          <button
            type="button"
            className="profile-page__logout"
            onClick={handleLogout}
            aria-label={t('profile.logout')}
            title={t('profile.logout')}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              width="1.1rem"
              height="1.1rem"
              fill="currentColor"
              aria-hidden="true"
            >
              <path d="M16 13v-2H7V8l-5 4 5 4v-3h9zm3-10H10c-1.1 0-2 .9-2 2v4h2V5h9v14h-9v-4H8v4c0 1.1.9 2 2 2h9c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2z" />
            </svg>
            <span>{t('profile.logout')}</span>
          </button>
        </div>
      )}

      <div className="profile-page__top">
        <div className="profile-page__identity">
          <div className="profile-page__avatar">
            <Profile
              name={displayName}
              image={user?.avatar}
              active
              onSelect={editing ? () => avatarInputRef.current?.click() : undefined}
            />
            {editing && (
              <button
                type="button"
                className="profile-page__avatar-edit"
                onClick={() => avatarInputRef.current?.click()}
                aria-label={t('profile.changeAvatar')}
                title={t('profile.changeAvatar')}
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  width="1.1rem"
                  height="1.1rem"
                  fill="currentColor"
                  aria-hidden="true"
                >
                  <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04a1 1 0 0 0 0-1.41l-2.34-2.34a1 1 0 0 0-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z" />
                </svg>
              </button>
            )}
          </div>
          <div className="profile-page__name-row">
            {editing ? (
              <input
                className="profile-page__name-input"
                value={displayName}
                onChange={(e) => updateUser({ username: e.target.value })}
                aria-label={t('profile.namePlaceholder')}
              />
            ) : (
              <span className="profile-page__name">{displayName}</span>
            )}
            <button
              type="button"
              className="profile-page__edit"
              aria-label={editing ? t('profile.finishEdit') : t('profile.editProfile')}
              aria-pressed={editing}
              onClick={() => setEditing((prev) => !prev)}
              title={editing ? t('profile.finishEdit') : t('profile.editProfile')}
            >
              {editing ? (
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  width="1.25rem"
                  height="1.25rem"
                  fill="currentColor"
                  aria-hidden="true"
                >
                  <path d="M9 16.17 4.83 12l-1.41 1.41L9 19l12-12-1.41-1.41z" />
                </svg>
              ) : (
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  width="1.25rem"
                  height="1.25rem"
                  fill="currentColor"
                  aria-hidden="true"
                >
                  <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04a1 1 0 0 0 0-1.41l-2.34-2.34a1 1 0 0 0-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z" />
                </svg>
              )}
            </button>
          </div>

          {editing && user && (
            <label className="profile-page__privacy">
              <input
                type="checkbox"
                checked={!!user.isPrivate}
                onChange={(e) => updateUser({ isPrivate: e.target.checked })}
              />
              <span>{t('profile.privateAccount')}</span>
              <span className="profile-page__privacy-hint">
                {t('profile.privateAccountHint')}
              </span>
            </label>
          )}
        </div>

        <div className="profile-page__description">
          {editing ? (
            <textarea
              className="profile-page__description-input"
              value={description}
              onChange={(e) => updateUser({ description: e.target.value })}
              rows={4}
              aria-label={t('profile.descriptionPlaceholder')}
            />
          ) : (
            <TranslucidTextBox className="translucid-text-box--dark translucid-text-box--tall">
              {description}
            </TranslucidTextBox>
          )}
        </div>
      </div>

      <section className="profile-page__campaigns" aria-labelledby="campaigns-heading">
        <div className="profile-page__section-header">
          <h2 id="campaigns-heading" className="profile-page__section-title">
            {t('profile.campaigns')}
          </h2>
          <div className="profile-page__campaigns-controls">
            <div className="profile-page__campaigns-tabs" role="tablist">
              {(['all', 'dm', 'player'] as const).map((key) => (
                <button
                  key={key}
                  type="button"
                  role="tab"
                  aria-selected={tab === key}
                  className={
                    tab === key
                      ? 'profile-page__campaigns-tab profile-page__campaigns-tab--active'
                      : 'profile-page__campaigns-tab'
                  }
                  onClick={() => setTab(key)}
                >
                  {t(`profile.tab.${key}`)}
                </button>
              ))}
            </div>
            {hasMore && (
              <Link to="/campaigns" className="profile-page__see-more">
                {t('common.seeMore')}
              </Link>
            )}
          </div>
        </div>

        <div className="profile-page__grid">
          {visibleCampaigns.length === 0 ? (
            <p className="profile-page__empty">—</p>
          ) : (
            visibleCampaigns.map((campaign, index) => {
              const images = imagesForCampaign(campaign);
              const role = user ? getRole(campaign.id, user.id) : null;
              const globalIndex = myCampaigns.findIndex(
                (c) => c.id === campaign.id
              );
              const canMoveUp = globalIndex > 0;
              const canMoveDown =
                globalIndex !== -1 && globalIndex < myCampaigns.length - 1;
              return (
                <div className="profile-page__card-wrapper" key={campaign.id}>
                  <CampaignCard
                    name={campaign.name}
                    image={images.image}
                    hoverImage={images.hoverImage}
                    onSelect={() => openCampaign(campaign.id)}
                  />
                  {role && (
                    <span
                      className={
                        'profile-page__card-role profile-page__card-role--' +
                        role.replace('-', '')
                      }
                    >
                      {t(`members.role${role === 'co-dm' ? 'CoDm' : role === 'dm' ? 'Dm' : 'Player'}`)}
                    </span>
                  )}
                  {(role === 'dm' || role === 'co-dm') && (
                    <button
                      type="button"
                      className={
                        'profile-page__card-visibility-toggle' +
                        (campaign.visibility === 'public'
                          ? ' profile-page__card-visibility-toggle--public'
                          : '')
                      }
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setTogglingVisibilityId(campaign.id);
                      }}
                      aria-pressed={campaign.visibility === 'public'}
                      aria-label={
                        campaign.visibility === 'public'
                          ? t('profile.makePrivate')
                          : t('profile.makePublic')
                      }
                      title={
                        campaign.visibility === 'public'
                          ? t('profile.public')
                          : t('profile.private')
                      }
                    >
                      {campaign.visibility === 'public' ? '🌐' : '🔒'}
                    </button>
                  )}
                  {editing ? (
                    <input
                      className="profile-page__card-name-input"
                      value={campaign.name}
                      onChange={(e) =>
                        updateCampaign(campaign.id, { name: e.target.value })
                      }
                      aria-label={t('profile.renameCampaign')}
                    />
                  ) : (
                    <span className="profile-page__card-name">
                      {campaign.name}
                    </span>
                  )}
                  {editing && (
                    <div className="profile-page__card-actions">
                      <button
                        type="button"
                        className="profile-page__card-action"
                        onClick={() => moveCampaign(campaign.id, -1)}
                        disabled={!canMoveUp}
                        aria-label={t('profile.moveUp')}
                        title={t('profile.moveUp')}
                      >
                        ◀
                      </button>
                      <button
                        type="button"
                        className="profile-page__card-action"
                        onClick={() => moveCampaign(campaign.id, 1)}
                        disabled={!canMoveDown}
                        aria-label={t('profile.moveDown')}
                        title={t('profile.moveDown')}
                      >
                        ▶
                      </button>
                      <button
                        type="button"
                        className="profile-page__card-action"
                        onClick={() => triggerImagePicker(campaign.id)}
                        aria-label={t('profile.changeImage')}
                        title={t('profile.changeImage')}
                      >
                        ⤴
                      </button>
                      <button
                        type="button"
                        className="profile-page__card-action profile-page__card-action--danger"
                        onClick={() => setConfirmingId(campaign.id)}
                        aria-label={t('common.delete')}
                        title={t('common.delete')}
                      >
                        ×
                      </button>
                    </div>
                  )}
                  {/* Para asegurar que la card no se navega cuando solo
                      queremos pulsar un botón en modo edición, una capa
                      transparente bloquea el click en la card. */}
                  {editing && (
                    <div
                      className="profile-page__card-block"
                      aria-hidden="true"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                      }}
                    />
                  )}
                  {/* Index visible cuando edita (depuración del orden). */}
                  {editing && (
                    <span
                      className="profile-page__card-index"
                      aria-hidden="true"
                    >
                      #{index + 1}
                    </span>
                  )}
                </div>
              );
            })
          )}
        </div>
      </section>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        style={{ display: 'none' }}
        onChange={handleImagePicked}
      />
      <input
        ref={avatarInputRef}
        type="file"
        accept="image/*"
        style={{ display: 'none' }}
        onChange={handleAvatarPicked}
      />

      <ConfirmModal
        open={confirmingId !== null}
        title={t('profile.confirmDeleteTitle')}
        description={
          confirmingId
            ? t('profile.confirmDeleteDescription', {
                name:
                  myCampaigns.find((c) => c.id === confirmingId)?.name ?? '',
              })
            : ''
        }
        confirmLabel={t('common.delete')}
        cancelLabel={t('common.cancel')}
        onConfirm={() => confirmingId && handleDelete(confirmingId)}
        onClose={() => setConfirmingId(null)}
      />

      {(() => {
        const target = togglingVisibilityId
          ? myCampaigns.find((c) => c.id === togglingVisibilityId) ?? null
          : null;
        const willBePublic = target?.visibility !== 'public';
        return (
          <ConfirmModal
            open={togglingVisibilityId !== null}
            title={
              willBePublic
                ? t('profile.confirmMakePublicTitle')
                : t('profile.confirmMakePrivateTitle')
            }
            description={
              target
                ? t(
                    willBePublic
                      ? 'profile.confirmMakePublicDescription'
                      : 'profile.confirmMakePrivateDescription',
                    { name: target.name }
                  )
                : ''
            }
            confirmLabel={t('common.confirm')}
            cancelLabel={t('common.cancel')}
            onConfirm={() => {
              if (target) toggleVisibility(target);
              setTogglingVisibilityId(null);
            }}
            onClose={() => setTogglingVisibilityId(null)}
          />
        );
      })()}
    </section>
  );
}

export default ProfilePage;
